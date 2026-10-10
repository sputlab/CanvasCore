<?php
// canvascore-admin/api.php
// CanvasCore — API backend (Fase 1: CSRF, sessione blindata, data fuori webroot, hardening)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/migrations.php';
header('Content-Type: application/json');
header('Cache-Control: no-store');

$data_dir = cc_data_dir();
$db_file = $data_dir . '/canvascore.sqlite';

try {
    $pdo = new PDO("sqlite:" . $db_file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Migrazioni schema versionate (nuove ed esistenti) + migrazioni contenuto.
    cc_migrate($pdo);
    cc_migrate_content($pdo);
} catch (Exception $e) {
    die(json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]));
}

$action = $_GET['action'] ?? '';

// Una POST senza sessione valida e' "non autenticata" (401), NON "CSRF errato" (403): cosi' il client
// distingue sempre una sessione scaduta da un token da rinfrescare.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action !== 'login' && !cc_session_is_logged_in()) {
    cc_unauthorized();
}

// CSRF + same-origin su tutte le POST che modificano stato, eccetto il login.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action !== 'login') {
    cc_verify_csrf_or_die();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
if ($action === 'version') {
    $v = cc_version();
    $v['db_schema_applied'] = (int) cc_meta_get($pdo, 'db_schema', 0);
    echo json_encode($v); exit;
}

// Stato della sessione in SOLA LETTURA: non allunga la sessione (il polling in background non deve
// impedirle di scadere per inattivita'). Rilascia subito il lock di sessione.
if ($action === 'session_status') {
    $out = [
        'authenticated' => cc_session_is_logged_in(),
        'username' => cc_session_is_logged_in() ? ($_SESSION['username'] ?? null) : null,
        'role' => cc_session_is_logged_in() ? ($_SESSION['role'] ?? null) : null,
        'expires_in' => cc_session_expires_in(),
        'timeout' => cc_session_limit(),
        'expired' => !empty($GLOBALS['CC_SESSION_EXPIRED']),
    ];
    session_write_close();
    echo json_encode($out); exit;
}

if ($action === 'check_auth') {
    $is_logged = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    $mcp = 0;
    if ($is_logged) {
        $st = $pdo->prepare("SELECT must_change_pw FROM admin WHERE username = ?");
        $st->execute([$_SESSION['username'] ?? '']);
        $mcp = (int)($st->fetchColumn() ?: 0);
    }
    echo json_encode(['authenticated' => $is_logged, 'role' => $_SESSION['role'] ?? 'editor', 'username' => $_SESSION['username'] ?? null, 'csrf' => cc_issue_csrf(), 'must_change_pw' => $mcp, 'expires_in' => cc_session_expires_in(), 'timeout' => cc_session_limit()]);
    exit;
}

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? 'admin');
    $password = $data['password'] ?? '';
    $stmt = $pdo->prepare("SELECT password_hash, role, must_change_pw FROM admin WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password_hash'])) {
        session_regenerate_id(true); // mitigazione session fixation
        $_SESSION['logged_in'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = $user['role'];
        $_SESSION['last_seen'] = time();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        cc_issue_csrf(); // allinea il cookie double-submit al nuovo token di sessione
        echo json_encode(['success' => true, 'role' => $user['role'], 'username' => $username, 'csrf' => $_SESSION['csrf'], 'must_change_pw' => (int)($user['must_change_pw'] ?? 0), 'expires_in' => cc_session_expires_in(), 'timeout' => cc_session_limit()]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
    }
    exit;
}

if ($action === 'logout') {
    if (!headers_sent()) {
        @setcookie('cc_csrf', '', ['expires' => time() - 3600, 'path' => '/', 'samesite' => 'Lax', 'secure' => cc_is_https(), 'httponly' => false]);
    }
    unset($_COOKIE['cc_csrf']);
    session_destroy();
    echo json_encode(['success' => true]); exit;
}

// Gate: tutto ciò che segue richiede login
if (!cc_session_is_logged_in()) {
    cc_unauthorized();
}
// Da qui in poi e' attivita' dell'utente: allunga la sessione.
cc_session_touch();

// ---------------------------------------------------------------------------
// Gestione account (solo admin)
// ---------------------------------------------------------------------------
$is_admin = ($_SESSION['role'] ?? '') === 'admin';

// Keepalive: il client lo chiama (con limite di frequenza) mentre l'utente e' attivo nell'interfaccia.
// Il touch e' gia' avvenuto nel gate.
if ($action === 'keepalive') {
    echo json_encode(['success' => true, 'expires_in' => cc_session_expires_in(), 'timeout' => cc_session_limit()]); exit;
}
if (in_array($action, ['get_users', 'add_user', 'delete_user', 'force_password', 'export_site', 'import_site', 'get_submissions', 'export_submissions', 'delete_submission', 'clear_submissions']) && !$is_admin) {
    echo json_encode(['success' => false, 'message' => 'Only Admins can manage accounts.']); exit;
}

if ($action === 'get_users') {
    echo json_encode($pdo->query("SELECT id, username, role FROM admin")->fetchAll(PDO::FETCH_ASSOC)); exit;
}
if ($action === 'add_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    if ($username === '' || $password === '') { echo json_encode(['success' => false, 'message' => 'Username and password required.']); exit; }
    $chk = $pdo->prepare("SELECT COUNT(*) FROM admin WHERE username = ?"); $chk->execute([$username]);
    if ($chk->fetchColumn() > 0) { echo json_encode(['success' => false, 'message' => 'Username already exists.']); exit; }
    $role = ($data['role'] ?? '') === 'admin' ? 'admin' : 'editor';
    $pdo->prepare("INSERT INTO admin (username, password_hash, role, must_change_pw) VALUES (?, ?, ?, 1)")
        ->execute([$username, password_hash($password, PASSWORD_DEFAULT), $role]);
    echo json_encode(['success' => true, 'message' => 'User added successfully!']); exit;
}
if ($action === 'delete_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("SELECT username FROM admin WHERE id = ?"); $stmt->execute([$data['id']]);
    if ($stmt->fetchColumn() === ($_SESSION['username'] ?? null)) { echo json_encode(['success' => false, 'message' => 'You cannot delete yourself.']); exit; }
    $pdo->prepare("DELETE FROM admin WHERE id = ?")->execute([$data['id']]);
    echo json_encode(['success' => true, 'message' => 'User deleted.']); exit;
}
if ($action === 'force_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $pwd = $data['password'] ?? '';
    if (strlen($pwd) < 4) { echo json_encode(['success' => false, 'message' => 'Password too short.']); exit; }
    $pdo->prepare("UPDATE admin SET password_hash = ?, must_change_pw = 1 WHERE id = ?")
        ->execute([password_hash($pwd, PASSWORD_DEFAULT), $data['id']]);
    echo json_encode(['success' => true, 'message' => 'Password updated.']); exit;
}

// Cambio password del PROPRIO account (qualsiasi ruolo) + azzera il flag must_change_pw
if ($action === 'change_own_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $pwd = $data['password'] ?? '';
    if (strlen($pwd) < 8) { echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters.']); exit; }
    if ($pwd === 'admin') { echo json_encode(['success' => false, 'message' => 'Please choose a different password.']); exit; }
    $pdo->prepare("UPDATE admin SET password_hash = ?, must_change_pw = 0 WHERE username = ?")
        ->execute([password_hash($pwd, PASSWORD_DEFAULT), $_SESSION['username'] ?? '']);
    echo json_encode(['success' => true, 'message' => 'Password changed.']); exit;
}

// ---------------------------------------------------------------------------
// Media (upload con whitelist + protezione esecuzione)
// ---------------------------------------------------------------------------
$uploads_dir = __DIR__ . '/../uploads';
if ($action === 'upload_media' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!is_dir($uploads_dir)) mkdir($uploads_dir, 0755, true);
    // Blocca l'esecuzione di PHP nella cartella uploads (Apache)
    ensure_htaccess($uploads_dir, $GLOBALS['CC_HT_UPLOADS']);

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $orig = basename($_FILES['file']['name']);
        $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp','avif','svg','ico','bmp'];
        if (!in_array($ext, $allowed, true)) {
            echo json_encode(['success' => false, 'message' => 'File type not allowed. Only images are accepted.']); exit;
        }
        // Per i formati raster verifichiamo che sia davvero un'immagine
        if (!in_array($ext, ['svg','ico'], true)) {
            if (@getimagesize($_FILES['file']['tmp_name']) === false) {
                echo json_encode(['success' => false, 'message' => 'The file is not a valid image.']); exit;
            }
        }
        $safe = preg_replace('/[^a-zA-Z0-9._-]/', '', $orig);
        $fname = time() . '_' . $safe;
        $target = $uploads_dir . '/' . $fname;
        if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
            $base_dir = dirname($_SERVER['SCRIPT_NAME'], 2);
            if ($base_dir === '\\' || $base_dir === '/') $base_dir = '';
            echo json_encode(['success' => true, 'message' => 'Uploaded successfully.', 'url' => $base_dir . '/uploads/' . $fname, 'filename' => $fname]);
        } else { echo json_encode(['success' => false, 'message' => 'Cannot move the uploaded file.']); }
    } else { echo json_encode(['success' => false, 'message' => 'No file received or upload error.']); }
    exit;
}
if ($action === 'get_media') {
    if (!is_dir($uploads_dir)) mkdir($uploads_dir, 0755, true);
    $base_dir = dirname($_SERVER['SCRIPT_NAME'], 2);
    if ($base_dir === '\\' || $base_dir === '/') $base_dir = '';
    $base_url = $base_dir . '/uploads/';
    $files = array_diff(scandir($uploads_dir), array('.', '..', '.htaccess'));
    $media = [];
    foreach ($files as $f) if (is_file($uploads_dir . '/' . $f)) $media[] = ['name' => $f, 'url' => $base_url . $f];
    echo json_encode($media); exit;
}
if ($action === 'delete_media' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $filename = basename($data['name'] ?? '');
    if ($filename && $filename !== '.htaccess' && file_exists($uploads_dir . '/' . $filename)) unlink($uploads_dir . '/' . $filename);
    echo json_encode(['success' => true, 'message' => 'Image deleted.']); exit;
}

// ---------------------------------------------------------------------------
// Settings (JSON validato)
// ---------------------------------------------------------------------------
if ($action === 'get_settings') {
    $file = $data_dir . '/settings.json';
    echo file_exists($file) ? file_get_contents($file) : json_encode(new stdClass()); exit;
}
if ($action === 'save_settings' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    if ($decoded === null) { echo json_encode(['success' => false, 'message' => 'Invalid settings payload.']); exit; }
    if (isset($decoded['sessionTimeoutMinutes'])) {
        $decoded['sessionTimeoutMinutes'] = max(5, min(720, (int)$decoded['sessionTimeoutMinutes']));
    }
    file_put_contents($data_dir . '/settings.json', json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true, 'message' => 'Settings saved!']); exit;
}

// ---------------------------------------------------------------------------
// Pagine — modello draft/published
// ---------------------------------------------------------------------------
// Imposta la homepage in modo esclusivo (una sola pagina puo' essere home).
function apply_home($pdo, $primaryId, $val) {
    if (!$primaryId) return;
    if ($val) {
        $pdo->exec("UPDATE pages SET is_home = 0 WHERE is_draft_copy = 0");
        $pdo->prepare("UPDATE pages SET is_home = 1 WHERE id = ?")->execute([$primaryId]);
    } else {
        $pdo->prepare("UPDATE pages SET is_home = 0 WHERE id = ?")->execute([$primaryId]);
    }
}

// Aggiorna i link interni quando cambia lo slug di una pagina pubblicata.
function relink_slug_change($pdo, $data_dir, $old_slug, $new_slug) {
    if (!$old_slug || $old_slug === $new_slug) return;
    $old_url = $old_slug . '/index.html';
    $new_url = $new_slug . '/index.html';
    $pairs = [
        ['"url":"' . $old_url . '"', '"url":"' . $new_url . '"'],
        ['"btnUrl":"' . $old_url . '"', '"btnUrl":"' . $new_url . '"'],
    ];
    $up = $pdo->prepare("UPDATE pages SET content_json = REPLACE(content_json, ?, ?)");
    foreach ($pairs as $p) { $up->execute([$p[0], $p[1]]); }

    $menu_file = $data_dir . '/menu.json';
    if (file_exists($menu_file)) {
        $menu = file_get_contents($menu_file);
        $menu = str_replace('"url":"' . $old_url . '"', '"url":"' . $new_url . '"', $menu);
        file_put_contents($menu_file, $menu);
    }
}

if ($action === 'get_pages') {
    $rows = $pdo->query("SELECT * FROM pages WHERE is_draft_copy = 0 ORDER BY updated_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    $copyStmt = $pdo->prepare("SELECT * FROM pages WHERE parent_id = ? AND is_draft_copy = 1 ORDER BY updated_at DESC LIMIT 1");
    foreach ($rows as &$r) {
        if (($r['status'] ?? '') === 'modified') {
            $copyStmt->execute([$r['id']]);
            $copy = $copyStmt->fetch(PDO::FETCH_ASSOC);
            if ($copy) { $copy['is_home'] = $r['is_home']; $r['draft_copy'] = $copy; }
        }
    }
    echo json_encode($rows); exit;
}

if ($action === 'save_page' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $id          = $data['id'];
    $title       = $data['title'] ?? 'Untitled';
    $clean       = sanitize_slug($data['slug'] ?? '');
    $seo_title   = $data['seo_title'] ?? '';
    $seo_desc    = $data['seo_description'] ?? '';
    $seo_image   = $data['seo_image'] ?? '';
    $layout      = $data['layout'] ?? 'boxed';
    $bg_color    = $data['bg_color'] ?? '#ffffff';
    $boxed_width = $data['boxed_width'] ?? '1200px';
    // Gli utenti non-admin non possono salvare superfici "codice" (HTML block / custom CSS).
    if (!$is_admin && isset($data['blocks']) && is_array($data['blocks'])) {
        cc_strip_code_surfaces($data['blocks']);
    }
    $content     = isset($data['blocks']) ? json_encode($data['blocks']) : '[]';
    $publish     = !empty($data['publish']);
    $is_home     = !empty($data['is_home']) ? 1 : 0;
    $author      = $_SESSION['username'] ?? 'admin';
    $now         = date('Y-m-d H:i:s');

    $cur = $pdo->prepare("SELECT * FROM pages WHERE id = ?"); $cur->execute([$id]);
    $existing = $cur->fetch(PDO::FETCH_ASSOC);

    $cschema = cc_version()['content_schema'];
    $writeRow = function ($targetId, $status, $isCopy, $parentId) use ($pdo, $title, $clean, $seo_title, $seo_desc, $seo_image, $layout, $bg_color, $boxed_width, $content, $author, $now, $cschema) {
        $chk = $pdo->prepare("SELECT id FROM pages WHERE id = ?"); $chk->execute([$targetId]);
        if ($chk->fetch()) {
            $pdo->prepare("UPDATE pages SET parent_id=?, title=?, slug=?, clean_slug=?, seo_title=?, seo_description=?, seo_image=?, layout=?, bg_color=?, boxed_width=?, content_json=?, status=?, is_draft_copy=?, content_schema=?, author=?, updated_at=? WHERE id=?")
                ->execute([$parentId, $title, $clean, $clean, $seo_title, $seo_desc, $seo_image, $layout, $bg_color, $boxed_width, $content, $status, $isCopy, $cschema, $author, $now, $targetId]);
        } else {
            $pdo->prepare("INSERT INTO pages (id, parent_id, title, slug, clean_slug, seo_title, seo_description, seo_image, layout, bg_color, boxed_width, content_json, status, is_draft_copy, content_schema, author, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$targetId, $parentId, $title, $clean, $clean, $seo_title, $seo_desc, $seo_image, $layout, $bg_color, $boxed_width, $content, $status, $isCopy, $cschema, $author, $now]);
        }
    };

    if ($publish) {
        if ($existing && (int)($existing['is_draft_copy'] ?? 0) === 1) {
            // Promuovi la copia-bozza sulla pagina madre pubblicata
            $parentId = $existing['parent_id'];
            $parentRow = $pdo->prepare("SELECT clean_slug FROM pages WHERE id = ?"); $parentRow->execute([$parentId]);
            $old = $parentRow->fetch(PDO::FETCH_ASSOC);
            $writeRow($parentId, 'published', 0, null);
            if ($old) relink_slug_change($pdo, $data_dir, $old['clean_slug'] ?? null, $clean);
            $pdo->prepare("DELETE FROM pages WHERE id = ?")->execute([$id]); // rimuove la copia
            apply_home($pdo, $parentId, $is_home);
            echo json_encode(['success' => true, 'message' => 'Page published!', 'new_id' => $parentId]); exit;
        } else {
            $oldClean = $existing['clean_slug'] ?? null;
            $writeRow($id, 'published', 0, null);
            relink_slug_change($pdo, $data_dir, $oldClean, $clean);
            apply_home($pdo, $id, $is_home);
            echo json_encode(['success' => true, 'message' => 'Page published!', 'new_id' => $id]); exit;
        }
    }

    // --- Salvataggio bozza ---
    if (!$existing) {
        // Pagina nuova: resta bozza con il suo stesso id
        $writeRow($id, 'draft', 0, null);
        apply_home($pdo, $id, $is_home);
        echo json_encode(['success' => true, 'message' => 'Draft saved!', 'new_id' => $id]); exit;
    }
    if ((int)($existing['is_draft_copy'] ?? 0) === 1) {
        // Sto già editando una copia-bozza: aggiorno in place
        $writeRow($id, 'draft', 1, $existing['parent_id']);
        apply_home($pdo, $existing['parent_id'], $is_home);
        echo json_encode(['success' => true, 'message' => 'Draft saved!', 'new_id' => $id]); exit;
    }
    if (($existing['status'] ?? '') === 'published') {
        // Pagina live modificata: creo una copia-bozza nascosta, la live resta intatta
        $copyId = 'draft-' . uniqid();
        $writeRow($copyId, 'draft', 1, $id);
        $pdo->prepare("UPDATE pages SET status='modified', updated_at=? WHERE id=?")->execute([$now, $id]);
        apply_home($pdo, $id, $is_home);
        echo json_encode(['success' => true, 'message' => 'Draft saved!', 'new_id' => $copyId]); exit;
    }
    // Bozza / draft_new primaria: aggiorno in place
    $writeRow($id, 'draft', 0, null);
    apply_home($pdo, $id, $is_home);
    echo json_encode(['success' => true, 'message' => 'Draft saved!', 'new_id' => $id]); exit;
}

if ($action === 'discard_draft' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $parentId = json_decode(file_get_contents('php://input'), true)['id'] ?? null;
    if ($parentId) {
        $pdo->prepare("DELETE FROM pages WHERE parent_id = ? AND is_draft_copy = 1")->execute([$parentId]);
        $pdo->prepare("UPDATE pages SET status='published' WHERE id = ?")->execute([$parentId]);
    }
    echo json_encode(['success' => true]); exit;
}

if ($action === 'delete_page' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = json_decode(file_get_contents('php://input'), true)['id'] ?? null;
    if ($id) {
        $row = $pdo->prepare("SELECT clean_slug, is_draft_copy FROM pages WHERE id = ?"); $row->execute([$id]);
        $p = $row->fetch(PDO::FETCH_ASSOC);
        if ($p && (int)$p['is_draft_copy'] === 0) {
            // Rimuove l'HTML generato sul disco
            $slug = sanitize_slug($p['clean_slug'] ?? 'index');
            if ($slug === 'index' || $slug === 'home') {
                @unlink(__DIR__ . '/../index.html');
            } else {
                @unlink(__DIR__ . '/../' . $slug . '/index.html');
                @rmdir(__DIR__ . '/../' . $slug);
            }
            $pdo->prepare("DELETE FROM pages WHERE parent_id = ?")->execute([$id]); // elimina le copie
        }
        $pdo->prepare("DELETE FROM pages WHERE id = ?")->execute([$id]);
    }
    echo json_encode(['success' => true]); exit;
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
if ($action === 'preview_menu' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once __DIR__ . '/compiler.php';
    $payload = file_get_contents('php://input');
    $sfile = $data_dir . '/settings.json';
    $gset = file_exists($sfile) ? json_decode(file_get_contents($sfile), true) : [];
    $html = render_menu_html($payload, ['preview' => true, 'inheritTheme' => !empty($gset['menuInheritTheme'])]);
    $html = str_replace('{{BASE_URL}}', '#', $html); // link inerti nell'anteprima
    echo json_encode(['success' => true, 'html' => $html]); exit;
}

if ($action === 'get_menu') {
    $menu_file = $data_dir . '/menu.json';
    echo file_exists($menu_file) ? file_get_contents($menu_file) : json_encode(['items' => [], 'settings' => new stdClass()]); exit;
}
if ($action === 'save_menu' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    if ($decoded === null) { echo json_encode(['success' => false, 'message' => 'Invalid menu payload.']); exit; }
    file_put_contents($data_dir . '/menu.json', json_encode($decoded, JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true, 'message' => 'Saved!']); exit;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
if ($action === 'get_submissions') {
    $rows = $pdo->query("SELECT id, form_id, page, data_json, created_at FROM form_submissions ORDER BY id DESC LIMIT 1000")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) { $r['data'] = json_decode($r['data_json'], true) ?: []; unset($r['data_json']); }
    echo json_encode($rows); exit;
}

if ($action === 'export_submissions') {
    $rows = $pdo->query("SELECT form_id, page, data_json, created_at FROM form_submissions ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
    // colonne = unione delle etichette dei campi
    $labels = [];
    foreach ($rows as $r) { $d = json_decode($r['data_json'], true) ?: []; foreach (array_keys($d) as $k) $labels[$k] = true; }
    $labels = array_keys($labels);
    $cols = array_merge(['created_at', 'form_id', 'page'], $labels);
    $out = fopen('php://temp', 'r+');
    fputcsv($out, $cols);
    foreach ($rows as $r) {
        $d = json_decode($r['data_json'], true) ?: [];
        $line = [$r['created_at'], $r['form_id'], $r['page']];
        foreach ($labels as $l) $line[] = $d[$l] ?? '';
        fputcsv($out, $line);
    }
    rewind($out); $csv = stream_get_contents($out); fclose($out);
    echo json_encode(['success' => true, 'csv' => $csv]); exit;
}

if ($action === 'delete_submission' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = json_decode(file_get_contents('php://input'), true)['id'] ?? null;
    if ($id) $pdo->prepare("DELETE FROM form_submissions WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]); exit;
}

if ($action === 'clear_submissions' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $pdo->exec("DELETE FROM form_submissions");
    echo json_encode(['success' => true]); exit;
}

// ---- Collezioni (gestione: admin) ----
if ($action === 'get_collections') {
    echo json_encode($pdo->query("SELECT id, name, slug, (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) AS item_count FROM collections c ORDER BY name")->fetchAll(PDO::FETCH_ASSOC)); exit;
}
if ($action === 'save_collection' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$is_admin) { echo json_encode(['success' => false, 'message' => 'Only admins can manage collections.']); exit; }
    $d = json_decode(file_get_contents('php://input'), true);
    $id = $d['id'] ?? ('col_' . uniqid());
    $name = trim($d['name'] ?? 'Collection');
    $slug = cc_safe_slug($d['slug'] ?? $name);
    $chk = $pdo->prepare("SELECT id FROM collections WHERE id = ?"); $chk->execute([$id]);
    if ($chk->fetch()) $pdo->prepare("UPDATE collections SET name=?, slug=? WHERE id=?")->execute([$name, $slug, $id]);
    else $pdo->prepare("INSERT INTO collections (id, name, slug) VALUES (?,?,?)")->execute([$id, $name, $slug]);
    echo json_encode(['success' => true, 'id' => $id, 'slug' => $slug]); exit;
}
if ($action === 'delete_collection' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$is_admin) { echo json_encode(['success' => false, 'message' => 'Only admins can manage collections.']); exit; }
    $id = json_decode(file_get_contents('php://input'), true)['id'] ?? '';
    $pdo->prepare("DELETE FROM collection_items WHERE collection_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM collections WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]); exit;
}

// ---- Voci delle collezioni (contenuto: qualsiasi utente loggato) ----
if ($action === 'get_items') {
    $cid = $_GET['collection'] ?? '';
    $st = $pdo->prepare("SELECT id, collection_id, title, slug, excerpt, cover_image, date, status, archived, updated_at FROM collection_items WHERE collection_id = ? ORDER BY (date = '') ASC, date DESC, updated_at DESC");
    $st->execute([$cid]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) { $r['archived'] = (int)($r['archived'] ?? 0); }
    unset($r);
    echo json_encode($rows); exit;
}
if ($action === 'get_item') {
    $st = $pdo->prepare("SELECT * FROM collection_items WHERE id = ?");
    $st->execute([$_GET['id'] ?? '']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if ($row) $row['archived'] = (int)($row['archived'] ?? 0);
    echo json_encode($row ?: null); exit;
}
if ($action === 'save_item' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    $id = $d['id'] ?? ('item_' . uniqid());
    $cid = $d['collection_id'] ?? '';
    $title = trim($d['title'] ?? 'Untitled');
    $slug = cc_safe_slug($d['slug'] ?? $title);
    $excerpt = $d['excerpt'] ?? '';
    $cover = $d['cover_image'] ?? '';
    $date = $d['date'] ?? '';
    $status = ($d['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
    $archived_sent = array_key_exists('archived', $d);
    $archived = (!empty($d['archived']) && $d['archived'] !== '0') ? 1 : 0;
    $seo_t = $d['seo_title'] ?? '';
    $seo_d = $d['seo_description'] ?? '';
    $blocks = isset($d['blocks']) && is_array($d['blocks']) ? $d['blocks'] : null;
    $cschema = cc_version()['content_schema'];
    $now = date('Y-m-d H:i:s');

    $chk = $pdo->prepare("SELECT id, archived FROM collection_items WHERE id = ?"); $chk->execute([$id]);
    $existing_item = $chk->fetch(PDO::FETCH_ASSOC);
    if ($existing_item) {
        // Un client che non invia il flag non deve mai azzerarlo: si conserva il valore salvato
        if (!$archived_sent) $archived = (int)($existing_item['archived'] ?? 0);
        if ($blocks !== null) {
            if (!$is_admin) cc_strip_code_surfaces($blocks);
            $pdo->prepare("UPDATE collection_items SET collection_id=?, title=?, slug=?, excerpt=?, cover_image=?, date=?, status=?, archived=?, seo_title=?, seo_description=?, content_json=?, content_schema=?, updated_at=? WHERE id=?")
                ->execute([$cid, $title, $slug, $excerpt, $cover, $date, $status, $archived, $seo_t, $seo_d, json_encode($blocks), $cschema, $now, $id]);
        } else {
            $pdo->prepare("UPDATE collection_items SET collection_id=?, title=?, slug=?, excerpt=?, cover_image=?, date=?, status=?, archived=?, seo_title=?, seo_description=?, updated_at=? WHERE id=?")
                ->execute([$cid, $title, $slug, $excerpt, $cover, $date, $status, $archived, $seo_t, $seo_d, $now, $id]);
        }
    } else {
        $b = $blocks ?? [];
        if (!$is_admin) cc_strip_code_surfaces($b);
        $pdo->prepare("INSERT INTO collection_items (id, collection_id, title, slug, excerpt, cover_image, date, status, archived, seo_title, seo_description, content_json, content_schema, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$id, $cid, $title, $slug, $excerpt, $cover, $date, $status, $archived, $seo_t, $seo_d, json_encode($b), $cschema, $now]);
    }
    echo json_encode(['success' => true, 'id' => $id]); exit;
}
if ($action === 'delete_item' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = json_decode(file_get_contents('php://input'), true)['id'] ?? '';
    $pdo->prepare("DELETE FROM collection_items WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]); exit;
}

if ($action === 'get_parts') {
    $out = ['header' => [], 'footer' => []];
    try {
        foreach ($pdo->query("SELECT name, content_json FROM site_parts") as $row) {
            $out[$row['name']] = json_decode($row['content_json'], true) ?: [];
        }
    } catch (Exception $e) {}
    echo json_encode($out); exit;
}

if ($action === 'save_part' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = ($data['name'] ?? '') === 'footer' ? 'footer' : 'header';
    $blocks = isset($data['blocks']) && is_array($data['blocks']) ? $data['blocks'] : [];
    if (!$is_admin) cc_strip_code_surfaces($blocks); // editor: niente blocchi "codice"
    $pdo->prepare("INSERT INTO site_parts (name, content_json, content_schema) VALUES (?, ?, ?)
                   ON CONFLICT(name) DO UPDATE SET content_json = excluded.content_json, content_schema = excluded.content_schema")
        ->execute([$name, json_encode($blocks), cc_version()['content_schema']]);
    echo json_encode(['success' => true, 'message' => ucfirst($name) . ' saved!']); exit;
}

if ($action === 'delete_part' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = json_decode(file_get_contents('php://input'), true)['name'] ?? '';
    if (in_array($name, ['header', 'footer'], true)) {
        $pdo->prepare("DELETE FROM site_parts WHERE name = ?")->execute([$name]);
    }
    echo json_encode(['success' => true]); exit;
}

if ($action === 'get_starters') {
    $file = __DIR__ . '/starters.json';
    echo file_exists($file) ? file_get_contents($file) : json_encode([]);
    exit;
}

if ($action === 'export_site') {
    $pages = $pdo->query("SELECT id, parent_id, title, slug, clean_slug, seo_title, seo_description, seo_image, layout, bg_color, boxed_width, content_json, status, is_home, content_schema, author, updated_at FROM pages WHERE is_draft_copy = 0")->fetchAll(PDO::FETCH_ASSOC);
    $masters = $pdo->query("SELECT id, name, content_json FROM master_components")->fetchAll(PDO::FETCH_ASSOC);
    $templates = $pdo->query("SELECT id, name, content_json FROM templates")->fetchAll(PDO::FETCH_ASSOC);
    $parts = [];
    try { foreach ($pdo->query("SELECT name, content_json FROM site_parts") as $r) $parts[$r['name']] = json_decode($r['content_json'], true) ?: []; } catch (Exception $e) {}
    $menu = file_exists($data_dir . '/menu.json') ? json_decode(file_get_contents($data_dir . '/menu.json'), true) : new stdClass();
    $settings = file_exists($data_dir . '/settings.json') ? json_decode(file_get_contents($data_dir . '/settings.json'), true) : new stdClass();
    $media = [];
    $updir = __DIR__ . '/../uploads';
    if (is_dir($updir)) foreach (array_diff(scandir($updir), ['.', '..', '.htaccess']) as $f) if (is_file($updir . '/' . $f)) $media[] = $f;
    $v = cc_version();
    echo json_encode([
        'canvascore' => true, 'app' => $v['app'], 'content_schema' => $v['content_schema'], 'exported_at' => date('c'),
        'pages' => $pages, 'masters' => $masters, 'templates' => $templates, 'menu' => $menu, 'settings' => $settings, 'parts' => $parts, 'media_manifest' => $media,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($action === 'import_site' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $bundle = json_decode(file_get_contents('php://input'), true);
    if (!is_array($bundle) || empty($bundle['canvascore'])) {
        echo json_encode(['success' => false, 'message' => 'Not a valid CanvasCore export file.']); exit;
    }
    try {
        $pdo->beginTransaction();
        $pdo->exec("DELETE FROM pages");
        $pdo->exec("DELETE FROM master_components");
        $pdo->exec("DELETE FROM templates");
        $cschema = cc_version()['content_schema'];
        $pins = $pdo->prepare("INSERT INTO pages (id, parent_id, title, slug, clean_slug, seo_title, seo_description, seo_image, layout, bg_color, boxed_width, content_json, status, is_draft_copy, is_home, content_schema, author, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?)");
        foreach (($bundle['pages'] ?? []) as $pg) {
            $cj = is_string($pg['content_json'] ?? '[]') ? ($pg['content_json'] ?? '[]') : json_encode($pg['content_json']);
            $slug = cc_safe_slug($pg['clean_slug'] ?? $pg['slug'] ?? 'index');
            $pins->execute([$pg['id'] ?? ('page-' . uniqid()), null, $pg['title'] ?? 'Untitled', $slug, $slug, $pg['seo_title'] ?? '', $pg['seo_description'] ?? '', $pg['seo_image'] ?? '', $pg['layout'] ?? 'boxed', $pg['bg_color'] ?? '#ffffff', $pg['boxed_width'] ?? '1200px', $cj, $pg['status'] ?? 'published', (int)($pg['is_home'] ?? 0), (int)($pg['content_schema'] ?? $cschema), $pg['author'] ?? 'admin', date('Y-m-d H:i:s')]);
        }
        $mins = $pdo->prepare("INSERT INTO master_components (id, name, content_json) VALUES (?,?,?)");
        foreach (($bundle['masters'] ?? []) as $m) $mins->execute([$m['id'] ?? uniqid('master-'), htmlspecialchars($m['name'] ?? 'Master'), is_string($m['content_json'] ?? '{}') ? $m['content_json'] : json_encode($m['content_json'])]);
        $tins = $pdo->prepare("INSERT INTO templates (id, name, content_json) VALUES (?,?,?)");
        foreach (($bundle['templates'] ?? []) as $t) $tins->execute([$t['id'] ?? uniqid('tpl_'), htmlspecialchars($t['name'] ?? 'Template'), is_string($t['content_json'] ?? '{}') ? $t['content_json'] : json_encode($t['content_json'])]);
        if (isset($bundle['parts']) && is_array($bundle['parts'])) {
            $pp = $pdo->prepare("INSERT INTO site_parts (name, content_json, content_schema) VALUES (?, ?, 1) ON CONFLICT(name) DO UPDATE SET content_json = excluded.content_json");
            foreach (['header', 'footer'] as $pn) { if (isset($bundle['parts'][$pn])) $pp->execute([$pn, json_encode($bundle['parts'][$pn])]); }
        }
        if (isset($bundle['menu'])) file_put_contents($data_dir . '/menu.json', json_encode($bundle['menu'], JSON_UNESCAPED_UNICODE));
        if (isset($bundle['settings'])) file_put_contents($data_dir . '/settings.json', json_encode($bundle['settings'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $pdo->commit();
        cc_migrate_content($pdo);
        echo json_encode(['success' => true, 'message' => 'Site imported.']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Import failed: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_templates') {
    echo json_encode($pdo->query("SELECT * FROM templates ORDER BY rowid DESC")->fetchAll(PDO::FETCH_ASSOC)); exit;
}
if ($action === 'save_template' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $pdo->prepare("INSERT INTO templates (id, name, content_json) VALUES (?, ?, ?)")
        ->execute([uniqid('tpl_'), htmlspecialchars($data['name'] ?? 'Template'), $data['content_json'] ?? '{}']);
    echo json_encode(['success' => true, 'message' => 'Saved!']); exit;
}
if ($action === 'delete_template' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $pdo->prepare("DELETE FROM templates WHERE id = ?")->execute([json_decode(file_get_contents('php://input'), true)['id']]);
    echo json_encode(['success' => true]); exit;
}

// ---------------------------------------------------------------------------
// Master Components
// ---------------------------------------------------------------------------
if ($action === 'get_masters') {
    echo json_encode($pdo->query("SELECT * FROM master_components ORDER BY updated_at DESC")->fetchAll(PDO::FETCH_ASSOC)); exit;
}
if ($action === 'save_master' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];
    $name = htmlspecialchars($data['name'] ?? 'Master');
    $content_json = $data['content_json'] ?? '{}';
    if (!$is_admin) {
        $tmp = json_decode($content_json, true);
        if (is_array($tmp)) { $wrap = [$tmp]; cc_strip_code_surfaces($wrap); $content_json = json_encode($wrap[0]); }
    }

    $stmt = $pdo->prepare("SELECT id FROM master_components WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()) {
        $pdo->prepare("UPDATE master_components SET name=?, content_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")->execute([$name, $content_json, $id]);
    } else {
        $pdo->prepare("INSERT INTO master_components (id, name, content_json) VALUES (?, ?, ?)")->execute([$id, $name, $content_json]);
    }
    echo json_encode(['success' => true, 'message' => 'Master Component Saved!']); exit;
}

function purge_master_from_blocks(&$blocks, $masterId) {
    $purged = false;
    foreach ($blocks as $k => $b) {
        if (($b['type'] ?? '') === 'MASTER' && ($b['content']['masterId'] ?? '') === $masterId) {
            unset($blocks[$k]);
            $purged = true;
        } elseif (isset($b['children']) && is_array($b['children'])) {
            if (purge_master_from_blocks($blocks[$k]['children'], $masterId)) {
                $blocks[$k]['children'] = array_values($blocks[$k]['children']);
                $purged = true;
            }
        }
    }
    if ($purged) $blocks = array_values($blocks);
    return $purged;
}

if ($action === 'delete_master' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $masterId = json_decode(file_get_contents('php://input'), true)['id'];
    $pdo->prepare("DELETE FROM master_components WHERE id = ?")->execute([$masterId]);

    $pages = $pdo->query("SELECT id, content_json FROM pages")->fetchAll(PDO::FETCH_ASSOC);
    $updateStmt = $pdo->prepare("UPDATE pages SET content_json = ? WHERE id = ?");
    foreach ($pages as $page) {
        $blocks = json_decode($page['content_json'], true);
        if (is_array($blocks) && purge_master_from_blocks($blocks, $masterId)) {
            $updateStmt->execute([json_encode($blocks), $page['id']]);
        }
    }
    echo json_encode(['success' => true]); exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action.']);
