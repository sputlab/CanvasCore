<?php
// tests/server.php — server-side helpers checked through the real PHP code (npm run test:server):
// code kept on editors' saves, re-linking after a slug change, client address behind a proxy,
// SVG upload check, sanitizer, numbers, slider arrows and empty-text fallbacks.
require __DIR__ . '/../../canvascore-admin/compiler.php';
$fails = 0; $total = 0;
function check($name, $ok, $extra = '') { global $fails, $total; $total++; if ($ok) echo "  ✓ $name\n"; else { $fails++; echo "  ✗ $name" . ($extra !== '' ? "  → $extra" : '') . "\n"; } }

echo "\nEDITORS' SAVES KEEP ADMIN CODE\n";
$prev = [['id' => 'h1', 'type' => 'HTML', 'content' => ['code' => '<script>admin()</script>', 'customCss' => '__THIS__{color:red}']],
         ['id' => 'f1', 'type' => 'FORM', 'content' => ['email' => 'sales@site.com']],
         ['id' => 's1', 'type' => 'SECTION', 'content' => [], 'children' => [['id' => 'h2', 'type' => 'HTML', 'content' => ['code' => '<b>nested</b>']]]]];
$sent = [['id' => 'h1', 'type' => 'HTML', 'content' => ['code' => '<script>evil()</script>', 'customCss' => 'body{display:none}']],
         ['id' => 'f1', 'type' => 'FORM', 'content' => ['email' => 'attacker@evil.com']],
         ['id' => 'new', 'type' => 'HTML', 'content' => ['code' => '<script>new()</script>']],
         ['id' => 's1', 'type' => 'SECTION', 'content' => [], 'children' => [['id' => 'h2', 'type' => 'HTML', 'content' => ['code' => 'changed']]]]];
cc_keep_code_surfaces($sent, json_encode($prev));
check('an existing Custom HTML block keeps the admin code (not wiped, not replaced)', $sent[0]['content']['code'] === '<script>admin()</script>');
check('…and its custom CSS', $sent[0]['content']['customCss'] === '__THIS__{color:red}');
check('a form keeps the receiving email set by an admin', $sent[1]['content']['email'] === 'sales@site.com');
check('code in a NEW block from an editor is not accepted', $sent[2]['content']['code'] === '');
check('nested blocks too', $sent[3]['children'][0]['content']['code'] === '<b>nested</b>');

echo "\nRE-LINKING AFTER A SLUG CHANGE\n";
$tree = [['type' => 'BUTTON', 'content' => ['url' => 'about/index.html']],
         ['type' => 'HERO', 'content' => ['buttons' => [['url' => 'about/index.html'], ['url' => 'about-us/index.html']]]],
         ['type' => 'TEXT', 'content' => ['text' => '<a href="{{BASE_URL}}about/">x</a> <a href="{{BASE_URL}}about-us/">y</a>']]];
$changed = cc_relink_node($tree, 'about/index.html', 'company/index.html', '{{BASE_URL}}about/', '{{BASE_URL}}company/');
check('button and hero links follow the new address', $changed && $tree[0]['content']['url'] === 'company/index.html' && $tree[1]['content']['buttons'][0]['url'] === 'company/index.html');
check('links typed in text follow too', strpos($tree[2]['content']['text'], '{{BASE_URL}}company/') !== false);
check('similar addresses are left alone (about-us)', $tree[1]['content']['buttons'][1]['url'] === 'about-us/index.html' && strpos($tree[2]['content']['text'], '{{BASE_URL}}about-us/') !== false);

echo "\nCLIENT ADDRESS BEHIND A PROXY\n";
$_SERVER['REMOTE_ADDR'] = '10.0.0.2'; $_SERVER['HTTP_X_FORWARDED_FOR'] = '1.2.3.4, 10.0.0.9';
check('without trusted proxies the connecting address is used', cc_client_ip([]) === '10.0.0.2');
check('from a trusted proxy, the nearest untrusted forwarded address is used', cc_client_ip(['10.0.0.2', '10.0.0.9']) === '1.2.3.4');
$_SERVER['REMOTE_ADDR'] = '5.6.7.8';
check('a client can\'t fake its address with the header', cc_client_ip(['10.0.0.2']) === '5.6.7.8');

echo "\nUPLOADS AND SANITIZER\n";
$tmp = sys_get_temp_dir() . '/cc_svg_test_' . getmypid() . '.svg';
file_put_contents($tmp, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>');
check('a plain SVG is accepted', cc_svg_is_safe($tmp));
file_put_contents($tmp, '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
check('an SVG with an event handler is refused', !cc_svg_is_safe($tmp));
@unlink($tmp);
check('javascript: hidden behind a control character is removed', strpos(cc_sanitize_html("<a href=\"\x1fjavascript:alert(1)\">x</a>"), 'javascript') === false);

echo "\nBLOCK OUTPUT\n";
check('whole numbers like parseInt', cc_int('7px', 2, 1, 12) === 7 && cc_int('abc', 2, 1, 12) === 2 && cc_int(99, 2, 1, 12) === 12);
$sl = render_block(['id' => 'sl', 'type' => 'SLIDER', 'styles' => [], 'content' => ['effect' => 'fade', 'autoplay' => false, 'images' => [['src' => 'a.jpg'], ['src' => 'b.jpg']]]]);
check('a slider with 2+ images has previous/next arrows (fade without autoplay can be browsed)', strpos($sl, 'aria-label="Previous slide"') !== false && strpos($sl, 'aria-label="Next slide"') !== false);
check('…and its script respects reduced motion', strpos($sl, 'prefers-reduced-motion') !== false);
$one = render_block(['id' => 'sl1', 'type' => 'SLIDER', 'styles' => [], 'content' => ['images' => [['src' => 'a.jpg']]]]);
check('one image: no arrows', strpos($one, 'cc-slider-prev') === false);
$f = render_block(['id' => 'f', 'type' => 'FORM', 'styles' => [], 'content' => ['btnText' => '', 'successMsg' => '', 'fields' => [['label' => 'Phone', 'type' => 'tel']]]]);
check('an emptied button text falls back to "Send Message", the message to "Sent!"', strpos($f, '>Send Message</button>') !== false && strpos($f, 'value="Sent!"') !== false);
check('phone fields are real tel inputs', strpos($f, 'type="tel"') !== false);

echo "\nREVISION HISTORY\n";
$_SESSION['username'] = 'ann';
$db = new PDO('sqlite::memory:'); $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
require_once __DIR__ . '/../../canvascore-admin/migrations.php';
foreach (cc_db_migrations() as $v => $m) if ($v >= 6) $m($db);
cc_add_revision($db, 'p1', 'Home', '[1]', 'draft');
cc_add_revision($db, 'p1', 'Home', '[1]', 'draft');
check('a save without changes adds no version', (int)$db->query("SELECT COUNT(*) FROM page_revisions")->fetchColumn() === 1);
for ($i = 2; $i <= 45; $i++) cc_add_revision($db, 'p1', 'Home', "[$i]", $i % 2 ? 'draft' : 'published');
check('only the newest 40 versions are kept', (int)$db->query("SELECT COUNT(*) FROM page_revisions WHERE owner='p1'")->fetchColumn() === 40);
$newest = $db->query("SELECT content_json, author FROM page_revisions ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
check('…the latest one included, with its author', $newest['content_json'] === '[45]' && $newest['author'] === 'ann');

echo "\nIMAGES\n";
require_once __DIR__ . '/../../canvascore-admin/media.php';
$up = sys_get_temp_dir() . '/cc_up_' . getmypid(); @mkdir($up);
$GLOBALS['CC_MEDIA_META_FILE'] = $up . '/media-meta.json';
$im = imagecreatetruecolor(2000, 1000); imagefilledrectangle($im, 0, 0, 1999, 999, imagecolorallocate($im, 30, 120, 200));
imagejpeg($im, $up . '/photo.jpg', 85);
$small = imagecreatetruecolor(300, 200); imagepng($small, $up . '/icon.png');
$meta = cc_media_process($up, 'photo.jpg');
check('a large photo gets WebP copies at 480, 960 and 1600 px', $meta['variants'] === [480, 960, 1600] && is_file("$up/_cc/photo-960.webp"), json_encode($meta['variants']));
$v = getimagesize("$up/_cc/photo-480.webp");
check('…with the right proportions', $v && $v[0] === 480 && $v[1] === 240);
$m2 = cc_media_process($up, 'icon.png');
check('a small image is never enlarged (no copies) but is marked as processed', $m2['variants'] === [] && $m2['optimized'] === true && $m2['w'] === 300);
cc_media_meta_update(function (&$all) { $all['photo.jpg']['alt'] = 'Blue sky'; });
$meta2 = cc_media_process($up, 'photo.jpg');
check('processing again keeps the alt text', cc_media_meta_all()['photo.jpg']['alt'] === 'Blue sky');
$page = '<img src="/uploads/photo.jpg" alt="a" loading="lazy"><p>x</p><img src="/uploads/icon.png" alt="b"><img src="https://ext.com/x.jpg" alt="c" loading="eager">';
$out = cc_optimize_images($page, '/uploads/');
check('published pages get a srcset of the copies (and the original at its width)', strpos($out, 'srcset="/uploads/_cc/photo-480.webp 480w, /uploads/_cc/photo-960.webp 960w, /uploads/_cc/photo-1600.webp 1600w, /uploads/photo.jpg 2000w"') !== false, $out);
check('the first image loads with priority (even if a block marked it lazy), the next ones lazily', preg_match('#<img[^>]*fetchpriority="high"[^>]*src="/uploads/photo.jpg"#', $out) && !preg_match('#src="/uploads/photo.jpg"[^>]*loading="lazy"#', $out) && preg_match('#<img[^>]*loading="lazy"[^>]*src="/uploads/icon.png"#', $out));
check('an image that already says how to load keeps it; others decode async', strpos($out, 'loading="eager"') !== false && substr_count($out, 'decoding="async"') === 3);
cc_media_forget($up, 'photo.jpg');
check('deleting an image removes its copies and its description', !is_file("$up/_cc/photo-480.webp") && !isset(cc_media_meta_all()['photo.jpg']));
array_map('unlink', glob("$up/_cc/*") ?: []); @rmdir("$up/_cc"); array_map('unlink', glob("$up/*") ?: []); @rmdir($up);

echo "\n" . ($fails === 0 ? 'SERVER OK' : "$fails checks failed") . " ($total checks)\n";
exit($fails === 0 ? 0 : 1);
