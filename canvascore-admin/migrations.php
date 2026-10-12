<?php
// canvascore-admin/migrations.php
// Runner for versioned migrations. Replaces the pile of "ALTER ... try/catch".
//
// HOW TO ADD A DB MIGRATION:
//   1. add a numbered entry to cc_db_migrations() (e.g. 2 => function($pdo){ ... });
//   2. bump "db_schema" in version.json to the new number (for consistency/display);
//   3. note the change in the CHANGELOG.
// The runner applies, in order, every migration numbered higher than the one already applied,
// recorded in the cc_meta table. Works for both new and existing installations.

require_once __DIR__ . '/config.php';

// ---- meta key/value ----
function cc_meta_get($pdo, $key, $default = null) {
    try {
        $st = $pdo->prepare("SELECT value FROM cc_meta WHERE key = ?");
        $st->execute([$key]);
        $v = $st->fetchColumn();
        return $v === false ? $default : $v;
    } catch (Exception $e) { return $default; }
}
function cc_meta_set($pdo, $key, $value) {
    $pdo->prepare("INSERT INTO cc_meta (key, value) VALUES (?, ?)
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        ->execute([$key, (string)$value]);
}

// ---- schema helpers (no exceptions: safe inside a transaction) ----
function cc_col_exists($pdo, $table, $col) {
    foreach ($pdo->query("PRAGMA table_info(" . $table . ")") as $c) {
        if (strcasecmp($c['name'], $col) === 0) return true;
    }
    return false;
}
function cc_add_col($pdo, $table, $col, $definition) {
    if (!cc_col_exists($pdo, $table, $col)) {
        $pdo->exec("ALTER TABLE $table ADD COLUMN $col $definition");
    }
}

// ---------------------------------------------------------------------------
// DB migrations (key = schema version number)
// ---------------------------------------------------------------------------
function cc_db_migrations() {
    return [

        // v1 — baseline: full schema. Idempotent, so it converges both new DBs
        // and legacy ones created by pre-versioning releases.
        1 => function ($pdo) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                parent_id TEXT DEFAULT NULL,
                title TEXT,
                slug TEXT,
                clean_slug TEXT,
                seo_title TEXT DEFAULT '',
                seo_description TEXT DEFAULT '',
                layout TEXT DEFAULT 'boxed',
                bg_color TEXT DEFAULT '#ffffff',
                boxed_width TEXT DEFAULT '1200px',
                content_json TEXT DEFAULT '[]',
                status TEXT DEFAULT 'draft',
                is_draft_copy INTEGER DEFAULT 0,
                is_home INTEGER DEFAULT 0,
                content_schema INTEGER DEFAULT 1,
                author TEXT DEFAULT 'admin',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, name TEXT, content_json TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT DEFAULT 'admin', must_change_pw INTEGER DEFAULT 0)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS master_components (id TEXT PRIMARY KEY, name TEXT, content_json TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

            // Columns for legacy DBs (added only if missing)
            cc_add_col($pdo, 'admin', 'username', "TEXT DEFAULT 'admin'");
            cc_add_col($pdo, 'admin', 'role', "TEXT DEFAULT 'admin'");
            cc_add_col($pdo, 'admin', 'must_change_pw', "INTEGER DEFAULT 0");
            cc_add_col($pdo, 'pages', 'parent_id', "TEXT DEFAULT NULL");
            cc_add_col($pdo, 'pages', 'clean_slug', "TEXT");
            cc_add_col($pdo, 'pages', 'seo_title', "TEXT DEFAULT ''");
            cc_add_col($pdo, 'pages', 'seo_description', "TEXT DEFAULT ''");
            cc_add_col($pdo, 'pages', 'layout', "TEXT DEFAULT 'boxed'");
            cc_add_col($pdo, 'pages', 'bg_color', "TEXT DEFAULT '#ffffff'");
            cc_add_col($pdo, 'pages', 'boxed_width', "TEXT DEFAULT '1200px'");
            cc_add_col($pdo, 'pages', 'status', "TEXT DEFAULT 'draft'");
            cc_add_col($pdo, 'pages', 'is_draft_copy', "INTEGER DEFAULT 0");
            cc_add_col($pdo, 'pages', 'is_home', "INTEGER DEFAULT 0");
            cc_add_col($pdo, 'pages', 'content_schema', "INTEGER DEFAULT 1");
            cc_add_col($pdo, 'pages', 'author', "TEXT DEFAULT 'admin'");
            // SQLite does not accept non-constant defaults in ALTER: add without a default and backfill.
            cc_add_col($pdo, 'pages', 'updated_at', "DATETIME");

            // Backfill
            $pdo->exec("UPDATE pages SET clean_slug = slug WHERE clean_slug IS NULL OR clean_slug = ''");
            $pdo->exec("UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
            $pdo->exec("UPDATE pages SET content_schema = 1 WHERE content_schema IS NULL");

            // Default admin (admin/admin) on first start + force password change
            if ((int)$pdo->query("SELECT COUNT(*) FROM admin")->fetchColumn() === 0) {
                $pdo->prepare("INSERT INTO admin (username, password_hash, role, must_change_pw) VALUES (?, ?, ?, 1)")
                    ->execute(['admin', password_hash('admin', PASSWORD_DEFAULT), 'admin']);
            }
            $def = $pdo->query("SELECT id, password_hash FROM admin WHERE username = 'admin'")->fetch(PDO::FETCH_ASSOC);
            if ($def && password_verify('admin', $def['password_hash'])) {
                $pdo->prepare("UPDATE admin SET must_change_pw = 1 WHERE id = ?")->execute([$def['id']]);
            }
        },

        // v2 — SEO (social image per page) + form submission archive
        2 => function ($pdo) {
            cc_add_col($pdo, 'pages', 'seo_image', "TEXT DEFAULT ''");
            $pdo->exec("CREATE TABLE IF NOT EXISTS form_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                form_id TEXT,
                page TEXT,
                data_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        },

        // v3 — global header/footer (blocks applied to every page)
        3 => function ($pdo) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS site_parts (name TEXT PRIMARY KEY, content_json TEXT DEFAULT '[]', content_schema INTEGER DEFAULT 1)");
        },

        // v4 — Blog / Collections (repeatable content types + items)
        4 => function ($pdo) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY, name TEXT, slug TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS collection_items (
                id TEXT PRIMARY KEY,
                collection_id TEXT,
                title TEXT,
                slug TEXT,
                excerpt TEXT DEFAULT '',
                cover_image TEXT DEFAULT '',
                date TEXT DEFAULT '',
                content_json TEXT DEFAULT '[]',
                status TEXT DEFAULT 'draft',
                content_schema INTEGER DEFAULT 1,
                seo_title TEXT DEFAULT '',
                seo_description TEXT DEFAULT '',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        },

        // v5 — archiving of items
        5 => function ($pdo) {
            cc_add_col($pdo, 'collection_items', 'archived', "INTEGER DEFAULT 0");
        },

        // v6 — revision history of pages and collection items (owner = page id, or "item:<id>")
        6 => function ($pdo) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS page_revisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner TEXT NOT NULL,
                title TEXT,
                content_json TEXT,
                kind TEXT,
                author TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_page_revisions_owner ON page_revisions(owner, id)");
        },

        // v7 — redirects of old addresses (renamed pages/items, or added by hand) and "hide from search engines"
        7 => function ($pdo) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS redirects (
                from_path TEXT PRIMARY KEY,
                to_path TEXT NOT NULL,
                auto INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            cc_add_col($pdo, 'pages', 'noindex', "INTEGER DEFAULT 0");
        },
    ];
}

// Apply all missing DB migrations. Returns the current schema version.
function cc_migrate($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS cc_meta (key TEXT PRIMARY KEY, value TEXT)");
    $applied = (int) cc_meta_get($pdo, 'db_schema', 0);

    $migrations = cc_db_migrations();
    ksort($migrations);

    foreach ($migrations as $v => $fn) {
        if ($v > $applied) {
            $pdo->beginTransaction();
            try {
                $fn($pdo);
                cc_meta_set($pdo, 'db_schema', $v);
                $pdo->commit();
                $applied = $v;
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
        }
    }
    return $applied;
}

// ---------------------------------------------------------------------------
// CONTENT migrations (format of the blocks saved in pages)
// Scaffold: empty until the block format changes (Phase 2).
// Each entry transforms the block array from (key-1) to (key).
// ---------------------------------------------------------------------------
function cc_content_migrations() {
    return [
        // 2 => function ($blocks) { /* transform and return $blocks */ return $blocks; },
    ];
}

// Update pages' content_json to the latest content versions.
function cc_migrate_content($pdo) {
    $migs = cc_content_migrations();
    if (empty($migs)) return; // no content migrations: immediate no-op
    ksort($migs);

    $rows = $pdo->query("SELECT id, content_json, content_schema FROM pages")->fetchAll(PDO::FETCH_ASSOC);
    $upd = $pdo->prepare("UPDATE pages SET content_json = ?, content_schema = ? WHERE id = ?");
    foreach ($rows as $r) {
        $v = (int)($r['content_schema'] ?? 1); if ($v < 1) $v = 1;
        $blocks = json_decode($r['content_json'] ?? '[]', true);
        if (!is_array($blocks)) continue;
        $changed = false;
        foreach ($migs as $to => $fn) {
            if ($to > $v) { $blocks = $fn($blocks); $v = $to; $changed = true; }
        }
        if ($changed) $upd->execute([json_encode($blocks), $v, $r['id']]);
    }
}
