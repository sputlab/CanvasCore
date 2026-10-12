<?php
// canvascore-admin/media.php
// Image optimization and the media library's metadata.
//  - Smaller WebP copies of every uploaded photo (480 / 960 / 1600 px wide, never larger than the original),
//    in uploads/_cc/, made with GD on upload or with "Optimize existing images". Phone photos are turned
//    the right way up (EXIF orientation). The original file is never changed.
//  - Metadata per file in the data dir (media.json): alt text, size in pixels and bytes, available copies.
//  - On publish, cc_optimize_images() gives every uploaded <img> of a page a srcset of those copies
//    (phones download a small file), lazy loading and async decoding (except the first image, likely on screen).
require_once __DIR__ . '/config.php';

const CC_IMG_WIDTHS = [480, 960, 1600];
const CC_IMG_VARIANT_DIR = '_cc';

function cc_media_meta_file() { return $GLOBALS['CC_MEDIA_META_FILE'] ?? (cc_data_dir() . '/media.json'); }   // overridable for tests
function cc_media_meta_all() {
    $m = @json_decode((string)@file_get_contents(cc_media_meta_file()), true);
    return is_array($m) ? $m : [];
}
// Changes the metadata under a lock: $fn receives the whole array (by reference)
function cc_media_meta_update($fn) {
    $fh = @fopen(cc_media_meta_file(), 'c+');
    if (!$fh) return false;
    flock($fh, LOCK_EX);
    $all = json_decode(stream_get_contents($fh) ?: '{}', true);
    if (!is_array($all)) $all = [];
    $fn($all);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($all, JSON_UNESCAPED_UNICODE));
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return true;
}

function cc_variant_name($name, $w) { return pathinfo($name, PATHINFO_FILENAME) . '-' . (int)$w . '.webp'; }

// Loads an image with GD, upright. null when the format or the memory don't allow it.
function cc_img_load($path, $ext) {
    if (!function_exists('imagecreatetruecolor')) return null;
    $info = @getimagesize($path);
    if (!$info) return null;
    // ~5 bytes per pixel while resampling: skip images the memory limit can't hold
    $limit = cc_php_bytes(ini_get('memory_limit'));
    if ($limit > 0 && $info[0] * $info[1] * 5 > $limit - memory_get_usage() - 8 * 1024 * 1024) return null;
    switch ($ext) {
        case 'jpg': case 'jpeg': $im = function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($path) : null; break;
        case 'png': $im = function_exists('imagecreatefrompng') ? @imagecreatefrompng($path) : null; break;
        case 'webp': $im = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : null; break;
        default: $im = null;
    }
    if (!$im) return null;
    if (($ext === 'jpg' || $ext === 'jpeg') && function_exists('exif_read_data')) {
        $exif = @exif_read_data($path);
        $o = (int)($exif['Orientation'] ?? 1);
        $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($rot) { $r = imagerotate($im, $rot, 0); if ($r) { $im = $r; } }
    }
    return $im;
}
function cc_php_bytes($v) {
    $v = trim((string)$v);
    if ($v === '' || $v === '-1') return -1;
    $n = (int)$v; $u = strtolower(substr($v, -1));
    return $u === 'g' ? $n * 1073741824 : ($u === 'm' ? $n * 1048576 : ($u === 'k' ? $n * 1024 : $n));
}

// Makes the copies of one uploaded file and records its metadata. Returns the metadata.
function cc_media_process($uploads_dir, $name) {
    $path = $uploads_dir . '/' . $name;
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $meta = ['bytes' => @filesize($path) ?: 0, 'variants' => []];
    $info = @getimagesize($path);
    if ($info) { $meta['w'] = (int)$info[0]; $meta['h'] = (int)$info[1]; }
    $canWebp = function_exists('imagewebp');
    if ($canWebp && in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
        $im = cc_img_load($path, $ext);
        if ($im) {
            $w = imagesx($im); $h = imagesy($im);
            $meta['w'] = $w; $meta['h'] = $h;   // upright size
            $dir = $uploads_dir . '/' . CC_IMG_VARIANT_DIR;
            if (!is_dir($dir)) @mkdir($dir, 0755, true);
            foreach (CC_IMG_WIDTHS as $tw) {
                if ($tw >= $w) continue;      // never enlarge
                $th = max(1, (int)round($h * $tw / $w));
                $dst = imagecreatetruecolor($tw, $th);
                imagealphablending($dst, false); imagesavealpha($dst, true);
                imagecopyresampled($dst, $im, 0, 0, 0, 0, $tw, $th, $w, $h);
                if (@imagewebp($dst, $dir . '/' . cc_variant_name($name, $tw), 80)) $meta['variants'][] = $tw;
                unset($dst);
            }
            unset($im);
        }
    }
    $meta['optimized'] = true;   // processed (even when there was nothing to make, e.g. a small image or SVG)
    cc_media_meta_update(function (&$all) use ($name, $meta) {
        $old = is_array($all[$name] ?? null) ? $all[$name] : [];
        $all[$name] = array_merge($old, $meta);
    });
    return $meta;
}

// Deletes a file's copies and metadata
function cc_media_forget($uploads_dir, $name) {
    foreach (CC_IMG_WIDTHS as $w) @unlink($uploads_dir . '/' . CC_IMG_VARIANT_DIR . '/' . cc_variant_name($name, $w));
    cc_media_meta_update(function (&$all) use ($name) { unset($all[$name]); });
}

// Published page HTML: srcset for uploaded images that have copies, lazy loading, async decoding.
// $uploads_url = the public address of the uploads folder (e.g. "/uploads/").
function cc_optimize_images($html, $uploads_url, $meta = null) {
    if ($meta === null) $meta = cc_media_meta_all();
    $first = true;
    return preg_replace_callback('#<img\b[^>]*>#i', function ($m) use (&$first, $meta, $uploads_url) {
        $tag = $m[0];
        $isFirst = $first; $first = false;
        if (preg_match('#\ssrc="([^"]+)"#i', $tag, $sm)) {
            $src = html_entity_decode($sm[1], ENT_QUOTES);
            $pos = strpos($src, $uploads_url);
            $name = $pos !== false ? substr($src, $pos + strlen($uploads_url)) : '';
            $info = ($name !== '' && strpos($name, '/') === false) ? ($meta[$name] ?? null) : null;
            if ($info && !empty($info['variants']) && stripos($tag, 'srcset=') === false) {
                $prefix = substr($src, 0, $pos + strlen($uploads_url));
                $set = [];
                foreach ($info['variants'] as $w) $set[] = $prefix . CC_IMG_VARIANT_DIR . '/' . rawurlencode(cc_variant_name($name, $w)) . ' ' . (int)$w . 'w';
                if (!empty($info['w'])) $set[] = $prefix . rawurlencode($name) . ' ' . (int)$info['w'] . 'w';
                $tag = preg_replace('#^<img\b#i', '<img srcset="' . htmlspecialchars(implode(', ', $set)) . '" sizes="100vw"', $tag);
            }
        }
        if ($isFirst) {
            // The first image is most likely on screen right away: never lazy, fetched with priority
            $tag = preg_replace('#\sloading="lazy"#i', '', $tag);
            if (stripos($tag, 'fetchpriority=') === false) $tag = preg_replace('#^<img\b#i', '<img fetchpriority="high"', $tag);
        } elseif (stripos($tag, ' loading=') === false) {
            $tag = preg_replace('#^<img\b#i', '<img loading="lazy"', $tag);
        }
        if (stripos($tag, ' decoding=') === false) $tag = preg_replace('#^<img\b#i', '<img decoding="async"', $tag);
        return $tag;
    }, $html);
}
