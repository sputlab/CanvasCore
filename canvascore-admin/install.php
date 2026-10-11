<?php
// canvascore-admin/install.php
// Setup wizard: requirements check, DB creation (same migrations as api.php),
// administrator account replacing the default admin/admin, basic site settings and
// optional homepage from a starter. Once installation is complete it locks itself and offers to delete itself.
//
// The site counts as "installed" when:
//   - cc_meta contains installed_at (installation done by this wizard), or
//   - at least one account other than the default admin/admin exists (pre-existing installation).
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/migrations.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");

const CC_INSTALL_MIN_PHP = '8.0.0';

$data_dir = cc_data_dir();
$db_file  = $data_dir . '/canvascore.sqlite';
$site_dir = dirname(__DIR__);

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// ---------------------------------------------------------------------------
// Installation state
// ---------------------------------------------------------------------------
function cc_install_state($db_file) {
    if (!file_exists($db_file)) return 'fresh';
    try {
        $pdo = new PDO('sqlite:' . $db_file);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN);
        if (in_array('cc_meta', $tables, true) && cc_meta_get($pdo, 'installed_at')) return 'installed';
        if (in_array('admin', $tables, true)) {
            foreach ($pdo->query("SELECT username, password_hash FROM admin") as $u) {
                if (!cc_is_default_admin($u)) return 'installed';
            }
        }
    } catch (Exception $e) {
        return 'error';
    }
    return 'fresh';
}

function cc_is_default_admin($row) {
    return ($row['username'] ?? '') === 'admin' && password_verify('admin', (string)($row['password_hash'] ?? ''));
}

// ---------------------------------------------------------------------------
// Requirements: [label, 'ok'|'warn'|'fail', detail]
// ---------------------------------------------------------------------------
function cc_dir_writable_or_creatable($dir) {
    if (is_dir($dir)) return cc_can_write($dir);
    $parent = dirname($dir);
    return is_dir($parent) && cc_can_write($parent);
}

function cc_install_requirements($data_dir, $site_dir) {
    $r = [];

    $php_ok = version_compare(PHP_VERSION, CC_INSTALL_MIN_PHP, '>=');
    $r[] = ['PHP version', $php_ok ? 'ok' : 'fail', PHP_VERSION . ($php_ok ? '' : ' — ' . CC_INSTALL_MIN_PHP . ' or newer is required')];

    $sqlite = extension_loaded('pdo_sqlite');
    $r[] = ['SQLite (pdo_sqlite)', $sqlite ? 'ok' : 'fail', $sqlite ? 'Available' : 'Enable the pdo_sqlite extension'];

    foreach (['json' => 'JSON', 'session' => 'Sessions'] as $ext => $label) {
        $ok = extension_loaded($ext);
        $r[] = [$label, $ok ? 'ok' : 'fail', $ok ? 'Available' : "Enable the $ext extension"];
    }

    $dom = class_exists('DOMDocument');
    $r[] = ['DOM extension', $dom ? 'ok' : 'warn', $dom ? 'Available' : 'Missing: rich text is cleaned with a simpler fallback sanitizer'];

    $data_ok = cc_can_write($data_dir);
    $outside = strpos(rtrim(realpath($data_dir) ?: $data_dir, '/') . '/', rtrim(realpath($site_dir) ?: $site_dir, '/') . '/') !== 0;
    if (!$data_ok) {
        $r[] = ['Data folder', 'fail', 'Not writable: ' . $data_dir];
    } elseif ($outside) {
        $r[] = ['Data folder', 'ok', 'Outside the web root: ' . $data_dir];
    } else {
        $r[] = ['Data folder', 'warn', 'Inside the web root (' . $data_dir . '). Protected by .htaccess on Apache only: on Nginx add a deny rule, or make ' . dirname($site_dir) . '/canvascore-data writable'];
    }

    $site_ok = cc_can_write($site_dir);
    $r[] = ['Site folder (published pages)', $site_ok ? 'ok' : 'fail', $site_ok ? $site_dir : 'Not writable: ' . $site_dir . ' — pages cannot be published'];

    $up_ok = cc_dir_writable_or_creatable($site_dir . '/uploads');
    $r[] = ['Uploads folder', $up_ok ? 'ok' : 'warn', $up_ok ? $site_dir . '/uploads' : 'Not writable: ' . $site_dir . '/uploads — media uploads will fail'];

    $upload_on = (bool)ini_get('file_uploads');
    $r[] = ['File uploads', $upload_on ? 'ok' : 'warn', $upload_on ? 'Max file size ' . ini_get('upload_max_filesize') . ', max post ' . ini_get('post_max_size') : 'Disabled in php.ini (file_uploads)'];

    $editor = file_exists(__DIR__ . '/index.html');
    $r[] = ['Editor build', $editor ? 'ok' : 'warn', $editor ? 'index.html found' : 'index.html missing: copy the contents of canvascore-frontend/dist/ into this folder'];

    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    $mail = function_exists('mail') && !in_array('mail', $disabled, true);
    $r[] = ['mail()', $mail ? 'ok' : 'warn', $mail ? 'Available (form notifications)' : 'Unavailable: form submissions are stored but no email is sent'];

    $https = cc_is_https();
    $r[] = ['HTTPS', $https ? 'ok' : 'warn', $https ? 'Secure connection' : 'Not using HTTPS: passwords and session cookies travel unencrypted'];

    return $r;
}

function cc_has_failures($reqs) {
    foreach ($reqs as $q) if ($q[1] === 'fail') return true;
    return false;
}

function cc_load_starters() {
    $file = __DIR__ . '/starters.json';
    $list = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    return is_array($list) ? $list : [];
}

// Regenerate block ids (like Templates.jsx) to avoid collisions between pages.
function cc_regen_block_ids(array $blocks) {
    static $seq = 0;
    foreach ($blocks as &$b) {
        if (!is_array($b)) continue;
        $b['id'] = 'block-' . (int)(microtime(true) * 1000) . '-' . ($seq++);
        if (isset($b['children']) && is_array($b['children'])) $b['children'] = cc_regen_block_ids($b['children']);
    }
    unset($b);
    return $blocks;
}

function cc_default_site_url() {
    $scheme = cc_is_https() ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/', 2)), '/');
    return $scheme . '://' . $host . $base;
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------
function cc_install_validate($in, $starters) {
    $err = [];
    if ($in['site_name'] === '') $err['site_name'] = 'Enter the site name.';
    elseif (mb_strlen($in['site_name']) > 120) $err['site_name'] = 'Use at most 120 characters.';

    if ($in['site_url'] !== '' && !preg_match('#^https?://[^\s/$.?\#].[^\s]*$#i', $in['site_url'])) {
        $err['site_url'] = 'Enter a full address such as https://www.example.com, or leave it empty.';
    }

    if (!preg_match('/^[A-Za-z0-9._@-]{3,32}$/', $in['admin_user'])) {
        $err['admin_user'] = '3–32 characters: letters, numbers, dot, dash, underscore or @.';
    }

    if (strlen($in['admin_pass']) < 8) $err['admin_pass'] = 'Use at least 8 characters.';
    elseif (strtolower($in['admin_pass']) === 'admin' || $in['admin_pass'] === $in['admin_user']) $err['admin_pass'] = 'Choose a less guessable password.';
    elseif (!hash_equals($in['admin_pass'], $in['admin_pass2'])) $err['admin_pass2'] = 'The passwords do not match.';

    if ($in['admin_email'] !== '' && !filter_var($in['admin_email'], FILTER_VALIDATE_EMAIL)) {
        $err['admin_email'] = 'Enter a valid email address, or leave it empty.';
    }

    $ids = array_column($starters, 'id');
    if ($in['starter'] !== '' && !in_array($in['starter'], $ids, true)) $err['starter'] = 'Unknown starter.';
    return $err;
}

function cc_run_install($db_file, $data_dir, $in, $starters) {
    $pdo = new PDO('sqlite:' . $db_file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    cc_migrate($pdo);           // create the schema (and the default admin/admin, replaced below)
    cc_migrate_content($pdo);

    $pdo->beginTransaction();
    try {
        // Remove the default admin/admin: the only account allowed at this point.
        $del = $pdo->prepare("DELETE FROM admin WHERE id = ?");
        foreach ($pdo->query("SELECT id, username, password_hash FROM admin")->fetchAll(PDO::FETCH_ASSOC) as $u) {
            if (cc_is_default_admin($u)) $del->execute([$u['id']]);
        }
        $pdo->prepare("INSERT INTO admin (username, password_hash, role, must_change_pw) VALUES (?, ?, 'admin', 0)")
            ->execute([$in['admin_user'], password_hash($in['admin_pass'], PASSWORD_DEFAULT)]);

        // Homepage (draft) from the chosen starter, only if the site has no pages yet.
        $page_created = false;
        if ($in['starter'] !== '' && (int)$pdo->query("SELECT COUNT(*) FROM pages")->fetchColumn() === 0) {
            foreach ($starters as $s) {
                if (($s['id'] ?? '') !== $in['starter']) continue;
                $blocks = cc_regen_block_ids(is_array($s['blocks'] ?? null) ? $s['blocks'] : []);
                $pdo->prepare("INSERT INTO pages (id, parent_id, title, slug, clean_slug, content_json, status, is_draft_copy, is_home, content_schema, author, updated_at)
                               VALUES (?, NULL, 'Home', 'home', 'home', ?, 'draft', 0, 1, ?, ?, ?)")
                    ->execute(['page-' . (int)(microtime(true) * 1000), json_encode($blocks), cc_version()['content_schema'], $in['admin_user'], date('Y-m-d H:i:s')]);
                $page_created = true;
            }
        }

        // Settings (merged with any existing ones): written before the commit, so an error rolls everything back.
        $file = $data_dir . '/settings.json';
        $settings = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
        if (!is_array($settings)) $settings = [];
        $settings['siteName'] = $in['site_name'];
        $settings['siteUrl'] = rtrim($in['site_url'], '/');
        if (!isset($settings['siteSuffix'])) $settings['siteSuffix'] = ' | ' . $in['site_name'];
        if ($in['admin_email'] !== '') $settings['adminEmail'] = $in['admin_email'];
        if (file_put_contents($file, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
            throw new RuntimeException('Could not write settings.json');
        }

        cc_meta_set($pdo, 'installed_at', gmdate('c'));
        cc_meta_set($pdo, 'installed_version', cc_version()['app']);
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    return $page_created;
}

// Automatic sign-in with the new account (same session as api.php?action=login).
function cc_install_login($username) {
    session_regenerate_id(true);
    $_SESSION['logged_in'] = true;
    $_SESSION['username'] = $username;
    $_SESSION['role'] = 'admin';
    $_SESSION['last_seen'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    cc_issue_csrf();
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
if (empty($_SESSION['install_csrf'])) $_SESSION['install_csrf'] = bin2hex(random_bytes(32));
$csrf = $_SESSION['install_csrf'];

$state     = cc_install_state($db_file);
$reqs      = cc_install_requirements($data_dir, $site_dir);
$starters  = cc_load_starters();
$errors    = [];
$view      = $state === 'installed' ? 'installed' : ($state === 'error' ? 'error' : 'form');
$notice    = '';
$page_created = false;
$in = [
    'site_name' => '', 'site_url' => cc_default_site_url(), 'admin_user' => 'admin',
    'admin_pass' => '', 'admin_pass2' => '', 'admin_email' => '', 'starter' => '',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sent = (string)($_POST['csrf'] ?? '');
    if ($sent === '' || !hash_equals($csrf, $sent)) {
        http_response_code(403);
        $view = $state === 'installed' ? 'installed' : 'form';
        $notice = 'Your session expired. Please submit the form again.';
    } elseif (($_POST['action'] ?? '') === 'delete_installer') {
        // Allowed only once installation is complete: removes this file from the server.
        if ($state === 'installed') {
            $view = @unlink(__FILE__) ? 'deleted' : 'installed';
            if ($view !== 'deleted') $notice = 'install.php could not be deleted automatically. Remove it from the server manually.';
        }
    } elseif ($state === 'fresh') {
        foreach (array_keys($in) as $k) $in[$k] = is_string($_POST[$k] ?? null) ? $_POST[$k] : '';
        foreach (['site_name', 'site_url', 'admin_user', 'admin_email', 'starter'] as $k) $in[$k] = trim($in[$k]);

        if (cc_has_failures($reqs)) {
            $notice = 'Fix the failed requirements before installing.';
        } else {
            $errors = cc_install_validate($in, $starters);
            if (!$errors) {
                try {
                    $page_created = cc_run_install($db_file, $data_dir, $in, $starters);
                    cc_install_login($in['admin_user']);
                    $view = 'done';
                } catch (Exception $e) {
                    error_log('CanvasCore install: ' . $e->getMessage());
                    $notice = 'Installation failed: ' . $e->getMessage();
                }
            }
        }
    }
}

// Passwords are never sent back to the browser.
$in['admin_pass'] = $in['admin_pass2'] = '';
$version = cc_version()['app'];
$has_failures = cc_has_failures($reqs);
$editor_exists = file_exists(__DIR__ . '/index.html');

$field = function ($name, $label, $type = 'text', $attrs = '', $hint = '') use ($in, $errors) {
    $e = $errors[$name] ?? '';
    $val = $type === 'password' ? '' : $in[$name];
    return '<label class="field' . ($e ? ' has-error' : '') . '"><span>' . h($label) . '</span>'
        . '<input type="' . h($type) . '" name="' . h($name) . '" value="' . h($val) . '" ' . $attrs
        . ($e ? ' aria-invalid="true"' : '') . '>'
        . ($e ? '<small class="error">' . h($e) . '</small>' : ($hint ? '<small>' . h($hint) . '</small>' : ''))
        . '</label>';
};
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>CanvasCore setup</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #0f172a; color: #e2e8f0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; padding: 40px 16px; }
  .wrap { max-width: 640px; margin: 0 auto; }
  .brand { display: flex; align-items: baseline; gap: 10px; margin-bottom: 24px; }
  .brand h1 { margin: 0; font-size: 24px; color: #fff; }
  .brand span { color: #64748b; font-size: 13px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
  .card h2 { margin: 0 0 4px; font-size: 17px; color: #fff; }
  .card > p { margin: 0 0 16px; color: #94a3b8; font-size: 14px; }
  .req { list-style: none; margin: 0; padding: 0; }
  .req li { display: grid; grid-template-columns: 22px 1fr; gap: 2px 10px; padding: 9px 0; border-top: 1px solid #334155; }
  .req li:first-child { border-top: 0; }
  .req b { font-weight: 600; color: #e2e8f0; }
  .req small { grid-column: 2; color: #94a3b8; overflow-wrap: anywhere; }
  .dot { width: 18px; height: 18px; border-radius: 50%; display: inline-grid; place-items: center; font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .ok .dot { background: #4ade80; } .warn .dot { background: #fbbf24; } .fail .dot { background: #f87171; }
  .field { display: block; margin-bottom: 14px; }
  .field span { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #cbd5e1; }
  .field input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; font: inherit; }
  .field input:focus { outline: 2px solid #3b82f6; outline-offset: 1px; border-color: #3b82f6; }
  .field small { display: block; margin-top: 5px; color: #94a3b8; font-size: 12px; }
  .field.has-error input { border-color: #f87171; }
  .field small.error { color: #fca5a5; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
  @media (max-width: 520px) { .row { grid-template-columns: 1fr; } }
  .starters { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .starter { display: block; position: relative; border: 1px solid #475569; border-radius: 10px; padding: 12px; cursor: pointer; background: #0f172a; }
  .starter input { position: absolute; opacity: 0; }
  .starter strong { display: block; color: #fff; font-size: 14px; }
  .starter small { color: #94a3b8; font-size: 12px; }
  .starter:has(input:checked) { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
  .starter:has(input:focus-visible) { outline: 2px solid #3b82f6; outline-offset: 2px; }
  .btn { display: inline-block; padding: 12px 20px; border-radius: 8px; border: 0; background: #3b82f6; color: #fff; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; }
  .btn:hover { background: #2563eb; }
  .btn[disabled] { background: #334155; color: #64748b; cursor: not-allowed; }
  .btn.secondary { background: transparent; border: 1px solid #475569; color: #e2e8f0; }
  .btn.danger { background: #b91c1c; } .btn.danger:hover { background: #991b1b; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .notice { padding: 12px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; background: #451a03; border: 1px solid #b45309; color: #fde68a; }
  .notice.ok { background: #052e16; border-color: #15803d; color: #bbf7d0; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  code { background: #0f172a; padding: 1px 6px; border-radius: 4px; font-size: 13px; }
  ol.steps { margin: 0; padding-left: 20px; color: #cbd5e1; } ol.steps li { margin-bottom: 6px; }
</style>
</head>
<body>
<main class="wrap">
  <div class="brand"><h1>CanvasCore</h1><span>Setup · v<?= h($version) ?></span></div>

  <?php if ($notice): ?><div class="notice" role="alert"><?= h($notice) ?></div><?php endif; ?>

  <?php if ($view === 'done'): ?>
    <div class="notice ok" role="status">CanvasCore is installed and you are signed in as <strong><?= h($in['admin_user']) ?></strong>.</div>
    <section class="card">
      <h2>Next steps</h2>
      <ol class="steps">
        <?php if ($page_created): ?><li>Open <strong>Home</strong> in the page list and press <strong>Publish</strong> to put it online.</li><?php else: ?><li>Create your first page and press <strong>Publish</strong>.</li><?php endif; ?>
        <li>Review the remaining options under <strong>Settings</strong> (brand color, fonts, form email).</li>
        <li>Delete this installer from the server.</li>
      </ol>
    </section>
    <form method="post" class="actions">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="action" value="delete_installer">
      <?php if ($editor_exists): ?><a class="btn" href="index.html">Open the editor</a><?php endif; ?>
      <button class="btn danger" type="submit">Delete install.php</button>
    </form>

  <?php elseif ($view === 'deleted'): ?>
    <div class="notice ok" role="status">install.php has been deleted.</div>
    <?php if ($editor_exists): ?><a class="btn" href="index.html">Open the editor</a><?php endif; ?>

  <?php elseif ($view === 'installed'): ?>
    <section class="card">
      <h2>Already installed</h2>
      <p>CanvasCore is already set up on this server, so the installer is locked. For safety, delete <code>install.php</code>.</p>
      <form method="post" class="actions">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <input type="hidden" name="action" value="delete_installer">
        <?php if ($editor_exists): ?><a class="btn secondary" href="index.html">Open the editor</a><?php endif; ?>
        <button class="btn danger" type="submit">Delete install.php</button>
      </form>
    </section>

  <?php elseif ($view === 'error'): ?>
    <section class="card">
      <h2>Database unreadable</h2>
      <p>A database exists at <code><?= h($db_file) ?></code> but it could not be opened. Check its permissions, or move it away to start a fresh installation.</p>
    </section>

  <?php else: ?>
    <section class="card">
      <h2>1. Server check</h2>
      <p><?= $has_failures ? 'Fix the items marked in red, then reload this page.' : 'Your server can run CanvasCore. Items in yellow are worth a look but do not block the installation.' ?></p>
      <ul class="req">
        <?php foreach ($reqs as [$label, $status, $detail]): ?>
          <li class="<?= h($status) ?>"><span class="dot" aria-hidden="true"><?= $status === 'ok' ? '✓' : ($status === 'warn' ? '!' : '✕') ?></span>
            <b><?= h($label) ?><span class="sr"> — <?= h($status) ?></span></b><small><?= h($detail) ?></small></li>
        <?php endforeach; ?>
      </ul>
    </section>

    <form method="post" novalidate>
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <section class="card">
        <h2>2. Your site</h2>
        <p>You can change these later in Settings.</p>
        <?= $field('site_name', 'Site name', 'text', 'required maxlength="120" autocomplete="organization"') ?>
        <?= $field('site_url', 'Site address', 'url', 'placeholder="https://www.example.com" inputmode="url"', 'Used for the sitemap and social previews. Detected from this request.') ?>
      </section>

      <section class="card">
        <h2>3. Administrator account</h2>
        <p>Replaces the default <code>admin</code> / <code>admin</code> login.</p>
        <?= $field('admin_user', 'Username', 'text', 'required minlength="3" maxlength="32" autocomplete="username" autocapitalize="none" spellcheck="false"') ?>
        <div class="row">
          <?= $field('admin_pass', 'Password', 'password', 'required minlength="8" autocomplete="new-password"', 'At least 8 characters.') ?>
          <?= $field('admin_pass2', 'Repeat password', 'password', 'required minlength="8" autocomplete="new-password"') ?>
        </div>
        <?= $field('admin_email', 'Email for form submissions (optional)', 'email', 'autocomplete="email"', 'Where contact form messages are sent.') ?>
      </section>

      <?php if ($starters): ?>
      <section class="card">
        <h2>4. Homepage</h2>
        <p>Optionally start with a ready-made homepage. It is created as a draft for you to edit and publish.</p>
        <?php if (!empty($errors['starter'])): ?><div class="notice" role="alert"><?= h($errors['starter']) ?></div><?php endif; ?>
        <div class="starters">
          <label class="starter"><input type="radio" name="starter" value="" <?= $in['starter'] === '' ? 'checked' : '' ?>><strong>No page</strong><small>Start with an empty site.</small></label>
          <?php foreach ($starters as $s): if (!isset($s['id'])) continue; ?>
            <label class="starter"><input type="radio" name="starter" value="<?= h($s['id']) ?>" <?= $in['starter'] === $s['id'] ? 'checked' : '' ?>><strong><?= h($s['name'] ?? $s['id']) ?></strong><small><?= h($s['description'] ?? '') ?></small></label>
          <?php endforeach; ?>
        </div>
      </section>
      <?php endif; ?>

      <div class="actions">
        <button class="btn" type="submit" <?= $has_failures ? 'disabled' : '' ?>>Install CanvasCore</button>
      </div>
    </form>
  <?php endif; ?>
</main>
</body>
</html>
