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
foreach (cc_db_migrations() as $v => $m) if ($v === 6) $m($db);
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
file_put_contents($up . '/broken.jpg', 'not really a jpeg');
check('a photo GD can\'t open stays "not optimized" (retried later)', cc_media_process($up, 'broken.jpg')['optimized'] === false);
check('a small image is never enlarged (no copies) but is marked as processed', $m2['variants'] === [] && $m2['optimized'] === true && $m2['w'] === 300);
cc_media_meta_update(function (&$all) { $all['photo.jpg']['alt'] = 'Blue sky'; });
$meta2 = cc_media_process($up, 'photo.jpg');
check('processing again keeps the alt text', cc_media_meta_all()['photo.jpg']['alt'] === 'Blue sky');
$page = '<img src="/uploads/photo.jpg" alt="a" loading="lazy"><p>x</p><img src="/uploads/icon.png" alt="b"><img src="https://ext.com/x.jpg" alt="c" loading="eager">';
$out = cc_optimize_images($page, '/uploads/');
check('published pages get a srcset of the copies (and the original at its width)', strpos($out, 'srcset="/uploads/_cc/photo-480.webp 480w, /uploads/_cc/photo-960.webp 960w, /uploads/_cc/photo-1600.webp 1600w, /uploads/photo.jpg 2000w"') !== false, $out);
check('the first image loads with priority (even if a block marked it lazy), the next ones lazily', preg_match('#<img[^>]*fetchpriority="high"[^>]*src="/uploads/photo.jpg"#', $out) && !preg_match('#src="/uploads/photo.jpg"[^>]*loading="lazy"#', $out) && preg_match('#<img[^>]*loading="lazy"[^>]*src="/uploads/icon.png"#', $out));
check('an image that already says how to load keeps it; others decode async', strpos($out, 'loading="eager"') !== false && substr_count($out, 'decoding="async"') === 3);
@unlink("$up/_cc/photo-1600.webp");
$mx = cc_media_meta_existing($up);
check('a missing copy is left out of srcset (restored site without uploads/_cc)', $mx['photo.jpg']['variants'] === [480, 960]);
cc_media_forget($up, 'photo.jpg');
check('deleting an image removes its copies and its description', !is_file("$up/_cc/photo-480.webp") && !isset(cc_media_meta_all()['photo.jpg']));
array_map('unlink', glob("$up/_cc/*") ?: []); @rmdir("$up/_cc"); array_map('unlink', glob("$up/*") ?: []); @rmdir($up);

echo "\nREDIRECTS, COOKIE BANNER, SEARCH\n";
check('redirect paths are normalized and validated', cc_redirect_path('old-page') === null && cc_redirect_path('/Old-Page') === '/old-page/' && cc_redirect_path('/') === null && cc_redirect_path('/a b/') === null && cc_redirect_target('https://x.com/a') === 'https://x.com/a');
$rdb = new PDO('sqlite::memory:'); $rdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$rdb->exec("CREATE TABLE pages (id TEXT)"); foreach (cc_db_migrations() as $v => $m) if ($v === 7) $m($rdb);
cc_add_redirect($rdb, '/a/', '/b/'); cc_add_redirect($rdb, '/b/', '/c/');
$rows = $rdb->query("SELECT from_path, to_path FROM redirects ORDER BY from_path")->fetchAll(PDO::FETCH_KEY_PAIR);
check('renaming twice: both old addresses go straight to the newest (no chains)', $rows === ['/a/' => '/c/', '/b/' => '/c/'], json_encode($rows));
cc_add_redirect($rdb, '/c/', '/a/');
$rows = $rdb->query("SELECT from_path, to_path FROM redirects ORDER BY from_path")->fetchAll(PDO::FETCH_KEY_PAIR);
check('renaming back never makes a loop (the page\'s own address is not redirected)', !isset($rows['/a/']) && ($rows['/c/'] ?? '') === '/a/' && ($rows['/b/'] ?? '') === '/a/', json_encode($rows));
$ht = cc_htaccess_with_redirects("ErrorDocument 404 /404.html\n", [['/old/', '/new/']]);
$ht2 = cc_htaccess_with_redirects($ht, [['/x/', 'https://e.com/']]);
check('.htaccess gets a marked block of 301s, replaced (not duplicated) on the next publish, the rest kept', strpos($ht2, 'ErrorDocument 404') === 0 && substr_count($ht2, '# BEGIN CanvasCore redirects') === 1 && strpos($ht2, 'Redirect 301 /x/ https://e.com/') !== false && strpos($ht2, '/old/') === false);
check('…and removed when there are none', strpos(cc_htaccess_with_redirects($ht2, []), 'CanvasCore redirects') === false);
$rp = cc_redirect_page_html('/new/');
check('the page at the old address forwards (refresh + script), is noindex and canonical to the new one', strpos($rp, 'http-equiv="refresh" content="0; url=/new/"') !== false && strpos($rp, 'noindex') !== false && strpos($rp, 'rel="canonical" href="/new/"') !== false);
check('cookie banner: off unless enabled', cc_cookie_banner_html(['enabled' => false]) === '' && cc_cookie_banner_html(null) === '');
$cb = cc_cookie_banner_html(['enabled' => true, 'text' => 'Cookies <b>!</b>', 'privacyUrl' => 'privacy/index.html', 'position' => 'bottom-left']);
check('cookie banner: escaped text, privacy link, Accept/Decline, consent gating script', strpos($cb, 'Cookies &lt;b&gt;!&lt;/b&gt;') !== false && strpos($cb, 'href="{{BASE_URL}}privacy/"') !== false && strpos($cb, 'data-cc-consent-choice="granted"') !== false && strpos($cb, 'data-cc-consent-src') !== false);
$sb = render_block(['id' => 'sr', 'type' => 'SEARCH', 'styles' => [], 'content' => ['placeholder' => 'Find "it"', 'limit' => 999]]);
check('Site Search block: escaped placeholder, index address, limit capped at 50, its script', strpos($sb, 'placeholder="Find &quot;it&quot;"') !== false && strpos($sb, 'data-index="{{BASE_URL}}search-index.json"') !== false && strpos($sb, 'data-limit="50"') !== false && strpos($sb, "getElementById('sr')") !== false);

echo "\nSITE BRANDING\n";
$br = cc_public_branding(['siteName' => '  Acme Bakery ', 'faviconUrl' => '/uploads/fav.png', 'adminEmail' => 'x@y.z', 'trustedProxies' => '10.0.0.1']);
check('public branding: only the site name and favicon', $br === ['siteName' => 'Acme Bakery', 'faviconUrl' => '/uploads/fav.png']);
check('public branding: unsafe favicon addresses are dropped', cc_public_branding(['faviconUrl' => 'javascript:alert(1)'])['faviconUrl'] === '' && cc_public_branding(['faviconUrl' => '//evil.test/x.png'])['faviconUrl'] === ''
    && cc_public_branding(['faviconUrl' => 'uploads/f.ico'])['faviconUrl'] === 'uploads/f.ico' && cc_public_branding(['faviconUrl' => 'https://cdn.test/f.png'])['faviconUrl'] === 'https://cdn.test/f.png');
check('public branding: empty settings → empty values', cc_public_branding([]) === ['siteName' => '', 'faviconUrl' => '']);

echo "\nMEDIA FOLDERS\n";
$mf = sys_get_temp_dir() . '/cc_mf_' . getmypid();
$GLOBALS['CC_MEDIA_META_FILE'] = $mf . '-meta.json'; $GLOBALS['CC_MEDIA_FOLDERS_FILE'] = $mf . '-folders.json';
@unlink($GLOBALS['CC_MEDIA_META_FILE']); @unlink($GLOBALS['CC_MEDIA_FOLDERS_FILE']);
check('folder names are cleaned and validated', cc_media_folder_path(' Products / Shoes ') === 'Products/Shoes' && cc_media_folder_path('a/../b') === null && cc_media_folder_path('x<y') === null && cc_media_folder_path('') === '' && cc_media_folder_path('Città') === 'Città');
cc_media_folder_create('Products/Shoes');
check('creating a sub-folder also lists its parent', cc_media_folders() === ['Products', 'Products/Shoes']);
cc_media_move(['a.jpg', 'b.jpg'], 'Products/Shoes'); cc_media_move(['c.jpg'], 'Products');
$fm = cc_media_meta_all();
check('moving sets the images\' folder (files stay where they are)', $fm['a.jpg']['folder'] === 'Products/Shoes' && $fm['c.jpg']['folder'] === 'Products');
check('renaming a folder moves its sub-folders and images along', cc_media_folder_rename('Products', 'Catalog') && cc_media_folders() === ['Catalog', 'Catalog/Shoes'] && cc_media_meta_all()['a.jpg']['folder'] === 'Catalog/Shoes');
check('a folder can\'t be renamed into itself or onto an existing one', !cc_media_folder_rename('Catalog', 'Catalog/Shoes/X') && !cc_media_folder_rename('Catalog/Shoes', 'Catalog'));
cc_media_folder_delete('Catalog');
$fm = cc_media_meta_all();
check('deleting a folder deletes no image: they go to the parent (here: no folder)', cc_media_folders() === [] && $fm['a.jpg']['folder'] === '' && $fm['c.jpg']['folder'] === '');
$udb = new PDO('sqlite::memory:'); $udb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$udb->exec("CREATE TABLE pages (id TEXT, title TEXT, content_json TEXT, seo_image TEXT, is_draft_copy INT, parent_id TEXT)");
$udb->exec("CREATE TABLE collection_items (title TEXT, content_json TEXT, cover_image TEXT)");
$udb->prepare("INSERT INTO pages VALUES ('p1','Home',?,'',0,NULL)")->execute([json_encode([['type' => 'IMAGE', 'content' => ['src' => '/uploads/a.jpg']]])]);
$udb->prepare("INSERT INTO collection_items VALUES ('Post', '[]', '/uploads/c.jpg')")->execute();
$u = cc_media_usage($udb, ['a.jpg', 'b.jpg', 'c.jpg']);
check('usage: where each image is used (pages, item covers…) before deleting', $u['a.jpg'] === ['Page: Home'] && $u['b.jpg'] === [] && $u['c.jpg'] === ['Item: Post'], json_encode($u));
@unlink($GLOBALS['CC_MEDIA_META_FILE']); @unlink($GLOBALS['CC_MEDIA_FOLDERS_FILE']);

echo "\n" . ($fails === 0 ? 'SERVER OK' : "$fails checks failed") . " ($total checks)\n";
exit($fails === 0 ? 0 : 1);
