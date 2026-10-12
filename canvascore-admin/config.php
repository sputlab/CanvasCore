<?php
// canvascore-admin/config.php
// Shared module: hardened session, CSRF, data dir outside the web root, HTML sanitizer, protections.
// Included by api.php, rebuild_all.php, submit_form.php.

if (defined('CC_CONFIG_LOADED')) return;
define('CC_CONFIG_LOADED', true);

// Hosts without the mbstring extension: UTF-8 safe fallbacks for the two functions used
if (!function_exists('mb_substr')) {
    function mb_substr($s, $start, $length = null) {
        preg_match_all('/./us', (string)$s, $m);
        return implode('', array_slice($m[0], $start, $length));
    }
}
if (!function_exists('mb_strlen')) {
    function mb_strlen($s) { return (int)preg_match_all('/./us', (string)$s); }
}

// ---------------------------------------------------------------------------
// Hardened session (HttpOnly cookie, SameSite=Lax, Secure over HTTPS)
// ---------------------------------------------------------------------------
function cc_is_https() {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['HTTP_X_FORWARDED_SSL'] ?? '') === 'on');
}

// Session start (with inactivity timeout) is in cc_boot_session(), called at the end of the file.

// ---------------------------------------------------------------------------
// .htaccess (Apache) — robust and FPM-safe
// ---------------------------------------------------------------------------
$GLOBALS['CC_HT_DENY'] =
    "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n" .
    "<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n";

$GLOBALS['CC_HT_UPLOADS'] =
    "<FilesMatch \"\\.(?i:php|phtml|phar|php3|php4|php5|php7|phps|pht|cgi|pl|py|sh)$\">\n" .
    "  <IfModule mod_authz_core.c>\n    Require all denied\n  </IfModule>\n" .
    "  <IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n  </IfModule>\n" .
    "</FilesMatch>\n" .
    // php_flag (php_admin_flag is refused in .htaccess and would make the whole folder answer 500)
    "<IfModule mod_php.c>\n  php_flag engine off\n</IfModule>\n" .
    "<IfModule mod_php7.c>\n  php_flag engine off\n</IfModule>\n" .
    // SVG files opened directly can't run scripts (defense in depth, besides the upload check)
    "<FilesMatch \"\\.(?i:svg)$\">\n  <IfModule mod_headers.c>\n    Header set Content-Security-Policy \"script-src 'none'; sandbox\"\n  </IfModule>\n</FilesMatch>\n";

function ensure_htaccess($dir, $contents) {
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    // Rewritten only when different (repairs old installations without a write on every request)
    $f = $dir . '/.htaccess';
    if (!is_file($f) || @file_get_contents($f) !== $contents) @file_put_contents($f, $contents, LOCK_EX);
}

// ---------------------------------------------------------------------------
// Data dir: outside the web root when possible (automatic migration)
// ---------------------------------------------------------------------------
function cc_can_write($dir) {
    if (!is_dir($dir)) return false;
    $t = $dir . '/.cc_wtest_' . getmypid();
    if (@file_put_contents($t, '1') === false) return false;
    @unlink($t);
    return true;
}

function cc_data_dir() {
    static $dir = null;
    if ($dir !== null) return $dir;

    $legacy  = __DIR__ . '/data';                        // inside the web root
    $outside = dirname(__DIR__, 2) . '/canvascore-data'; // outside the web root (recommended)
    foreach ([$outside, $legacy] as $c) { if (!is_dir($c)) @mkdir($c, 0755, true); }

    // A location that is REALLY writable (not just is_writable), preferring the outside one.
    if (cc_can_write($outside))    $dir = $outside;
    elseif (cc_can_write($legacy)) $dir = $legacy;
    else                           $dir = $legacy;

    $other = ($dir === $outside) ? $legacy : $outside;

    // Two-way migration: move DB and config to the chosen location if they are in the other one.
    // If the outside folder is not writable, the data goes back where it CAN be written.
    if (!file_exists($dir . '/canvascore.sqlite') && file_exists($other . '/canvascore.sqlite')) {
        foreach (['canvascore.sqlite', 'settings.json', 'menu.json', 'forms.json'] as $f) {
            if (file_exists($other . '/' . $f)) @copy($other . '/' . $f, $dir . '/' . $f);
        }
        if (file_exists($dir . '/canvascore.sqlite')) @unlink($other . '/canvascore.sqlite');
    }

    ensure_htaccess($dir, $GLOBALS['CC_HT_DENY']);
    if (is_dir($legacy)) ensure_htaccess($legacy, $GLOBALS['CC_HT_DENY']);

    return $dir;
}

// ---------------------------------------------------------------------------
// Version (single source of truth: version.json)
// ---------------------------------------------------------------------------
function cc_version() {
    static $v = null;
    if ($v !== null) return $v;
    $file = __DIR__ . '/version.json';
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : null;
    $v = [
        'app' => $data['app'] ?? '0.0.0',
        'db_schema' => (int)($data['db_schema'] ?? 1),
        'content_schema' => (int)($data['content_schema'] ?? 1),
        'build' => (int)($data['build'] ?? 0),
        'built' => $data['built'] ?? null,
    ];
    return $v;
}

// Block defaults (single source of truth, shared with the editor).
function cc_block_defaults() {
    static $d = null;
    if ($d !== null) return $d;
    $file = __DIR__ . '/blocks.json';
    $d = file_exists($file) ? (json_decode(file_get_contents($file), true) ?: ['_baseStyles' => [], 'types' => []]) : ['_baseStyles' => [], 'types' => []];
    return $d;
}

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------
function cc_safe_slug($raw) {
    $s = strtolower(trim((string)$raw));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim($s, '-');
    return $s === '' ? 'index' : $s;
}
if (!function_exists('sanitize_slug')) {
    function sanitize_slug($raw) { return cc_safe_slug($raw); }
}

// ---------------------------------------------------------------------------
// CSRF + Origin check (defense in depth, on top of SameSite)
// ---------------------------------------------------------------------------
function cc_issue_csrf() {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    if (!headers_sent() && (($_COOKIE['cc_csrf'] ?? '') !== $_SESSION['csrf'])) {
        @setcookie('cc_csrf', $_SESSION['csrf'], [
            'path' => '/', 'samesite' => 'Lax', 'secure' => cc_is_https(), 'httponly' => false,
        ]);
        $_COOKIE['cc_csrf'] = $_SESSION['csrf'];
    }
    return $_SESSION['csrf'];
}

// ---------------------------------------------------------------------------
// Login throttling: 5 wrong passwords in 15 minutes for the same account from the same address
// -> that pair waits 15 minutes. Stored in the data dir (login_attempts.json), with a file lock.
// ---------------------------------------------------------------------------
function cc_login_attempts_update($fn) {
    $file = cc_data_dir() . '/login_attempts.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) return $fn([])[1] ?? null;
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $all = json_decode($raw ?: '{}', true);
    if (!is_array($all)) $all = [];
    $now = time();
    foreach ($all as $k => $v) { if (($v['until'] ?? 0) < $now && ($v['first'] ?? 0) < $now - 900) unset($all[$k]); }
    [$all, $result] = $fn($all);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($all));
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return $result;
}
// The visitor's address. Behind a reverse proxy / CDN every request comes from the proxy: when the
// connecting address is listed in Global Options › Security › Trusted proxy addresses, the client
// address the proxy reports (X-Forwarded-For, nearest untrusted hop) is used instead.
function cc_client_ip($trustedOverride = null) {   // $trustedOverride: list of proxy IPs (tests)
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    static $trusted = null;
    if ($trustedOverride !== null) $trusted = $trustedOverride;
    if ($trusted === null) {
        $s = @json_decode((string)@file_get_contents(cc_data_dir() . '/settings.json'), true);
        $trusted = array_values(array_filter(array_map('trim', explode(',', (string)($s['trustedProxies'] ?? '')))));
    }
    if (!$trusted || !in_array($remote, $trusted, true)) return $remote;
    $chain = array_map('trim', explode(',', (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')));
    for ($i = count($chain) - 1; $i >= 0; $i--) {
        $ip = $chain[$i];
        if (filter_var($ip, FILTER_VALIDATE_IP) && !in_array($ip, $trusted, true)) return $ip;
    }
    return $remote;
}
function cc_login_key($username) { return sha1(cc_client_ip() . '|' . strtolower($username)); }
// Seconds to wait before trying again (0 = allowed)
function cc_login_wait($username) {
    $k = cc_login_key($username);
    return (int) cc_login_attempts_update(function ($all) use ($k) {
        $until = (int)($all[$k]['until'] ?? 0);
        return [$all, max(0, $until - time())];
    });
}
function cc_login_result($username, $ok) {
    $k = cc_login_key($username);
    cc_login_attempts_update(function ($all) use ($k, $ok) {
        if ($ok) { unset($all[$k]); return [$all, null]; }
        $now = time();
        $e = $all[$k] ?? ['count' => 0, 'first' => $now, 'until' => 0];
        if ($e['first'] < $now - 900) $e = ['count' => 0, 'first' => $now, 'until' => 0];
        $e['count']++;
        if ($e['count'] >= 5) { $e['until'] = $now + 900; $e['count'] = 0; $e['first'] = $now; }
        $all[$k] = $e;
        return [$all, null];
    });
}

// Simple rate limit: true while `key` stayed under `max` hits in the last `window` seconds (records the hit).
function cc_rate_allow($bucket, $key, $max, $window) {
    $file = cc_data_dir() . '/rate_' . preg_replace('/[^a-z0-9_]/', '', $bucket) . '.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) return true;
    flock($fh, LOCK_EX);
    $all = json_decode(stream_get_contents($fh) ?: '{}', true);
    if (!is_array($all)) $all = [];
    $now = time();
    foreach ($all as $k => $hits) { $all[$k] = array_values(array_filter((array)$hits, function ($t) use ($now, $window) { return $t > $now - $window; })); if (!$all[$k]) unset($all[$k]); }
    $k = sha1($key);
    $ok = count($all[$k] ?? []) < $max;
    if ($ok) $all[$k][] = $now;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($all));
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return $ok;
}

// Re-linking after a slug change (used by relink_slug_change in api.php). Works on the decoded data, so the JSON
// formatting (escaped slashes) doesn't matter. Two link forms: "old/index.html" in link fields
// (buttons, menu) and "{{BASE_URL}}old/" inside rich text.
function cc_relink_node(&$node, $oldUrl, $newUrl, $oldBase, $newBase) {
    if (!is_array($node)) return false;
    $changed = false;
    foreach ($node as $k => &$v) {
        if (is_array($v)) {
            if (cc_relink_node($v, $oldUrl, $newUrl, $oldBase, $newBase)) $changed = true;
        } elseif (is_string($v)) {
            if ($v === $oldUrl && in_array($k, ['url', 'btnUrl', 'buttonUrl', 'href', 'link'], true)) { $v = $newUrl; $changed = true; }
            elseif (strpos($v, $oldBase) !== false) { $v = str_replace($oldBase, $newBase, $v); $changed = true; }
        }
    }
    unset($v);
    return $changed;
}

// An uploaded SVG is a document that can carry scripts: accept it only without any active content
// (scripts, event handlers, javascript: links, embedded HTML, external entities).
function cc_svg_is_safe($path) {
    $svg = @file_get_contents($path);
    if ($svg === false || $svg === '') return false;
    if (preg_match('/<!ENTITY|<!DOCTYPE[^>]*\[/i', $svg)) return false;
    $probe = preg_replace('/[\x00-\x20\x7f]+/', '', strtolower($svg));
    if (strpos($probe, 'javascript:') !== false || strpos($probe, 'vbscript:') !== false || strpos($probe, '<script') !== false) return false;
    if (!class_exists('DOMDocument')) {
        return !preg_match('/<\s*(script|foreignobject|iframe|embed|object|handler|listener)\b|\son[a-z]+\s*=/i', $svg);
    }
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $ok = $dom->loadXML($svg, LIBXML_NONET);
    libxml_clear_errors();
    if (!$ok || !$dom->documentElement || strtolower($dom->documentElement->localName) !== 'svg') return false;
    foreach ($dom->getElementsByTagName('*') as $el) {
        $name = strtolower($el->localName);
        if (in_array($name, ['script', 'foreignobject', 'iframe', 'embed', 'object', 'handler', 'listener'], true)) return false;
        foreach ($el->attributes as $a) {
            $an = strtolower($a->localName);
            if (strpos($an, 'on') === 0) return false;
            if (in_array($an, ['href', 'to', 'values', 'from', 'by'], true) && preg_match('#^(javascript|vbscript|data:text|data:application)#i', preg_replace('/[\x00-\x20\x7f]+/', '', $a->value))) return false;
        }
    }
    return true;
}

function cc_verify_csrf_or_die() {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($sent !== '') {
        $sess   = $_SESSION['csrf'] ?? '';
        $cookie = $_COOKIE['cc_csrf'] ?? '';
        if (($sess !== '' && hash_equals($sess, $sent)) ||
            ($cookie !== '' && hash_equals($cookie, $sent))) {
            return;
        }
    }
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Invalid CSRF token. Reload the page.']));
}

// ---------------------------------------------------------------------------
// Removal of "code" surfaces for non-admin users (server-side defense)
// ---------------------------------------------------------------------------
function cc_strip_code_surfaces(&$blocks) {
    if (!is_array($blocks)) return;
    foreach ($blocks as &$b) {
        if (!is_array($b)) continue;
        if (($b['type'] ?? '') === 'HTML') {
            if (isset($b['content']) && is_array($b['content'])) $b['content']['code'] = '';
        }
        if (isset($b['content']) && is_array($b['content'])) {
            unset($b['content']['customCss']);
            unset($b['content']['customJs']);
        }
        if (isset($b['children']) && is_array($b['children'])) {
            cc_strip_code_surfaces($b['children']);
        }
    }
    unset($b);
}

// Non-admin save: the code an admin put in (Custom HTML blocks, custom CSS/JS, a form's receiving email) is KEPT as it was saved,
// matched by block id, instead of being wiped; an editor can't add or change code, only move or delete
// those blocks. $previous = the blocks currently stored (array or JSON string).
function cc_keep_code_surfaces(&$blocks, $previous) {
    if (is_string($previous)) $previous = json_decode($previous, true);
    $saved = [];
    $collect = function ($list) use (&$collect, &$saved) {
        if (!is_array($list)) return;
        foreach ($list as $b) {
            if (!is_array($b)) continue;
            if (isset($b['id']) && is_scalar($b['id'])) {
                $c = is_array($b['content'] ?? null) ? $b['content'] : [];
                $saved[(string)$b['id']] = ['type' => $b['type'] ?? '', 'code' => $c['code'] ?? null, 'customCss' => $c['customCss'] ?? null, 'customJs' => $c['customJs'] ?? null, 'email' => $c['email'] ?? null];
            }
            if (isset($b['children'])) $collect($b['children']);
        }
    };
    $collect(is_array($previous) ? $previous : []);
    $apply = function (&$list) use (&$apply, $saved) {
        if (!is_array($list)) return;
        foreach ($list as &$b) {
            if (!is_array($b)) continue;
            if (!isset($b['content']) || !is_array($b['content'])) $b['content'] = [];
            $old = (isset($b['id']) && is_scalar($b['id'])) ? ($saved[(string)$b['id']] ?? null) : null;
            if (($b['type'] ?? '') === 'HTML') {
                $b['content']['code'] = ($old && $old['type'] === 'HTML' && is_string($old['code'])) ? $old['code'] : '';
            }
            // A form's own receiving email is an admin setting too (where the site's messages go)
            if (($b['type'] ?? '') === 'FORM') {
                $b['content']['email'] = ($old && $old['type'] === 'FORM' && is_string($old['email'])) ? $old['email'] : '';
            }
            foreach (['customCss', 'customJs'] as $k) {
                if ($old && is_string($old[$k]) && $old[$k] !== '') $b['content'][$k] = $old[$k]; else unset($b['content'][$k]);
            }
            if (isset($b['children'])) $apply($b['children']);
        }
        unset($b);
    };
    $apply($blocks);
}

// ---------------------------------------------------------------------------
// HTML sanitizer (allowlist) for rich-text content
// ---------------------------------------------------------------------------
function cc_sanitize_html($html) {
    $html = (string)$html;
    if (trim($html) === '') return '';

    if (!class_exists('DOMDocument')) {
        // Conservative fallback without ext-dom
        $html = preg_replace('#<\s*(script|iframe|object|embed|style|link|meta|base|form|input|button|textarea|select|noscript)\b[^>]*>.*?<\s*/\s*\1\s*>#is', '', $html);
        $html = preg_replace('#<\s*(script|iframe|object|embed|style|link|meta|base|form|input|button|textarea|select|noscript)\b[^>]*/?>#is', '', $html);
        $html = preg_replace('#\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#is', '', $html);
        $html = preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+/', '', $html);
        $html = preg_replace('#(href|src)\s*=\s*("|\')[\s]*(?:j[\s]*a[\s]*v[\s]*a[\s]*s[\s]*c[\s]*r[\s]*i[\s]*p[\s]*t|vbscript)\s*:[^"\']*\2#is', '$1="#"', $html);
        return $html;
    }

    $allowedTags = array_flip([
        'p','br','hr','b','strong','i','em','u','s','strike','del','ins','mark','small','sub','sup',
        'ul','ol','li','a','span','div','section','article','blockquote','q','cite','abbr','code','pre','kbd','samp',
        'h1','h2','h3','h4','h5','h6','img','figure','figcaption','table','thead','tbody','tfoot','tr','td','th','caption','colgroup','col'
    ]);
    $allowedAttrs = array_flip([
        'href','src','alt','title','style','class','id','target','rel','colspan','rowspan','width','height','align','dir','lang','loading'
    ]);
    $dangerous = array_flip(['script','style','iframe','object','embed','link','meta','base','form','input','button','textarea','select','noscript','svg','math']);

    $dom = new DOMDocument('1.0', 'UTF-8');
    libxml_use_internal_errors(true);
    $wrapped = '<?xml encoding="utf-8"?><div id="cc-root">' . $html . '</div>';
    $dom->loadHTML($wrapped, LIBXML_NOERROR | LIBXML_NONET | LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    $xp = new DOMXPath($dom);
    $root = $xp->query('//*[@id="cc-root"]')->item(0);
    if (!$root) return '';

    $clean = function ($node) use (&$clean, $allowedTags, $allowedAttrs, $dangerous, $dom) {
        $children = iterator_to_array($node->childNodes);
        foreach ($children as $child) {
            if ($child->nodeType === XML_ELEMENT_NODE) {
                $tag = strtolower($child->tagName);
                if (!isset($allowedTags[$tag])) {
                    if (isset($dangerous[$tag])) {
                        $node->removeChild($child); // remove tag and content
                    } else {
                        // tag not allowed but harmless: reduce it to its text
                        $node->replaceChild($dom->createTextNode($child->textContent), $child);
                    }
                    continue;
                }
                // attribute cleanup
                foreach (iterator_to_array($child->attributes) as $attr) {
                    $an = strtolower($attr->name);
                    $av = $attr->value;
                    $ok = isset($allowedAttrs[$an]);
                    if ($ok && ($an === 'href' || $an === 'src')) {
                        // Browsers ignore control characters, spaces, tabs and newlines inside a URL scheme
                        // ("\x1fjava\tscript:"): check the value without them, and store it without them too.
                        $probe = preg_replace('/[\x00-\x20\x7f]+/', '', $av);
                        if (preg_match('#^(javascript|vbscript|data|livescript)\s*:#i', $probe)) {
                            $ok = ($an === 'src' && preg_match('#^data:image/#i', $probe)); // allow only data:image in src
                        }
                        if ($ok) { $child->setAttribute($attr->name, trim(preg_replace('/[\x00-\x1f\x7f]+/', '', $av))); continue; }
                    }
                    if ($ok && $an === 'style') {
                        // Neutralize dangerous url(...), expression() and javascript/vbscript schemes
                        $av = preg_replace('#url\(\s*[\'"]?\s*(?:javascript|vbscript|data)\s*:[^)]*\)?#i', 'none', $av);
                        $av = preg_replace('#expression\s*\([^)]*\)?#i', '', $av);
                        $av = preg_replace('#(?:javascript|vbscript)\s*:#i', '', $av);
                        $child->setAttribute('style', $av);
                        continue;
                    }
                    if (!$ok) $child->removeAttribute($attr->name);
                }
                $clean($child);
            } elseif ($child->nodeType === XML_COMMENT_NODE) {
                $node->removeChild($child);
            }
        }
    };
    $clean($root);

    $out = '';
    foreach ($root->childNodes as $c) $out .= $dom->saveHTML($c);
    return $out;
}


// ---------------------------------------------------------------------------
// Session: deterministic INACTIVITY timeout (the server is the only authority)
// ---------------------------------------------------------------------------
// Expiry used to depend on PHP's garbage collector (probabilistic, ~24 min):
// unpredictable for the user and the client. Now every authenticated request updates
// $_SESSION['last_seen'] and the session expires exactly after N minutes without activity.
define('CC_SESSION_DEFAULT_MINUTES', 30);

function cc_session_limit() {
    static $limit = null;
    if ($limit !== null) return $limit;
    $min = CC_SESSION_DEFAULT_MINUTES;
    $f = cc_data_dir() . '/settings.json';
    if (is_readable($f)) {
        $st = json_decode(@file_get_contents($f), true);
        if (is_array($st) && isset($st['sessionTimeoutMinutes']) && is_numeric($st['sessionTimeoutMinutes'])) {
            $min = (int)$st['sessionTimeoutMinutes'];
        }
    }
    $min = max(5, min(720, $min));   // 5 minutes .. 12 hours
    return $limit = $min * 60;
}

function cc_session_is_logged_in() {
    return !empty($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

// Record user activity: extends the session.
function cc_session_touch() {
    $_SESSION['last_seen'] = time();
}

// Seconds left before expiry (null if not logged in). Does NOT modify the session.
function cc_session_expires_in() {
    if (!cc_session_is_logged_in()) return null;
    $last = (int)($_SESSION['last_seen'] ?? time());
    return max(0, cc_session_limit() - (time() - $last));
}

// Uniform 401 response for unauthenticated or expired requests.
function cc_unauthorized($message = 'Unauthorized.') {
    http_response_code(401);
    header('Content-Type: application/json');
    die(json_encode([
        'success' => false,
        'message' => $message,
        'code' => !empty($GLOBALS['CC_SESSION_EXPIRED']) ? 'session_expired' : 'auth_required',
    ]));
}

function cc_boot_session() {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $limit = cc_session_limit();

    // Dedicated session folder (inside the data dir, protected): isolated from the server's other
    // applications, whose GC could otherwise delete our sessions too early.
    // If it is not writable, fall back to PHP's default path.
    $dir = cc_data_dir() . '/sessions';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    if (is_dir($dir) && cc_can_write($dir)) session_save_path($dir);

    ini_set('session.gc_maxlifetime', (string)max(86400, $limit * 2)); // the GC must never get ahead of our own check
    ini_set('session.gc_probability', '1');                            // active cleanup even where the system GC is turned off
    ini_set('session.gc_divisor', '50');
    ini_set('session.use_strict_mode', '1');                           // do not adopt unknown session IDs
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => cc_is_https(),
    ]);
    @session_start();

    $GLOBALS['CC_SESSION_EXPIRED'] = false;
    if (cc_session_is_logged_in()) {
        if (!isset($_SESSION['last_seen'])) {
            $_SESSION['last_seen'] = time();             // session created before this update
        } elseif (time() - (int)$_SESSION['last_seen'] > $limit) {
            $_SESSION = [];                              // expired due to inactivity
            @session_regenerate_id(true);
            $GLOBALS['CC_SESSION_EXPIRED'] = true;
        }
    }
}

cc_boot_session();
