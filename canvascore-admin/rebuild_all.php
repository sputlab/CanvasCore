<?php
// canvascore-admin/rebuild_all.php
// Generates the static HTML from the published pages. Requires login.
require_once __DIR__ . '/config.php';
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');

if (!cc_session_is_logged_in()) cc_unauthorized('Unauthorized. Please login.');
cc_session_touch();

require_once __DIR__ . '/compiler.php';

$data_dir = cc_data_dir();
$db_file = $data_dir . '/canvascore.sqlite';
if (!file_exists($db_file)) die(json_encode(['success' => false, 'message' => 'Database not found.']));

try {
    $pdo = new PDO("sqlite:" . $db_file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $base_dir = dirname($_SERVER['SCRIPT_NAME'], 2);
    if ($base_dir === '\\' || $base_dir === '/') $base_dir = '';
    $base_url = $base_dir . '/';

    // Global settings: loaded first of all (menu and header/footer read them right below).
    $settings_file = $data_dir . '/settings.json';
    $settings = file_exists($settings_file) ? json_decode(file_get_contents($settings_file), true) : [];
    if (!is_array($settings)) $settings = [];

    $menu_file = $data_dir . '/menu.json';
    $menu_json = file_exists($menu_file) ? file_get_contents($menu_file) : '{"items":[], "settings":{}}';
    $menu_html = render_menu_html($menu_json, ['inheritTheme' => !empty($settings['menuInheritTheme'])]);

    // Global header/footer (blocks applied to every page)
    $header_html = '';
    $footer_html = '';
    try {
        foreach ($pdo->query("SELECT name, content_json FROM site_parts") as $part) {
            $pblocks = json_decode($part['content_json'] ?? '[]', true);
            $phtml = '';
            if (is_array($pblocks)) foreach ($pblocks as $pb) $phtml .= render_block($pb);
            if ($part['name'] === 'header') $header_html = $phtml;
            elseif ($part['name'] === 'footer') $footer_html = $phtml;
        }
    } catch (Exception $e) {}
    if (isset($settings['headerEnabled']) && empty($settings['headerEnabled'])) $header_html = '';
    if (isset($settings['footerEnabled']) && empty($settings['footerEnabled'])) $footer_html = '';

    $brand_color = $settings['brandColor'] ?? '#3b82f6';
    $font_family = $settings['fontFamily'] ?? 'Inter';
    $site_suffix = isset($settings['siteSuffix']) ? $settings['siteSuffix'] : ' | My Site';
    $site_url     = rtrim(trim($settings['siteUrl'] ?? ''), '/');
    $site_name    = trim($settings['siteName'] ?? '');
    $favicon_url  = trim($settings['faviconUrl'] ?? '');
    $default_og   = trim($settings['defaultOgImage'] ?? '');
    $robots_allow = !isset($settings['robotsAllow']) || !empty($settings['robotsAllow']);
    $abs = function ($u) use ($site_url) {
        $u = trim((string)$u);
        if ($u === '') return '';
        if (preg_match('~^https?://~i', $u)) return $u;
        return $site_url ? $site_url . '/' . ltrim($u, '/') : $u;
    };
    $sitemap_urls = [];

    $font_url = urlencode($font_family);
    $google_fonts_link = "<link href=\"https://fonts.googleapis.com/css2?family={$font_url}:ital,wght@0,300;0,400;0,600;0,700;0,900;1,400&display=swap\" rel=\"stylesheet\">";

    $master_file = __DIR__ . '/master.html';
    if (!file_exists($master_file)) die(json_encode(['success' => false, 'message' => 'Error: master.html missing!']));
    $template = file_get_contents($master_file);
    // Block effects and button hovers (shared with the editor canvas)
    $effects_file = __DIR__ . '/effects.css';
    $template = str_replace('{{EFFECTS_CSS}}', file_exists($effects_file) ? file_get_contents($effects_file) : '', $template);

    // Only published/modified pages (the live version is always the parent row).
    $stmt = $pdo->query("SELECT * FROM pages WHERE is_draft_copy = 0 AND status IN ('published', 'modified')");
    $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $count = 0;

    // Is there an explicitly designated homepage?
    $homeExists = false;
    try {
        $homeExists = (int)$pdo->query("SELECT COUNT(*) FROM pages WHERE is_draft_copy = 0 AND is_home = 1 AND status IN ('published','modified')")->fetchColumn() > 0;
    } catch (Exception $e) { $homeExists = false; }

    foreach ($pages as $page) {
        $slug = cc_safe_slug($page['clean_slug'] ?? $page['slug'] ?? 'index');
        $title = htmlspecialchars($page['title'] ?? '');
        $seo_title = !empty($page['seo_title']) ? htmlspecialchars($page['seo_title']) : $title . $site_suffix;
        $seo_description = htmlspecialchars($page['seo_description'] ?? '');
        $page_layout = $page['layout'] ?? 'boxed';
        $page_bg = htmlspecialchars($page['bg_color'] ?? '#ffffff');
        $boxed_width = htmlspecialchars($page['boxed_width'] ?? '1200px');

        $is_home_pg = (int)($page['is_home'] ?? 0) === 1;
        $blocks = json_decode($page['content_json'] ?? '[]', true);
        $content_html = '';
        if (is_array($blocks)) {
            foreach ($blocks as $block) $content_html .= render_block($block);
        }

        $wrapper_style = $page_layout === 'boxed'
            ? "max-width: $boxed_width; margin: 0 auto; padding: 0 20px; overflow-x: clip;"
            : "overflow-x: clip;";
        $content_wrapped = $header_html . "<div style=\"$wrapper_style\">\n" . $content_html . "\n</div>" . $footer_html;
        $custom_bg_style = "<style>body { background-color: $page_bg !important; margin: 0; padding: 0; overflow-x: clip; }</style>";

        $html = str_replace('{{PAGE_TITLE}}', $seo_title, $template);
        $html = str_replace('{{META_DESCRIPTION}}', $seo_description, $html);
        $generator = '<meta name="generator" content="CanvasCore ' . htmlspecialchars(cc_version()['app']) . '">';

        // Public path of the page (for og:url and sitemap)
        $page_path = ($slug === 'index' || $slug === 'home' || $is_home_pg) ? '/' : '/' . $slug . '/';
        $page_abs  = $site_url ? $site_url . $page_path : '';
        $og_image  = $abs(!empty($page['seo_image']) ? $page['seo_image'] : $default_og);

        $seo_head  = $favicon_url ? '<link rel="icon" href="' . htmlspecialchars($abs($favicon_url)) . '">' . "\n" : '';
        $seo_head .= '<meta property="og:type" content="website">' . "\n";
        $seo_head .= '<meta property="og:title" content="' . $seo_title . '">' . "\n";
        if ($seo_description !== '') $seo_head .= '<meta property="og:description" content="' . $seo_description . '">' . "\n";
        if ($site_name !== '') $seo_head .= '<meta property="og:site_name" content="' . htmlspecialchars($site_name) . '">' . "\n";
        if ($og_image !== '') $seo_head .= '<meta property="og:image" content="' . htmlspecialchars($og_image) . '">' . "\n";
        if ($page_abs !== '') $seo_head .= '<meta property="og:url" content="' . htmlspecialchars($page_abs) . '">' . "\n";
        $seo_head .= '<meta name="twitter:card" content="' . ($og_image !== '' ? 'summary_large_image' : 'summary') . '">' . "\n";

        $html = str_replace('</head>', $custom_bg_style . "\n" . $generator . "\n" . $seo_head . "</head>", $html);

        $sitemap_urls[] = $page_abs !== '' ? $page_abs : ($base_url . ltrim($page_path, '/'));
        $html = str_replace('{{MAIN_MENU}}', $menu_html, $html);
        $html = str_replace('{{GOOGLE_FONTS}}', $google_fonts_link, $html);
        $html = str_replace('{{BRAND_COLOR}}', $brand_color, $html);
        $html = str_replace('{{FONT_FAMILY}}', $font_family, $html);
        $html = str_replace('{{PAGE_CONTENT}}', $content_wrapped, $html);
        $html = str_replace('{{BASE_URL}}', $base_url, $html);

        // Smart homepage routing:
        // - the page with is_home=1 is written to the root (index.html)
        // - without an explicit flag, the index/home slug convention still applies
        // - every non-root page still gets its own /slug/index.html folder,
        //   so any form of internal link keeps working.
        $is_home = (int)($page['is_home'] ?? 0) === 1;
        $isRootSlug = ($slug === 'index' || $slug === 'home');
        $writeRoot = $is_home || (!$homeExists && $isRootSlug);

        $targets = [];
        if ($writeRoot) $targets[] = __DIR__ . '/../index.html';
        if (!$isRootSlug) {
            $dir = __DIR__ . '/../' . $slug;
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            $targets[] = $dir . '/index.html';
        }
        if (empty($targets)) { // slug 'index'/'home' that is not home while another page is the home
            $dir = __DIR__ . '/../' . $slug;
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            $targets[] = $dir . '/index.html';
        }
        foreach ($targets as $fp) file_put_contents($fp, $html);
        $count++;
    }
    // --- Collection items: one static page per published item ---
    try {
        $cols = $pdo->query("SELECT id, slug FROM collections")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $col) {
            $col_slug = cc_safe_slug($col['slug']);
            $its = $pdo->prepare("SELECT * FROM collection_items WHERE collection_id = ? AND status = 'published'");
            $its->execute([$col['id']]);
            foreach ($its->fetchAll(PDO::FETCH_ASSOC) as $it) {
                $it_slug = cc_safe_slug($it['slug']);
                $i_title = htmlspecialchars($it['title'] ?? '');
                $i_seo_title = !empty($it['seo_title']) ? htmlspecialchars($it['seo_title']) : $i_title . $site_suffix;
                $i_seo_desc = htmlspecialchars($it['seo_description'] ?? $it['excerpt'] ?? '');
                $i_blocks = json_decode($it['content_json'] ?? '[]', true);
                $i_content = '';
                if (is_array($i_blocks)) foreach ($i_blocks as $b) $i_content .= render_block($b);
                $i_wrap = "<div style=\"max-width:1100px; margin:0 auto; padding:0 20px; overflow-x:clip;\">\n" . $i_content . "\n</div>";
                $i_full = $header_html . $i_wrap . $footer_html;

                $i_path = '/' . $col_slug . '/' . $it_slug . '/';
                $i_abs  = $site_url ? $site_url . $i_path : '';
                $og_image = $abs(!empty($it['cover_image']) ? $it['cover_image'] : $default_og);
                $i_seo_head  = $favicon_url ? '<link rel="icon" href="' . htmlspecialchars($abs($favicon_url)) . '">' . "\n" : '';
                $i_seo_head .= '<meta property="og:type" content="article">' . "\n";
                $i_seo_head .= '<meta property="og:title" content="' . $i_title . '">' . "\n";
                if ($i_seo_desc !== '') $i_seo_head .= '<meta property="og:description" content="' . $i_seo_desc . '">' . "\n";
                if ($site_name !== '') $i_seo_head .= '<meta property="og:site_name" content="' . htmlspecialchars($site_name) . '">' . "\n";
                if ($og_image !== '') $i_seo_head .= '<meta property="og:image" content="' . htmlspecialchars($og_image) . '">' . "\n";
                if ($i_abs !== '') $i_seo_head .= '<meta property="og:url" content="' . htmlspecialchars($i_abs) . '">' . "\n";
                $i_seo_head .= '<meta name="twitter:card" content="' . ($og_image !== '' ? 'summary_large_image' : 'summary') . '">' . "\n";

                $ihtml = str_replace('{{PAGE_TITLE}}', $i_seo_title, $template);
                $ihtml = str_replace('{{META_DESCRIPTION}}', $i_seo_desc, $ihtml);
                $ihtml = str_replace('</head>', '<style>body{background:#ffffff !important;margin:0;padding:0;overflow-x:clip;}</style>' . "\n" . $i_seo_head . "</head>", $ihtml);
                $ihtml = str_replace('{{MAIN_MENU}}', $menu_html, $ihtml);
                $ihtml = str_replace('{{GOOGLE_FONTS}}', $google_fonts_link, $ihtml);
                $ihtml = str_replace('{{BRAND_COLOR}}', $brand_color, $ihtml);
                $ihtml = str_replace('{{FONT_FAMILY}}', $font_family, $ihtml);
                $ihtml = str_replace('{{PAGE_CONTENT}}', $i_full, $ihtml);
                $ihtml = str_replace('{{BASE_URL}}', $base_url, $ihtml);

                $dir = __DIR__ . '/../' . $col_slug . '/' . $it_slug;
                if (!is_dir($dir)) mkdir($dir, 0755, true);
                file_put_contents($dir . '/index.html', $ihtml);
                $count++;
                $sitemap_urls[] = $i_abs !== '' ? $i_abs : ($base_url . $col_slug . '/' . $it_slug . '/');
            }
        }
    } catch (Exception $e) {}

    // Form recipient registry (per form, server-side: no email addresses in the client)
    $forms = function_exists('cc_form_registry') ? cc_form_registry() : [];
    @file_put_contents($data_dir . '/forms.json', json_encode($forms, JSON_UNESCAPED_UNICODE));

    // --- sitemap.xml ---
    $sm = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach (array_unique($sitemap_urls) as $u) $sm .= '  <url><loc>' . htmlspecialchars($u) . '</loc></url>' . "\n";
    $sm .= '</urlset>' . "\n";
    @file_put_contents(__DIR__ . '/../sitemap.xml', $sm);

    // --- robots.txt ---
    $robots = "User-agent: *\n" . ($robots_allow ? "Allow: /\n" : "Disallow: /\n");
    if ($site_url) $robots .= "Sitemap: $site_url/sitemap.xml\n";
    @file_put_contents(__DIR__ . '/../robots.txt', $robots);

    // --- 404.html ---
    $nf_content = '<div style="max-width:600px;margin:0 auto;padding:100px 20px;text-align:center;">'
        . '<h1 style="font-size:72px;margin:0;color:' . $brand_color . ';">404</h1>'
        . '<h2 style="margin:10px 0;">Page not found</h2>'
        . '<p style="color:#64748b;">The page you are looking for doesn\'t exist.</p>'
        . '<a href="' . $base_url . '" style="display:inline-block;margin-top:20px;padding:12px 24px;background:' . $brand_color . ';color:#fff;border-radius:8px;text-decoration:none;">Back to home</a>'
        . '</div>';
    $nf = str_replace('{{PAGE_TITLE}}', '404 - Not Found' . $site_suffix, $template);
    $nf = str_replace(['{{META_DESCRIPTION}}', '{{MAIN_MENU}}', '{{GOOGLE_FONTS}}', '{{BRAND_COLOR}}', '{{FONT_FAMILY}}', '{{PAGE_CONTENT}}', '{{BASE_URL}}'],
                      ['', $menu_html, $google_fonts_link, $brand_color, $font_family, $nf_content, $base_url], $nf);
    @file_put_contents(__DIR__ . '/../404.html', $nf);

    // ErrorDocument for Apache (best effort; on Nginx it must be configured by hand)
    $root_ht = __DIR__ . '/../.htaccess';
    if (!file_exists($root_ht)) @file_put_contents($root_ht, "ErrorDocument 404 " . $base_url . "404.html\n");

    echo json_encode(['success' => true, 'message' => "Build successful: $count pages published."]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'PHP Error: ' . $e->getMessage()]);
}
