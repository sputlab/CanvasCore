<?php
// canvascore-admin/config.php
// Shared module: hardened session, CSRF, data dir outside the web root, HTML sanitizer, protections.
// Included by api.php, rebuild_all.php, submit_form.php.

if (defined('CC_CONFIG_LOADED')) return;
define('CC_CONFIG_LOADED', true);

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
    "<IfModule mod_php.c>\n  php_admin_flag engine off\n</IfModule>\n" .
    "<IfModule mod_php7.c>\n  php_admin_flag engine off\n</IfModule>\n" .
    "<IfModule mod_php5.c>\n  php_admin_flag engine off\n</IfModule>\n";

function ensure_htaccess($dir, $contents) {
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    @file_put_contents($dir . '/.htaccess', $contents); // overwrite: repairs old installations
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
        $html = preg_replace('#(href|src)\s*=\s*("|\')\s*(?:javascript|vbscript)\s*:[^"\']*\2#is', '$1="#"', $html);
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
                        if (preg_match('#^\s*(javascript|vbscript|data)\s*:#i', $av)) {
                            $ok = ($an === 'src' && preg_match('#^\s*data:image/#i', $av)); // allow only data:image in src
                        }
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
