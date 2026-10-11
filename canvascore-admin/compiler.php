<?php
// canvascore-admin/compiler.php
require_once __DIR__ . '/config.php';

// Registry of the forms collected during the build (formId => recipient email)
function &cc_form_registry() { static $r = []; return $r; }

// URL for block links (same logic as BUTTON, with mailto:/tel: left intact)
function cc_block_url($url) {
    $url = trim((string)$url);
    if ($url === '') return '#';
    if ($url === '#' || preg_match('~^(?:f|ht)tps?://~i', $url) || preg_match('~^(?:mailto|tel):~i', $url)) return $url;
    if (in_array($url, ['index.html', 'index/index.html', 'home/index.html', '/'], true)) return '{{BASE_URL}}';
    $clean = str_replace(['index/index.html', 'index.html'], '', $url);
    return '{{BASE_URL}}' . ltrim($clean, '/');
}

// ---------------------------------------------------------------------------
// Helpers shared by the "content" blocks (Divider, Callout, Steps, Counters, ...).
// Each helper has an identical twin in src/render/renderBlock.mjs.
// ---------------------------------------------------------------------------
// Colors: they end up inside style="" and <style>, so only "safe" CSS values (no ; { } url() ...).
function cc_color($v, $default) {
    $v = trim((string)$v);
    if ($v === '') return $default;
    if (preg_match('/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s\/]+\)|var\(--[a-zA-Z0-9-]+(?:,\s*[#0-9a-zA-Z.,%()\s-]+)?\))$/', $v)) return $v;
    return $default;
}
function cc_num($v, $min, $max, $default) {
    return is_numeric($v) ? max($min, min($max, (float)$v)) : $default;
}
function cc_fmt_num($v, $dec) {
    // EXPLICIT rounding (identical in JS): neither number_format() nor toFixed() agree on cases like 2.675,
    // and the behavior of round() changes between PHP versions.
    $dec = (int)$dec;
    $v = (float)$v;
    $m = pow(10, $dec);
    $r = floor(abs($v) * $m + 0.5 + 1e-9) / $m;
    if ($v < 0) $r = -$r;
    if ($r == 0) $r = 0.0;
    return number_format($r, $dec, '.', ',');
}
// External link (social, website): always http(s). "linkedin.com/in/x" becomes "https://linkedin.com/in/x".
function cc_ext_url($v) {
    $v = trim((string)$v);
    if ($v === '') return '';
    if (preg_match('~^https?://~i', $v)) return $v;
    return 'https://' . ltrim($v, '/');
}
function cc_lines($s) {
    $out = [];
    foreach (preg_split('/\r\n|\r|\n/', (string)$s) as $l) { $l = trim($l); if ($l !== '') $out[] = $l; }
    return $out;
}
// Text with line breaks -> lines separated by <br>, everything escaped.
function cc_br($s) {
    return implode('<br>', array_map('htmlspecialchars', cc_lines($s)));
}
function cc_initials($name) {
    // No mbstring (not always installed): first Unicode character via PCRE; CSS does the uppercasing.
    $parts = preg_split('/\s+/', trim((string)$name), -1, PREG_SPLIT_NO_EMPTY);
    $out = '';
    foreach (array_slice($parts, 0, 2) as $p) {
        $out .= (preg_match('/^./us', $p, $m) === 1) ? $m[0] : substr($p, 0, 1);
    }
    return $out;
}
// Google Maps query (rawurlencode == encodeURIComponent + !'()* encoded)
function cc_enc($s) { return rawurlencode((string)$s); }

// Block scripts (nowdoc: no interpolation/escaping). Placeholders __ID__ / __DUR__.
function cc_script_counters($id, $dur) {
    $js = <<<'JS'
(function(){var root=document.getElementById('__ID__'); if(!root) return;
var els=[].slice.call(root.querySelectorAll('.cc-counter-value'));
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduce||!('IntersectionObserver' in window)) return;
function fmt(v,d){var s=v.toFixed(d).split('.'); s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,','); return s.join('.');}
function show(el,v){el.textContent=(el.getAttribute('data-prefix')||'')+fmt(v,+el.getAttribute('data-decimals'))+(el.getAttribute('data-suffix')||'');}
els.forEach(function(el){el._final=el.textContent; show(el,0);});
var dur=__DUR__;
function run(el){var t=+el.getAttribute('data-target'),s=null;function step(ts){if(s===null)s=ts;var p=Math.min(1,(ts-s)/dur),e=1-Math.pow(1-p,3);show(el,t*e);if(p<1)requestAnimationFrame(step);else el.textContent=el._final;}requestAnimationFrame(step);}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);run(e.target);}});},{threshold:0.3});
els.forEach(function(el){io.observe(el);});
})();
JS;
    return str_replace(['__ID__', '__DUR__'], [$id, (string)(int)$dur], $js);
}
function cc_script_progress($id) {
    $js = <<<'JS'
(function(){var root=document.getElementById('__ID__'); if(!root) return;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduce||!('IntersectionObserver' in window)) return;
[].slice.call(root.querySelectorAll('.cc-progress-fill')).forEach(function(f){f.style.width='0%'; f.style.transition='width 1s ease';});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);var f=e.target.querySelector('.cc-progress-fill'); requestAnimationFrame(function(){f.style.width=f.getAttribute('data-w')+'%';});}});},{threshold:0.3});
[].slice.call(root.querySelectorAll('.cc-progress-track')).forEach(function(t){io.observe(t);});
})();
JS;
    return str_replace('__ID__', $id, $js);
}
function cc_script_countdown($id) {
    $js = <<<'JS'
(function(){var root=document.getElementById('__ID__'); if(!root) return;
var target=new Date(root.getAttribute('data-target')).getTime(); if(isNaN(target)) return;
var end=root.getAttribute('data-end')||'message';
var nums={}; [].slice.call(root.querySelectorAll('.cc-cd-num')).forEach(function(n){nums[n.getAttribute('data-unit')]=n;});
var units=root.querySelector('.cc-cd-units'), done=root.querySelector('.cc-cd-done'), dateEl=root.querySelector('.cc-cd-date');
function pad(n){return n<10?'0'+n:''+n;}
function put(k,v){if(nums[k]) nums[k].textContent=pad(v);}
var timer=null;
function tick(){var d=target-new Date().getTime();
 if(d<=0){put('days',0);put('hours',0);put('minutes',0);put('seconds',0); if(timer) clearInterval(timer);
  if(end==='hide'){root.style.display='none';}
  else if(done&&done.textContent.replace(/\s+/g,'')!==''){if(units)units.style.display='none'; if(dateEl)dateEl.style.display='none'; done.hidden=false;}
  return;}
 var s=Math.floor(d/1000);
 put('days',Math.floor(s/86400)); put('hours',Math.floor(s%86400/3600)); put('minutes',Math.floor(s%3600/60)); put('seconds',s%60);
}
timer=setInterval(tick,1000); tick();
})();
JS;
    return str_replace('__ID__', $id, $js);
}
function cc_script_beforeafter($id) {
    $js = <<<'JS'
(function(){var root=document.getElementById('__ID__'); if(!root) return;
var r=root.querySelector('.cc-ba-range'); if(!r) return;
function set(){root.style.setProperty('--pos', r.value+'%');}
r.addEventListener('input', set); set();
})();
JS;
    return str_replace('__ID__', $id, $js);
}

// Cache of collections + published items (for the COLLECTION_LIST block)
function cc_collections_data() {
    static $d = null;
    if ($d !== null) return $d;
    $d = ['by_id' => [], 'by_slug' => []];
    try {
        $db = cc_data_dir() . '/canvascore.sqlite';
        if (!file_exists($db)) return $d;
        $pdo = new PDO("sqlite:$db");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $cols = $pdo->query("SELECT id, name, slug FROM collections")->fetchAll(PDO::FETCH_ASSOC);
        $ist = $pdo->prepare("SELECT title, slug, excerpt, cover_image, date, archived FROM collection_items WHERE collection_id = ? AND status = 'published' ORDER BY (date = '') ASC, date DESC, updated_at DESC");
        foreach ($cols as $c) {
            $ist->execute([$c['id']]);
            $c['items'] = $ist->fetchAll(PDO::FETCH_ASSOC);
            $d['by_id'][$c['id']] = $c;
            $d['by_slug'][$c['slug']] = $c;
        }
    } catch (Exception $e) {}
    return $d;
}


function build_inline_style($styles) {
    if (!$styles || !is_array($styles)) return '';
    $str = '';
    foreach($styles as $k => $v) {
        if ($v === '' || $k === 'animation') continue;
        $kebab_key = strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $k));
        $str .= $kebab_key . ': ' . htmlspecialchars($v) . '; ';
    }
    return $str;
}

// ---------------------------------------------------------------------------
// MENU — nested tree model (children), backward compatible with the flat format
// ---------------------------------------------------------------------------
function cc_menu_url($url) {
    $url = trim((string)$url);
    if ($url === '' || $url === '#') return '';
    $u = htmlspecialchars($url);
    if (preg_match('~^(?:f|ht)tps?://~i', $u) || strpos($u, 'mailto:') === 0 || strpos($u, 'tel:') === 0) return $u;
    if ($u === 'index.html' || $u === 'index/index.html' || $u === 'home/index.html' || $u === '/') return '{{BASE_URL}}';
    $clean = str_replace(['index/index.html', 'index.html'], '', $u);
    return '{{BASE_URL}}' . ltrim($clean, '/');
}

function cc_menu_ensure_children($items) {
    $out = [];
    foreach ($items as $it) {
        $it['children'] = cc_menu_ensure_children($it['children'] ?? []);
        $out[] = $it;
    }
    return $out;
}

// Convert the old flat format (parentId) into a nested tree, preserving the order.
function cc_menu_flat_to_tree($items) {
    $nodes = [];
    foreach ($items as $it) {
        $id = $it['id'] ?? uniqid('m_');
        $nodes[$id] = ['id' => $id, 'title' => $it['title'] ?? '', 'url' => $it['url'] ?? '', 'children' => []];
    }
    $roots = [];
    foreach ($items as $it) {
        $id = $it['id'] ?? null;
        $pid = $it['parentId'] ?? null;
        if ($id === null || !isset($nodes[$id])) continue;
        if ($pid && isset($nodes[$pid])) $nodes[$pid]['children'][] = &$nodes[$id];
        else $roots[] = &$nodes[$id];
    }
    return json_decode(json_encode($roots), true); // resolve the references
}

function cc_menu_items($data) {
    $items = $data['items'] ?? (is_array($data) ? $data : []);
    if (empty($items)) return [];
    $nested = false;
    foreach ($items as $it) { if (array_key_exists('children', $it)) { $nested = true; break; } }
    return $nested ? cc_menu_ensure_children($items) : cc_menu_flat_to_tree($items);
}

function cc_hex_rgba($hex, $opacity) {
    $hex = ltrim((string)$hex, '#');
    if (strlen($hex) === 3) $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
    if (strlen($hex) !== 6 || !ctype_xdigit($hex)) return $hex;
    $r = hexdec(substr($hex, 0, 2)); $g = hexdec(substr($hex, 2, 2)); $b = hexdec(substr($hex, 4, 2));
    $a = max(0, min(100, (int)$opacity)) / 100;
    return "rgba($r, $g, $b, $a)";
}

function cc_render_menu_items($items) {
    $html = '';
    foreach ($items as $it) {
        $title = htmlspecialchars($it['title'] ?? 'Link');
        $children = $it['children'] ?? [];
        $hasKids = !empty($children);
        $href = cc_menu_url($it['url'] ?? '');
        $isLink = ($href !== '');
        $liClass = 'cc-item' . ($hasKids ? ' cc-has-dropdown' : '');
        $caret = $hasKids ? '<span class="cc-caret" aria-hidden="true">▾</span>' : '';
        $html .= "<li class=\"$liClass\">";
        if ($isLink) {
            $html .= "<a href=\"$href\" class=\"cc-menu-link\">$title$caret</a>";
        } else {
            // Item without a link: only opens the submenu (no href)
            $html .= "<button type=\"button\" class=\"cc-menu-link cc-menu-toggle\" aria-haspopup=\"true\" aria-expanded=\"false\">$title$caret</button>";
        }
        if ($hasKids) {
            $html .= "<ul class=\"cc-dropdown\">" . cc_render_menu_items($children) . "</ul>";
        }
        $html .= "</li>\n";
    }
    return $html;
}

function render_menu_html($menu_json_str, $opts = []) {
    $data = json_decode($menu_json_str, true);
    $items = cc_menu_items($data);
    $settings = $data['settings'] ?? [];
    if (empty($items)) return '';
    $inheritTheme = !empty($opts['inheritTheme']);
    $preview = !empty($opts['preview']);

    // --- Settings (with defaults) ---
    $align          = $settings['align'] ?? 'flex-end';                 // flex-start|center|flex-end
    $styleType      = $settings['styleType'] ?? 'link';                 // link|pill|box
    $textColor      = htmlspecialchars($settings['textColor'] ?? '#334155');
    $hoverTextColor = htmlspecialchars($settings['hoverTextColor'] ?? ($settings['textColor'] ?? '#3b82f6'));
    $hoverColorVal = $inheritTheme ? 'var(--brand-color)' : $hoverTextColor;
    $hoverBgColor   = $settings['hoverBgColor'] ?? 'transparent';
    $hoverBg        = ($hoverBgColor === 'transparent' || $hoverBgColor === '') ? 'transparent' : htmlspecialchars($hoverBgColor);
    $bgColor        = htmlspecialchars($settings['bgColor'] ?? '#3b82f6');
    $borderRadius   = htmlspecialchars($settings['borderRadius'] ?? '6px');
    $itemGap        = htmlspecialchars($settings['itemGap'] ?? '20px');
    $itemBorder     = htmlspecialchars($settings['itemBorder'] ?? 'none');
    $menuBgColorRaw = $settings['menuBgColor'] ?? 'transparent';
    $menuBgOpacity  = $settings['menuBgOpacity'] ?? 100;
    $menuBg         = ($menuBgColorRaw === 'transparent' || $menuBgColorRaw === '') ? 'transparent' : cc_hex_rgba($menuBgColorRaw, $menuBgOpacity);
    $barHeight      = htmlspecialchars($settings['barHeight'] ?? '64px');
    $barPadding     = htmlspecialchars($settings['barPadding'] ?? '0 24px');
    $isSticky       = !empty($settings['isSticky']);
    $shadow         = $settings['shadow'] ?? 'none';                    // none|soft|medium|strong
    $effects        = cc_menu_effects($settings);
    $fx             = function ($id) use ($effects) { return in_array($id, $effects, true); };
    $buttonText     = htmlspecialchars($settings['buttonTextColor'] ?? '#ffffff');
    $fontSize       = htmlspecialchars($settings['fontSize'] ?? '15px');
    $fontWeight     = (string)($settings['fontWeight'] ?? '600');
    $fontWeight     = in_array($fontWeight, ['300', '400', '500', '600', '700', '800'], true) ? $fontWeight : '600';
    $textTransform  = (string)($settings['textTransform'] ?? 'none');
    $textTransform  = in_array($textTransform, ['none', 'uppercase', 'capitalize'], true) ? $textTransform : 'none';
    $letterSpacing  = htmlspecialchars($settings['letterSpacing'] ?? '0px');
    $highlightCurrent = !empty($settings['highlightCurrent']);
    $logoUrl        = trim((string)($settings['logoUrl'] ?? ''));
    $logoAlign      = ($settings['logoAlign'] ?? 'left') === 'right' ? 'right' : 'left';
    $logoHeight     = htmlspecialchars($settings['logoHeight'] ?? '40px');
    $logoGap        = htmlspecialchars($settings['logoGap'] ?? '24px');
    $logoLink       = cc_menu_url($settings['logoLink'] ?? 'index.html');
    $mobileThreshold= (int)($settings['mobileThreshold'] ?? 768);
    $burgerIcon     = htmlspecialchars($settings['burgerIcon'] ?? '☰');

    $hasLogo = ($logoUrl !== '');
    $logoSrc = htmlspecialchars($logoUrl);

    // --- Shadow ---
    $shadowMap = [
        'none' => 'none',
        'soft' => '0 2px 8px rgba(0,0,0,0.06)',
        'medium' => '0 6px 20px rgba(0,0,0,0.12)',
        'strong' => '0 10px 30px rgba(0,0,0,0.22)',
    ];
    $boxShadow = $shadowMap[$shadow] ?? 'none';

    // --- Logo/buttons layout ---
    $buttonsSide = $align === 'flex-start' ? 'left' : ($align === 'center' ? 'center' : 'right');
    $innerExtra = ''; $logoStyle = "display:inline-flex; align-items:center; flex:0 0 auto;"; $menuWrapStyle = '';
    $justify = $align;
    if ($hasLogo) {
        if ($buttonsSide === 'center') {
            $justify = 'center';
            $innerExtra = 'position:relative;';
            $logoStyle .= 'position:absolute; top:50%; transform:translateY(-50%);' . ($logoAlign === 'right' ? "right:0;" : "left:0;");
        } elseif ($logoAlign === $buttonsSide) {
            // same side: logo and buttons together, logoGap apart
            $justify = $buttonsSide === 'left' ? 'flex-start' : 'flex-end';
            if ($buttonsSide === 'left') { $logoStyle .= "order:1;"; $menuWrapStyle .= "order:2; margin-left:$logoGap;"; }
            else { $menuWrapStyle .= "order:1;"; $logoStyle .= "order:2; margin-left:$logoGap;"; }
        } else {
            // opposite sides: at the edges
            $justify = 'space-between';
            if ($logoAlign === 'left') { $logoStyle .= "order:1;"; $menuWrapStyle .= "order:2;"; }
            else { $menuWrapStyle .= "order:1;"; $logoStyle .= "order:2;"; }
        }
    }

    $stickyCss = ($isSticky && !$preview) ? "position:fixed; top:0; left:0; right:0; z-index:9999;" : "position:relative;";

    // --- HTML ---
    $logoHtml = '';
    if ($hasLogo) {
        $logoInner = "<img src=\"$logoSrc\" alt=\"Logo\" style=\"height:$logoHeight; width:auto; display:block;\">";
        $logoHtml = $logoLink !== ''
            ? "<a href=\"$logoLink\" class=\"cc-logo\" style=\"$logoStyle\">$logoInner</a>"
            : "<span class=\"cc-logo\" style=\"$logoStyle\">$logoInner</span>";
    }

    $navEffect = $fx('glass') ? "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);" : '';
    $glareHtml = $fx('glare') ? "<span class=\"cc-glare\" aria-hidden=\"true\"></span>" : '';
    $html  = "<nav class=\"cc-navigation\" style=\"$stickyCss width:100%; padding:0; box-sizing:border-box; background:$menuBg; box-shadow:$boxShadow; $navEffect\">\n";
    $html .= "  $glareHtml\n";
    $html .= "  <div class=\"cc-nav-inner\" style=\"display:flex; align-items:center; min-height:$barHeight; padding:$barPadding; box-sizing:border-box; justify-content:$justify; position:relative; z-index:1; $innerExtra\">\n";
    $html .= "    $logoHtml\n";
    $html .= "    <button type=\"button\" class=\"cc-mobile-toggle\" aria-label=\"Menu\" style=\"display:none; background:none; border:none; cursor:pointer; font-size:28px; color:$textColor; order:3;\">$burgerIcon</button>\n";
    $html .= "    <ul class=\"cc-main-menu\" style=\"display:flex; align-items:center; gap:$itemGap; list-style:none; margin:0; padding:0; flex-wrap:wrap; $menuWrapStyle\">\n";
    $html .= cc_render_menu_items($items);
    $html .= "    </ul>\n";
    $html .= "  </div>\n";

    // --- CSS ---
    $top = ".cc-navigation .cc-main-menu > .cc-item > .cc-menu-link";
    // Hovered top-level item; with "highlight current page" the current one looks hovered too
    $topOn = "$top:hover" . ($highlightCurrent ? ", $top.cc-current" : '');
    $pillBox = '';
    if ($styleType === 'pill' || $styleType === 'box') {
        $radius = $styleType === 'pill' ? '50px' : $borderRadius;
        $pillBox = "$top { color:$buttonText !important; background:$bgColor; padding:10px 18px; border-radius:$radius; }";
    }
    $dropdownBg = ($menuBgColorRaw === 'transparent' || $menuBgColorRaw === '') ? '#ffffff' : cc_hex_rgba($menuBgColorRaw, 100);
    $currentCss = $highlightCurrent
        ? ".cc-navigation .cc-menu-link.cc-current { color:$hoverColorVal !important;" . ($hoverBg !== 'transparent' ? " background:$hoverBg !important;" : "") . " }"
        : '';

    $effectCss = cc_menu_effects_css($effects, [
        'top' => $top, 'topOn' => $topOn, 'hover' => $hoverColorVal, 'accent' => $hoverColorVal,
        'barHeight' => $barHeight, 'logoHeight' => $logoHeight, 'mobile' => $mobileThreshold,
        'topCount' => count($items), 'sticky' => $isSticky && !$preview,
    ]);

    $html .= "  <style>\n";
    $html .= "    .cc-navigation * { box-sizing:border-box; }\n";
    $html .= "    .cc-navigation .cc-menu-link { color:$textColor !important; text-decoration:none; font-weight:$fontWeight; font-size:$fontSize; text-transform:$textTransform; letter-spacing:$letterSpacing; display:inline-flex; align-items:center; gap:6px; padding:8px 10px; border:$itemBorder; border-radius:$borderRadius; background:transparent; cursor:pointer; font-family:inherit; transition:color .2s, background .2s, transform .2s, box-shadow .2s, text-shadow .2s; }\n";
    $html .= "    .cc-navigation .cc-caret { font-size:11px; opacity:0.7; }\n";
    $html .= "    $pillBox\n";
    $html .= "    .cc-navigation .cc-menu-link:hover { color:$hoverColorVal !important;" . ($hoverBg !== 'transparent' ? " background:$hoverBg !important;" : "") . " }\n";
    $html .= "    $currentCss\n";
    $html .= "    .cc-navigation .cc-item { position:relative; }\n";
    $html .= "    .cc-navigation .cc-dropdown { display:none; position:absolute; top:100%; left:0; min-width:210px; padding:8px 0; margin:0; list-style:none; border-radius:10px; z-index:1000; background:$dropdownBg; box-shadow:0 12px 30px rgba(0,0,0,0.12); }\n";
    $html .= "    .cc-navigation .cc-item:hover > .cc-dropdown, .cc-navigation .cc-item:focus-within > .cc-dropdown { display:block; }\n";
    $html .= "    .cc-navigation .cc-dropdown .cc-item { width:100%; }\n";
    $html .= "    .cc-navigation .cc-dropdown .cc-menu-link { color:$textColor !important; width:100%; padding:9px 18px; border-radius:0; border:none; background:transparent; }\n";
    $html .= "    .cc-navigation .cc-dropdown .cc-menu-link:hover { color:$hoverColorVal !important; background:" . ($hoverBg !== 'transparent' ? "$hoverBg" : "rgba(0,0,0,0.05)") . " !important; }\n";
    $html .= "    .cc-navigation .cc-dropdown .cc-dropdown { top:0; left:100%; }\n"; // sub-submenu to the side
    $html .= "    $effectCss\n";
    $html .= "    @media (max-width: {$mobileThreshold}px) {\n";
    $html .= "      .cc-mobile-toggle { display:block !important; margin-left:auto; order:99 !important; }\n";
    $html .= "      .cc-nav-inner { flex-wrap:wrap; position:relative; }\n";
    $html .= "      .cc-main-menu { display:none; order:100 !important; flex-direction:column; align-items:stretch !important; width:100%; margin:0 !important; gap:0 !important; padding:10px 0 !important; }\n";
    $html .= "      .cc-main-menu.active { display:flex; }\n";
    $html .= "      .cc-dropdown { position:static !important; display:none; box-shadow:none !important; padding-left:18px !important; min-width:0; background:transparent; }\n";
    $html .= "      .cc-item.cc-open > .cc-dropdown { display:block !important; }\n";
    $html .= "      .cc-dropdown .cc-dropdown { left:0 !important; }\n";
    $html .= "      .cc-menu-link { width:100%; }\n";
    $html .= "    }\n";
    $html .= "    @media (prefers-reduced-motion: reduce) { .cc-navigation, .cc-navigation *, .cc-navigation *::before, .cc-navigation *::after { animation:none !important; transition:none !important; } }\n";
    $html .= "  </style>\n";

    // --- Script: burger + submenu expansion on mobile + current page + scroll effects + sticky padding ---
    $scrollFx = ($isSticky && !$preview) && ($fx('shrink') || $fx('hide-on-scroll') || $fx('shadow-on-scroll'));
    $html .= "  <script>\n";
    $html .= "  (function(){\n";
    $html .= "    var nav = document.currentScript ? document.currentScript.closest('.cc-navigation') : document.querySelector('.cc-navigation');\n";
    $html .= "    if(!nav) return;\n";
    $html .= "    var toggle = nav.querySelector('.cc-mobile-toggle');\n";
    $html .= "    var menu = nav.querySelector('.cc-main-menu');\n";
    $html .= "    if(toggle && menu){ toggle.addEventListener('click', function(){ menu.classList.toggle('active'); }); }\n";
    $html .= "    nav.querySelectorAll('.cc-item.cc-has-dropdown > .cc-menu-toggle, .cc-item.cc-has-dropdown > .cc-menu-link').forEach(function(el){\n";
    $html .= "      el.addEventListener('click', function(e){\n";
    $html .= "        if(window.innerWidth <= {$mobileThreshold}){\n";
    $html .= "          var li = el.parentElement;\n";
    $html .= "          if(el.classList.contains('cc-menu-toggle') || li.classList.contains('cc-has-dropdown')){ e.preventDefault(); li.classList.toggle('cc-open'); }\n";
    $html .= "        }\n";
    $html .= "      });\n";
    $html .= "    });\n";
    // Marks the link to the page being viewed (aria-current) and its top-level parent
    $html .= "    var norm = function(p){ p = p.replace(/index\\.html\$/, ''); return p.charAt(p.length - 1) === '/' ? p : p + '/'; };\n";
    $html .= "    var here = norm(location.pathname);\n";
    $html .= "    nav.querySelectorAll('a.cc-menu-link').forEach(function(a){\n";
    $html .= "      if(a.host !== location.host || norm(a.pathname) !== here) return;\n";
    $html .= "      a.setAttribute('aria-current', 'page'); a.classList.add('cc-current');\n";
    $html .= "      var topItem = a.closest('.cc-main-menu > .cc-item'); var topLink = topItem && topItem.querySelector('.cc-menu-link');\n";
    $html .= "      if(topLink) topLink.classList.add('cc-current');\n";
    $html .= "    });\n";
    if ($scrollFx) {
        $html .= "    var lastY = window.scrollY;\n";
        $html .= "    var onScroll = function(){\n";
        $html .= "      var y = window.scrollY;\n";
        $html .= "      nav.classList.toggle('cc-scrolled', y > 30);\n";
        if ($fx('hide-on-scroll')) {
            $html .= "      var open = menu && menu.classList.contains('active');\n";
            $html .= "      if(y > lastY && y > nav.offsetHeight && !open) nav.classList.add('cc-nav-hidden');\n";
            $html .= "      else if(y < lastY || open) nav.classList.remove('cc-nav-hidden');\n";
        }
        $html .= "      lastY = y;\n";
        $html .= "    };\n";
        $html .= "    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();\n";
    }
    if ($isSticky) {
        $html .= "    document.body.style.paddingTop = nav.offsetHeight + 'px';\n";
    }
    $html .= "  })();\n";
    $html .= "  </script>\n";
    $html .= "</nav>\n";
    return $html;
}

// Menu effects: id => group. In a 'single' group only one effect applies (they animate the same
// property); the others stack. Mirrors EFFECT_GROUPS in canvascore-frontend/src/menu/menuThemes.js.
const CC_MENU_EFFECTS = [
    'underline' => 'decor', 'underline-center' => 'decor', 'overline' => 'decor', 'highlight' => 'decor', 'dot' => 'decor',
    'lift' => 'motion', 'grow' => 'motion', 'pop' => 'motion',
    'glow' => 'glow', 'halo' => 'glow',
    'glass' => 'bar', 'glare' => 'bar', 'accent-line' => 'bar',
    'shrink' => 'scroll', 'hide-on-scroll' => 'scroll', 'shadow-on-scroll' => 'scroll',
    'dd-fade' => 'dropdown', 'dd-slide' => 'dropdown', 'dd-zoom' => 'dropdown',
    'enter-slide' => 'entrance', 'enter-fade' => 'entrance', 'enter-stagger' => 'entrance',
];
const CC_MENU_SINGLE_GROUPS = ['decor', 'motion', 'dropdown', 'entrance'];

// Valid effects of a menu: the `effects` list, or the legacy single `effect` string.
function cc_menu_effects($settings) {
    if (isset($settings['effects']) && is_array($settings['effects'])) $list = $settings['effects'];
    else $list = (!empty($settings['effect']) && $settings['effect'] !== 'none') ? [$settings['effect']] : [];
    $out = []; $taken = [];
    foreach ($list as $id) {
        if (!is_string($id) || !isset(CC_MENU_EFFECTS[$id]) || in_array($id, $out, true)) continue;
        $g = CC_MENU_EFFECTS[$id];
        if (in_array($g, CC_MENU_SINGLE_GROUPS, true)) { if (isset($taken[$g])) continue; $taken[$g] = true; }
        $out[] = $id;
    }
    return $out;
}

function cc_menu_effects_css($effects, $o) {
    $has = function ($id) use ($effects) { return in_array($id, $effects, true); };
    $top = $o['top']; $on = $o['topOn'];
    // selector list with a pseudo-element appended to each selector
    $pe = function ($sel, $pseudo) { return implode(', ', array_map(function ($s) use ($pseudo) { return trim($s) . $pseudo; }, explode(',', $sel))); };
    $css = [];

    // Hover indicator (one): drawn with ::after (::before for the highlight fill)
    $line = "content:''; position:absolute; left:0; width:100%; height:2px; background:currentColor; transition:transform .25s ease;";
    if ($has('underline') || $has('underline-center') || $has('overline')) {
        $pos = $has('overline') ? 'top:-4px;' : 'bottom:-4px;';
        $origin = $has('underline') ? 'left' : 'center';
        $css[] = "$top { position:relative; }";
        $css[] = "$top::after { $line $pos transform:scaleX(0); transform-origin:$origin; }";
        $css[] = $pe($on, '::after') . " { transform:scaleX(1); }";
    } elseif ($has('highlight')) {
        $css[] = "$top { position:relative; isolation:isolate; }";
        $css[] = "$top::before { content:''; position:absolute; inset:0; border-radius:inherit; background:currentColor; opacity:.14; z-index:-1; transform:scaleY(0); transform-origin:bottom; transition:transform .25s ease; }";
        $css[] = $pe($on, '::before') . " { transform:scaleY(1); }";
    } elseif ($has('dot')) {
        $css[] = "$top { position:relative; }";
        $css[] = "$top::after { content:''; position:absolute; left:50%; bottom:-3px; width:5px; height:5px; border-radius:50%; background:currentColor; transform:translateX(-50%) scale(0); transition:transform .2s ease; }";
        $css[] = $pe($on, '::after') . " { transform:translateX(-50%) scale(1); }";
    }

    // Hover motion (one)
    if ($has('lift')) $css[] = "$top:hover { transform:translateY(-2px); }";
    elseif ($has('grow')) $css[] = "$top:hover { transform:scale(1.06); }";
    elseif ($has('pop')) $css[] = "$top { transition-timing-function:cubic-bezier(.34,1.56,.64,1); } $top:hover { transform:scale(1.1); }";

    // Hover glow (stackable)
    if ($has('glow')) $css[] = "$top:hover { text-shadow:0 0 12px {$o['hover']}; }";
    if ($has('halo')) $css[] = "$top:hover { box-shadow:0 6px 18px rgba(0,0,0,.18); }";

    // Bar
    if ($has('glare')) {
        // Overlay clipped to the bar only: the sheen does not cut off the dropdowns
        $css[] = ".cc-navigation .cc-glare { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0; }";
        $css[] = ".cc-navigation .cc-glare::before { content:''; position:absolute; top:0; left:-150%; width:60%; height:100%; background:linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent); transform:skewX(-20deg); animation: ccGlare 6s ease-in-out infinite; }";
        $css[] = "@keyframes ccGlare { 0%,60% { left:-150%; } 100% { left:150%; } }";
    }
    if ($has('accent-line')) {
        $css[] = ".cc-navigation::after { content:''; position:absolute; left:0; right:0; bottom:0; height:3px; background:linear-gradient(90deg, {$o['accent']}, transparent); pointer-events:none; z-index:2; }";
    }

    // On scroll (sticky bar only; the script toggles .cc-scrolled / .cc-nav-hidden)
    if ($o['sticky']) {
        if ($has('shrink')) {
            $css[] = ".cc-navigation .cc-nav-inner { transition:min-height .25s ease; } .cc-navigation .cc-logo img { transition:height .25s ease; }";
            $css[] = ".cc-navigation.cc-scrolled .cc-nav-inner { min-height:calc({$o['barHeight']} * .75) !important; }";
            $css[] = ".cc-navigation.cc-scrolled .cc-logo img { height:calc({$o['logoHeight']} * .8) !important; }";
        }
        if ($has('hide-on-scroll')) $css[] = ".cc-navigation { transition:transform .3s ease; } .cc-navigation.cc-nav-hidden { transform:translateY(-100%); }";
        if ($has('shadow-on-scroll')) $css[] = ".cc-navigation.cc-scrolled { box-shadow:0 8px 24px rgba(0,0,0,.15) !important; }";
    }

    // Submenu opening (one, desktop only: on mobile the submenus expand in place)
    $dd = $has('dd-fade') ? 'none' : ($has('dd-slide') ? 'translateY(-8px)' : ($has('dd-zoom') ? 'scale(.96)' : null));
    if ($dd !== null) {
        $min = $o['mobile'] + 1;
        $css[] = "@media (min-width: {$min}px) {"
            . " .cc-navigation .cc-dropdown { display:block; visibility:hidden; opacity:0; pointer-events:none; transform:$dd; transform-origin:top left; transition:opacity .2s ease, transform .2s ease, visibility 0s linear .2s; }"
            . " .cc-navigation .cc-item:hover > .cc-dropdown, .cc-navigation .cc-item:focus-within > .cc-dropdown { visibility:visible; opacity:1; pointer-events:auto; transform:none; transition-delay:0s; }"
            . " }";
    }

    // Page load (one)
    if ($has('enter-slide')) $css[] = ".cc-navigation { animation:ccNavSlide .6s ease; } @keyframes ccNavSlide { from { transform:translateY(-100%); opacity:0; } }";
    elseif ($has('enter-fade')) $css[] = ".cc-navigation { animation:ccNavFade .8s ease; } @keyframes ccNavFade { from { opacity:0; } }";
    elseif ($has('enter-stagger')) {
        $css[] = ".cc-navigation .cc-main-menu > .cc-item { animation:ccItemIn .45s ease backwards; } @keyframes ccItemIn { from { opacity:0; transform:translateY(-8px); } }";
        for ($i = 1; $i <= $o['topCount']; $i++) $css[] = ".cc-navigation .cc-main-menu > .cc-item:nth-child($i) { animation-delay:" . round(0.07 * $i, 2) . "s; }";
    }

    return implode("\n    ", $css);
}

function render_block($block) {
    if (!$block || !is_array($block)) return '';

    static $masters_cache = null;
    if ($masters_cache === null) {
        $masters_cache = [];
        $db_file = __DIR__ . '/data/canvascore.sqlite';
        if (file_exists($db_file)) {
            try {
                $temp_pdo = new PDO("sqlite:" . $db_file);
                $stmt = $temp_pdo->query("SELECT id, content_json FROM master_components");
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $masters_cache[$row['id']] = json_decode($row['content_json'], true);
                }
            } catch (Exception $e) {}
        }
    }

    if ($block['type'] === 'MASTER') {
        $masterId = $block['content']['masterId'] ?? null;
        if ($masterId && isset($masters_cache[$masterId])) {
            return "<!-- Start Master: " . htmlspecialchars($block['content']['name'] ?? '') . " -->\n"
                 . render_block($masters_cache[$masterId])
                 . "\n<!-- End Master -->\n";
        }
        return "<!-- Master not found -->\n";
    }

    $styleAttr = build_inline_style($block['styles'] ?? []);
    $styleString = $styleAttr ? " style=\"$styleAttr\"" : "";
    $animClass = ($block['styles']['animation'] ?? 'none') !== 'none' ? " cc-reveal " . $block['styles']['animation'] : "";

    $blockId = isset($block['id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $block['id']) : uniqid('b_');
    $innerId = !empty($block['content']['customId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $block['content']['customId']) : $blockId;
    $innerClass = !empty($block['content']['customClass']) ? ' ' . htmlspecialchars($block['content']['customClass']) : '';

    $customCss = "";
    if (!empty($block['content']['customCss'])) {
        $cssCode = str_replace('__THIS__', '#' . $innerId, $block['content']['customCss']);
        $cssCode = preg_replace('#</\s*(style|script)#i', '', $cssCode); // prevent breaking out of the <style> tag
        $customCss = "<style>\n" . $cssCode . "\n</style>\n";
    }

    $childrenHtml = '';
    if (isset($block['children']) && is_array($block['children'])) {
        foreach ($block['children'] as $child) {
            $childrenHtml .= render_block($child);
        }
    }

    switch ($block['type']) {
        case 'SECTION':
            $html = "<section id=\"$innerId\" class=\"cc-section$animClass$innerClass\"$styleString>\n$childrenHtml\n</section>\n";
            return $customCss . $html;

        case 'CONTAINER':
            $html = "<div id=\"$innerId\" class=\"cc-container$animClass$innerClass\"$styleString>\n$childrenHtml\n</div>\n";
            return $customCss . $html;

        case 'FLEX_ROW':
            $html = "<div id=\"$innerId\" class=\"cc-flex-row$animClass$innerClass\"$styleString>\n$childrenHtml\n</div>\n";
            return $customCss . $html;

        case 'CSS_GRID':
            $columns = $block['content']['columns'] ?? 2;
            $gap = $block['content']['gap'] ?? '20px';
            $html = "<style>@media(max-width: 768px){ #$innerId { grid-template-columns: 1fr !important; } }</style>";
            $html .= "<div id=\"$innerId\" class=\"cc-css-grid$animClass$innerClass\" style=\"$styleAttr; display:grid; grid-template-columns:repeat($columns, 1fr); gap:$gap; overflow:hidden;\">\n";
            $html .= $childrenHtml;
            $html .= "</div>\n";
            return $customCss . $html;

        case 'TEXT':
            $html = "<div id=\"$innerId\" class=\"cc-text$animClass$innerClass\"$styleString>\n" . cc_sanitize_html($block['content']['text'] ?? '') . "\n</div>\n";
            return $customCss . $html;

        case 'IMAGE':
            $src = htmlspecialchars($block['content']['src'] ?? '');
            $alt = htmlspecialchars($block['content']['alt'] ?? '');
            $fit = htmlspecialchars($block['content']['objectFit'] ?? 'cover');
            $pos = htmlspecialchars($block['content']['objectPosition'] ?? 'center');
            $scale = htmlspecialchars($block['content']['scale'] ?? '1');
            $ar = $block['content']['aspectRatio'] ?? 'auto';
            $arStyle = ($ar && $ar !== 'auto') ? " aspect-ratio:" . htmlspecialchars($ar) . ";" : "";
            $html = "<figure id=\"$innerId\" class=\"cc-image$animClass$innerClass\" style=\"$styleAttr margin:0; overflow:hidden;$arStyle\"><img src=\"$src\" alt=\"$alt\" loading=\"lazy\" style=\"width:100%; height:100%; object-fit:$fit; object-position:$pos; transform:scale($scale); display:block; border-radius:inherit;\"></figure>\n";
            return $customCss . $html;

        case 'BUTTON':
            $url = htmlspecialchars($block['content']['url'] ?? '#');
            if (!preg_match('~^(?:f|ht)tps?://~i', $url) && $url !== '#') {
                if ($url === 'index.html' || $url === 'index/index.html' || $url === 'home/index.html' || $url === '/') {
                    $url = '{{BASE_URL}}';
                } else {
                    $clean_url = str_replace(['index/index.html', 'index.html'], '', $url);
                    $url = '{{BASE_URL}}' . ltrim($clean_url, '/');
                }
            }
            $text = htmlspecialchars($block['content']['text'] ?? 'Click here');
            $align = htmlspecialchars($block['styles']['textAlign'] ?? 'center');
            $margin = htmlspecialchars($block['styles']['margin'] ?? '0');
            $useGlobal = $block['content']['useGlobal'] ?? true;
            // Button styles = base + (global FIRST) + user styles AFTER (which therefore win),
            // excluding margin/textAlign, which the container handles.
            $btnOwn = $block['styles'] ?? [];
            unset($btnOwn['margin'], $btnOwn['textAlign'], $btnOwn['animation']);
            $globalStyle = $useGlobal ? "background: var(--brand-color, #3b82f6); color: #fff; border-radius: 6px; padding: 12px 24px; " : "";
            $btnStyle = "display:inline-block; text-decoration:none; font-weight:bold; box-sizing:border-box; " . $globalStyle . build_inline_style($btnOwn);
            $html = "<div id=\"$innerId\" class=\"cc-btn-wrap$animClass$innerClass\" style=\"text-align:$align; margin:$margin;\">\n<a href=\"$url\" class=\"cc-btn\" style=\"$btnStyle\">$text</a>\n</div>\n";
            return $customCss . $html;

        case 'GRID':
            $columns = $block['content']['columns'] ?? 2;
            $html = "<style>@media(max-width: 768px){ #$innerId { grid-template-columns: 1fr !important; } }</style>";
            $html .= "<div id=\"$innerId\" class=\"cc-grid $animClass$innerClass\" style=\"$styleAttr; display:grid; grid-template-columns:repeat($columns, 1fr); gap:20px; overflow:hidden;\">\n";
            if (isset($block['content']['items']) && is_array($block['content']['items'])) { foreach ($block['content']['items'] as $item) $html .= "  <div style=\"min-width:0;\">\n" . cc_sanitize_html($item) . "\n  </div>\n"; }
            $html .= "</div>\n";
            return $customCss . $html;

        case 'HERO':
            $bg = !empty($block['content']['bgImage']) ? "background-image: url('".htmlspecialchars($block['content']['bgImage'])."'); background-size: cover; background-position: center;" : "";
            $title = cc_sanitize_html($block['content']['title'] ?? '');
            $subtitle = cc_sanitize_html($block['content']['subtitle'] ?? '');
            $minHeight = $block['styles']['minHeight'] ?? 'auto';
            $buttonsHtml = "<div style=\"display:flex; gap:15px; flex-wrap:wrap; justify-content:".($block['styles']['textAlign'] ?? 'center').";\">";
            $buttons = $block['content']['buttons'] ?? [];
            if (empty($buttons)) { $buttons = [['text' => $block['content']['btnText'] ?? 'Start Now', 'url' => $block['content']['btnUrl'] ?? '#', 'bgColor' => 'var(--brand-color, #3b82f6)', 'textColor' => '#ffffff', 'borderRadius' => '8px']]; }
            foreach($buttons as $btn) {
                $bText = htmlspecialchars($btn['text']);
                $bUrl = htmlspecialchars($btn['url']);
                if (!preg_match('~^(?:f|ht)tps?://~i', $bUrl) && $bUrl !== '#') {
                    if ($bUrl === 'index.html' || $bUrl === 'index/index.html' || $bUrl === 'home/index.html' || $bUrl === '/') {
                        $bUrl = '{{BASE_URL}}';
                    } else {
                        $clean_url = str_replace(['index/index.html', 'index.html'], '', $bUrl);
                        $bUrl = '{{BASE_URL}}' . ltrim($clean_url, '/');
                    }
                }
                $bBg = htmlspecialchars($btn['bgColor']); $bColor = htmlspecialchars($btn['textColor']);
                $bRad = htmlspecialchars($btn['borderRadius']);
                $buttonsHtml .= "<a href=\"$bUrl\" style=\"display:inline-block; padding:14px 28px; background:$bBg; color:$bColor; border-radius:$bRad; text-decoration:none; font-weight:bold; border:none; box-sizing:border-box;\">$bText</a>";
            }
            $buttonsHtml .= "</div>";
            $html = "<section id=\"$innerId\" class=\"cc-hero$animClass$innerClass\" style=\"$styleAttr; $bg; min-height:$minHeight; display:flex; flex-direction:column; justify-content:center;\">\n<div>\n$title\n<div style=\"margin:20px 0;\">$subtitle</div>\n$buttonsHtml\n</div>\n</section>\n";
            return $customCss . $html;

        case 'IMAGE_TEXT':
            $layout = ($block['content']['layout'] ?? 'img-left') === 'img-right' ? 'row-reverse' : 'row';
            $src = htmlspecialchars($block['content']['src'] ?? '');
            $text = cc_sanitize_html($block['content']['text'] ?? '');
            $html = "<section id=\"$innerId\" class=\"cc-img-text$animClass$innerClass\" style=\"$styleAttr; display:flex; gap:40px; align-items:center; flex-direction:$layout; flex-wrap:wrap;\">\n<div style=\"flex:1 1 300px; width:100%;\"><img src=\"$src\" style=\"width:100%; border-radius:8px; display:block;\"></div>\n<div style=\"flex:1 1 300px; width:100%;\">$text</div>\n</section>\n";
            return $customCss . $html;

        case 'CARDS':
            $html = "<section id=\"$innerId\" class=\"cc-cards$animClass$innerClass\" style=\"$styleAttr\">\n<div style=\"display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;\">\n";
            if (!empty($block['content']['items']) && is_array($block['content']['items'])) {
                foreach ($block['content']['items'] as $item) { $item = cc_sanitize_html($item); $html .= "<div style=\"background:#fff; padding:30px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05); border:1px solid #e2e8f0; min-width:0;\">$item</div>\n"; }
            }
            $html .= "</div>\n</section>\n";
            return $customCss . $html;

        case 'VIDEO':
            $url = $block['content']['url'] ?? '';
            $embed_url = '';
            if (strpos($url, 'youtube.com') !== false || strpos($url, 'youtu.be') !== false) {
                preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})%i', $url, $match);
                if (isset($match[1])) $embed_url = 'https://www.youtube.com/embed/' . $match[1];
            } elseif (strpos($url, 'vimeo.com') !== false) {
                if (preg_match('/vimeo\.com\/(?:video\/)?([0-9]+)/i', $url, $match)) $embed_url = 'https://player.vimeo.com/video/' . $match[1];
            }
            if ($embed_url) {
                $html = "<div id=\"$innerId\" class=\"cc-video$animClass$innerClass\"$styleString>\n<div style=\"position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:inherit;\">\n<iframe src=\"$embed_url\" style=\"position:absolute; top:0; left:0; width:100%; height:100%; border:0;\" allowfullscreen loading=\"lazy\"></iframe>\n</div>\n</div>\n";
                return $customCss . $html;
            }
            return '';

        case 'FORM':
            $raw_email = trim($block['content']['email'] ?? '');
            $btnText = htmlspecialchars($block['content']['btnText'] ?? 'Send Message');
            $successMsg = htmlspecialchars($block['content']['successMsg'] ?? 'Sent!');
            $title = cc_sanitize_html($block['content']['title'] ?? '<h3>Contact Us</h3>');
            // Stable form ID + server-side recipient registration (no email addresses in the client)
            $form_id = !empty($block['content']['customId'])
                ? 'f_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $block['content']['customId'])
                : 'f_' . substr(sha1(($block['id'] ?? '') . '|' . $raw_email), 0, 16);
            $reg =& cc_form_registry(); $reg[$form_id] = $raw_email;

            $html = "<div id=\"$innerId\" class=\"cc-form-block$animClass$innerClass\"$styleString>\n<div style=\"margin-bottom:20px;\">$title</div>\n<form id=\"$form_id\" action=\"{{BASE_URL}}canvascore-admin/submit_form.php\" method=\"POST\">\n<input type=\"hidden\" name=\"_form\" value=\"$form_id\">\n<input type=\"hidden\" name=\"_success\" value=\"$successMsg\">\n<input type=\"text\" name=\"_hp\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\" style=\"position:absolute; left:-9999px; width:0; height:0; opacity:0;\">\n";

            $fields = $block['content']['fields'] ?? [['label' => 'Name', 'type' => 'text', 'required' => true], ['label' => 'Email', 'type' => 'email', 'required' => true], ['label' => 'Message', 'type' => 'textarea', 'required' => true]];
            foreach($fields as $i => $f) {
                $fLabel = htmlspecialchars($f['label']); $fType = $f['type']; $fReq = !empty($f['required']) ? 'required' : '';
                $name = "field_" . $i;
                $html .= "<input type=\"hidden\" name=\"_label_$name\" value=\"$fLabel\">\n";
                $html .= "<div style=\"margin-bottom:15px;\"><label style=\"display:block; margin-bottom:5px; font-weight:600;\">$fLabel</label>";
                if ($fType === 'textarea') {
                    $html .= "<textarea name=\"$name\" $fReq rows=\"4\" style=\"width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; background:#fff; box-sizing:border-box;\"></textarea>";
                } else {
                    $html .= "<input type=\"$fType\" name=\"$name\" $fReq style=\"width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; background:#fff; box-sizing:border-box;\">";
                }
                $html .= "</div>\n";
            }
            $html .= "<button type=\"submit\" style=\"padding:12px 24px; background:var(--brand-color, #3b82f6); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;\">$btnText</button>\n</form>\n</div>\n";
            return $customCss . $html;

        case 'ACCORDION': {
            $items = array_values((isset($block['content']['items']) && is_array($block['content']['items'])) ? $block['content']['items'] : []);
            $multi = !empty($block['content']['allowMultiple']);
            $openFirst = !empty($block['content']['openFirst']);
            $icon = $block['content']['icon'] ?? 'plus';
            $variant = $block['content']['variant'] ?? 'card';
            $iconChar = $icon === 'chevron' ? '&#9662;' : ($icon === 'none' ? '' : '+');
            $rot = $icon === 'chevron' ? 'rotate(180deg)' : 'rotate(45deg)';
            $itemStyle = $variant === 'flat'
                ? 'border-bottom:1px solid #e2e8f0;'
                : 'margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;';
            $sumStyle = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; font-weight:600; cursor:pointer; list-style:none;';
            $bodyStyle = 'padding:4px 18px 16px; font-size:15px; color:#475569; line-height:1.6;';
            $html  = '<div id="' . $innerId . '" class="cc-accordion' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n";
            $html .= '<style>#' . $innerId . ' .cc-acc-item>summary{list-style:none}#' . $innerId . ' .cc-acc-item>summary::-webkit-details-marker{display:none}#' . $innerId . ' .cc-acc-icon{transition:transform .2s ease; display:inline-block; color:var(--brand-color, #3b82f6)}#' . $innerId . ' .cc-acc-item[open]>summary .cc-acc-icon{transform:' . $rot . '}</style>' . "\n";
            foreach ($items as $i => $it) {
                $title = htmlspecialchars($it['title'] ?? '');
                $body = cc_sanitize_html($it['content'] ?? '');
                $attrs = ($multi ? '' : ' name="' . $innerId . '"') . (($openFirst && $i === 0) ? ' open' : '');
                $html .= '<details class="cc-acc-item"' . $attrs . ' style="' . $itemStyle . '">' . "\n";
                $html .= '<summary style="' . $sumStyle . '"><span class="cc-acc-title">' . $title . '</span>' . ($iconChar !== '' ? '<span class="cc-acc-icon" aria-hidden="true">' . $iconChar . '</span>' : '') . '</summary>' . "\n";
                $html .= '<div class="cc-acc-body" style="' . $bodyStyle . '">' . $body . '</div>' . "\n";
                $html .= '</details>' . "\n";
            }
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'TABS': {
            $items = array_values((isset($block['content']['items']) && is_array($block['content']['items'])) ? $block['content']['items'] : []);
            $variant = $block['content']['variant'] ?? 'underline';
            $align = $block['content']['tabAlign'] ?? 'left';
            $justify = $align === 'center' ? 'center' : ($align === 'right' ? 'flex-end' : 'flex-start');
            $n = count($items);
            $barStyle = 'display:flex; flex-wrap:wrap; gap:6px; justify-content:' . $justify . ';' . ($variant === 'underline' ? ' border-bottom:1px solid #e2e8f0;' : '');
            $tabStyle = $variant === 'pills'
                ? 'display:inline-block; padding:8px 16px; border-radius:999px; font-weight:600; font-size:14px; cursor:pointer; color:#475569; background:#f1f5f9;'
                : 'display:inline-block; padding:10px 16px; font-weight:600; font-size:14px; cursor:pointer; color:#64748b; border-bottom:2px solid transparent; margin-bottom:-1px;';
            $activeCss = $variant === 'pills'
                ? 'background:var(--brand-color, #3b82f6) !important; color:#fff !important;'
                : 'color:var(--brand-color, #3b82f6) !important; border-bottom-color:var(--brand-color, #3b82f6) !important;';
            $css = '#' . $innerId . ' .cc-tab-input{position:absolute; opacity:0; width:0; height:0; pointer-events:none}#' . $innerId . ' .cc-tab-panel{display:none}';
            for ($k = 1; $k <= $n; $k++) {
                $css .= '#' . $innerId . ' .cc-tab-input:nth-of-type(' . $k . '):checked ~ .cc-tab-bar .cc-tab:nth-child(' . $k . '){' . $activeCss . '}';
                $css .= '#' . $innerId . ' .cc-tab-input:nth-of-type(' . $k . '):checked ~ .cc-tab-panels .cc-tab-panel:nth-child(' . $k . '){display:block}';
                $css .= '#' . $innerId . ' .cc-tab-input:nth-of-type(' . $k . '):focus-visible ~ .cc-tab-bar .cc-tab:nth-child(' . $k . '){outline:2px solid var(--brand-color, #3b82f6); outline-offset:2px}';
            }
            $inputs = ''; $labels = ''; $panels = '';
            foreach ($items as $i => $it) {
                $k = $i + 1;
                $title = htmlspecialchars($it['title'] ?? '');
                $body = cc_sanitize_html($it['content'] ?? '');
                $inputs .= '<input type="radio" class="cc-tab-input" name="' . $innerId . '-tabs" id="' . $innerId . '-t' . $k . '"' . ($i === 0 ? ' checked' : '') . '>';
                $labels .= '<label class="cc-tab" for="' . $innerId . '-t' . $k . '" style="' . $tabStyle . '">' . $title . '</label>';
                $panels .= '<div class="cc-tab-panel" style="font-size:15px; line-height:1.6; color:#475569;">' . $body . '</div>';
            }
            $html  = '<div id="' . $innerId . '" class="cc-tabs' . $animClass . $innerClass . '" style="' . $styleAttr . ' position:relative;">' . "\n";
            $html .= '<style>' . $css . '</style>' . "\n";
            $html .= $inputs . "\n";
            $html .= '<div class="cc-tab-bar" style="' . $barStyle . '">' . $labels . '</div>' . "\n";
            $html .= '<div class="cc-tab-panels" style="padding-top:18px;">' . $panels . '</div>' . "\n";
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'PRICING': {
            $plans = array_values((isset($block['content']['plans']) && is_array($block['content']['plans'])) ? $block['content']['plans'] : []);
            $cols = intval($block['content']['columns'] ?? 0);
            if ($cols < 1) $cols = max(1, min(4, count($plans)));
            $cols = min($cols, 4);
            $cards = '';
            foreach ($plans as $pl) {
                $hl = !empty($pl['highlighted']);
                $name = htmlspecialchars($pl['name'] ?? '');
                $price = htmlspecialchars($pl['price'] ?? '');
                $period = htmlspecialchars($pl['period'] ?? '');
                $desc = htmlspecialchars($pl['description'] ?? '');
                $badge = htmlspecialchars($pl['badge'] ?? '');
                $btnText = htmlspecialchars($pl['buttonText'] ?? '');
                $btnUrl = htmlspecialchars(cc_block_url($pl['buttonUrl'] ?? '#'));
                $cardStyle = 'position:relative; display:flex; flex-direction:column; padding:28px 24px; border-radius:14px; background:#fff; box-sizing:border-box; ' . ($hl ? 'border:2px solid var(--brand-color, #3b82f6); box-shadow:0 10px 30px rgba(15,23,42,0.12);' : 'border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(15,23,42,0.04);');
                $badgeHtml = ($badge !== '') ? '<div class="cc-plan-badge" style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--brand-color, #3b82f6); color:#fff; font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:4px 12px; border-radius:999px; white-space:nowrap;">' . $badge . '</div>' : '';
                $periodHtml = ($period !== '') ? '<span class="cc-plan-period" style="font-size:14px; color:#64748b; margin-left:4px;">' . $period . '</span>' : '';
                $descHtml = ($desc !== '') ? '<p class="cc-plan-desc" style="margin:10px 0 0 0; font-size:14px; color:#64748b; line-height:1.5;">' . $desc . '</p>' : '';
                $feat = '';
                $features = (isset($pl['features']) && is_array($pl['features'])) ? $pl['features'] : [];
                foreach ($features as $f) {
                    $f = trim((string)$f);
                    if ($f === '') continue;
                    $feat .= '<li style="display:flex; gap:10px; align-items:flex-start; margin:0 0 10px 0; font-size:14px; color:#334155;"><span aria-hidden="true" style="color:var(--brand-color, #3b82f6); font-weight:700;">&#10003;</span><span>' . htmlspecialchars($f) . '</span></li>';
                }
                $btnHtml = ($btnText !== '') ? '<a href="' . $btnUrl . '" class="cc-plan-btn" style="display:block; text-align:center; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:8px; margin-top:auto; box-sizing:border-box; ' . ($hl ? 'background:var(--brand-color, #3b82f6); color:#fff;' : 'background:#f1f5f9; color:#0f172a;') . '">' . $btnText . '</a>' : '';
                $cards .= '<div class="cc-plan' . ($hl ? ' cc-plan-hl' : '') . '" style="' . $cardStyle . '">' . $badgeHtml
                    . '<h3 class="cc-plan-name" style="margin:0; font-size:18px; color:#0f172a;">' . $name . '</h3>'
                    . '<div class="cc-plan-price" style="margin-top:14px; display:flex; align-items:baseline;"><span class="cc-plan-amount" style="font-size:38px; font-weight:800; color:#0f172a; line-height:1;">' . $price . '</span>' . $periodHtml . '</div>'
                    . $descHtml
                    . '<ul class="cc-plan-features" style="list-style:none; padding:0; margin:20px 0 24px 0;">' . $feat . '</ul>'
                    . $btnHtml . '</div>';
            }
            $html  = '<style>@media(max-width:900px){#' . $innerId . ' .cc-pricing-grid{grid-template-columns:1fr !important}}</style>';
            $html .= '<div id="' . $innerId . '" class="cc-pricing' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n";
            $html .= '<div class="cc-pricing-grid" style="display:grid; grid-template-columns:repeat(' . $cols . ', 1fr); gap:24px; align-items:stretch; padding-top:12px;">' . $cards . '</div>' . "\n";
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'GALLERY': {
            $images = array_values((isset($block['content']['images']) && is_array($block['content']['images'])) ? $block['content']['images'] : []);
            $isMasonry = (($block['content']['layout'] ?? 'grid') === 'masonry');
            $cols = max(1, min(6, intval($block['content']['columns'] ?? 3)));
            $gap = max(0, min(80, intval($block['content']['gap'] ?? 12)));
            $ar = $block['content']['aspectRatio'] ?? '1 / 1';
            $radius = htmlspecialchars($block['content']['borderRadius'] ?? '8px');
            $lightbox = (($block['content']['lightbox'] ?? true) !== false) && count($images) > 0;
            $captions = !empty($block['content']['showCaptions']);
            $mobCols = min($cols, 2);
            $useAr = (!$isMasonry && $ar && $ar !== 'auto');
            $containerStyle = $isMasonry
                ? 'column-count:' . $cols . '; column-gap:' . $gap . 'px;'
                : 'display:grid; grid-template-columns:repeat(' . $cols . ', 1fr); gap:' . $gap . 'px;';
            $figStyle = $isMasonry ? 'margin:0 0 ' . $gap . 'px 0; break-inside:avoid;' : 'margin:0;';
            $itemStyle = 'display:block; overflow:hidden; border-radius:' . $radius . ';' . ($useAr ? ' aspect-ratio:' . htmlspecialchars($ar) . ';' : '') . ($lightbox ? ' cursor:zoom-in;' : '');
            $imgStyle = $useAr ? 'width:100%; height:100%; object-fit:cover; display:block;' : 'width:100%; height:auto; display:block;';
            $figs = '';
            foreach ($images as $im) {
                $src = htmlspecialchars($im['src'] ?? '');
                $alt = htmlspecialchars($im['alt'] ?? '');
                $cap = htmlspecialchars($im['caption'] ?? '');
                $imgHtml = '<img src="' . $src . '" alt="' . $alt . '" loading="lazy" style="' . $imgStyle . '">';
                $inner = $lightbox
                    ? '<a href="' . $src . '" class="cc-gal-item" data-caption="' . $cap . '" style="' . $itemStyle . '">' . $imgHtml . '</a>'
                    : '<div class="cc-gal-item" style="' . $itemStyle . '">' . $imgHtml . '</div>';
                $capHtml = ($captions && $cap !== '') ? '<figcaption class="cc-gal-cap" style="font-size:13px; color:#64748b; margin-top:6px;">' . $cap . '</figcaption>' : '';
                $figs .= '<figure class="cc-gal-fig" style="' . $figStyle . '">' . $inner . $capHtml . '</figure>';
            }
            $mobCss = $isMasonry ? 'column-count:' . $mobCols . ' !important' : 'grid-template-columns:repeat(' . $mobCols . ', 1fr) !important';
            $html  = '<style>@media(max-width:768px){#' . $innerId . ' .cc-gal-grid{' . $mobCss . '}}</style>';
            $html .= '<div id="' . $innerId . '" class="cc-gallery' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n";
            $html .= '<div class="cc-gal-grid" style="' . $containerStyle . '">' . $figs . '</div>' . "\n";
            if ($lightbox) {
                $btn = 'position:absolute; background:rgba(15,23,42,0.6); color:#fff; border:none; cursor:pointer; line-height:1; border-radius:999px; width:44px; height:44px; font-size:26px;';
                $html .= '<div class="cc-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" style="display:none; position:fixed; top:0; right:0; bottom:0; left:0; background:rgba(2,6,23,0.92); z-index:100000; align-items:center; justify-content:center; flex-direction:column;">'
                    . '<button type="button" class="cc-lb-close" aria-label="Close" style="' . $btn . ' top:16px; right:16px;">&times;</button>'
                    . '<button type="button" class="cc-lb-prev" aria-label="Previous" style="' . $btn . ' left:16px; top:50%; margin-top:-22px;">&#8249;</button>'
                    . '<img class="cc-lb-img" alt="" style="max-width:90vw; max-height:78vh; object-fit:contain; border-radius:8px;">'
                    . '<div class="cc-lb-cap" style="color:#e2e8f0; font-size:14px; margin-top:12px; text-align:center; padding:0 60px;"></div>'
                    . '<button type="button" class="cc-lb-next" aria-label="Next" style="' . $btn . ' right:16px; top:50%; margin-top:-22px;">&#8250;</button>'
                    . '</div>' . "\n";
                $html .= "<script>\n(function(){\n"
                    . "var root=document.getElementById('" . $innerId . "'); if(!root) return;\n"
                    . "var items=[].slice.call(root.querySelectorAll('a.cc-gal-item')); var box=root.querySelector('.cc-lightbox'); if(!box||!items.length) return;\n"
                    . "document.body.appendChild(box);\n"
                    . "var img=box.querySelector('.cc-lb-img'), cap=box.querySelector('.cc-lb-cap'), cur=0, last=null;\n"
                    . "function show(i){cur=(i+items.length)%items.length; var a=items[cur]; img.src=a.getAttribute('href'); var t=a.querySelector('img'); img.alt=t?t.alt:''; cap.textContent=a.getAttribute('data-caption')||'';}\n"
                    . "function open(i){last=document.activeElement; show(i); box.style.display='flex'; document.documentElement.style.overflow='hidden'; box.querySelector('.cc-lb-close').focus();}\n"
                    . "function close(){box.style.display='none'; document.documentElement.style.overflow=''; if(last&&last.focus) last.focus();}\n"
                    . "items.forEach(function(a,i){a.addEventListener('click',function(e){e.preventDefault(); open(i);});});\n"
                    . "box.querySelector('.cc-lb-close').addEventListener('click',close);\n"
                    . "box.querySelector('.cc-lb-prev').addEventListener('click',function(){show(cur-1);});\n"
                    . "box.querySelector('.cc-lb-next').addEventListener('click',function(){show(cur+1);});\n"
                    . "box.addEventListener('click',function(e){if(e.target===box) close();});\n"
                    . "document.addEventListener('keydown',function(e){if(box.style.display==='none') return; if(e.key==='Escape') close(); else if(e.key==='ArrowLeft') show(cur-1); else if(e.key==='ArrowRight') show(cur+1);});\n"
                    . "var sx=null; box.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});\n"
                    . "box.addEventListener('touchend',function(e){if(sx===null) return; var dx=e.changedTouches[0].clientX-sx; if(Math.abs(dx)>50) show(cur+(dx<0?1:-1)); sx=null;});\n"
                    . "box.addEventListener('keydown',function(e){if(e.key!=='Tab') return; var f=box.querySelectorAll('button'); var a=f[0], z=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){e.preventDefault(); z.focus();} else if(!e.shiftKey&&document.activeElement===z){e.preventDefault(); a.focus();}});\n"
                    . "})();\n</script>\n";
            }
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'DIVIDER': {
            $c = $block['content'] ?? [];
            $style = $c['style'] ?? 'line';
            if (!in_array($style, ['line', 'gradient', 'dots', 'wave', 'curve', 'diagonal', 'spacer'], true)) $style = 'line';
            $color = cc_color($c['color'] ?? '', '#cbd5e1');
            $thick = (int)cc_num($c['thickness'] ?? 2, 1, 20, 2);
            $width = (int)cc_num($c['width'] ?? 100, 10, 100, 100);
            $height = (int)cc_num($c['height'] ?? 80, 10, 400, 80);
            $flip = !empty($c['flip']);
            if ($style === 'line') {
                $inner = '<hr class="cc-divider-line" style="border:0; border-top:' . $thick . 'px solid ' . $color . '; width:' . $width . '%; margin:0 auto;">';
            } elseif ($style === 'gradient') {
                $inner = '<div class="cc-divider-line" aria-hidden="true" style="height:' . $thick . 'px; width:' . $width . '%; margin:0 auto; background:linear-gradient(90deg, transparent, ' . $color . ', transparent);"></div>';
            } elseif ($style === 'dots') {
                $inner = '<div class="cc-divider-dots" aria-hidden="true" style="text-align:center; color:' . $color . '; font-size:' . (8 + $thick * 2) . 'px; letter-spacing:10px; line-height:1;">&bull;&bull;&bull;</div>';
            } elseif ($style === 'spacer') {
                $inner = '<div class="cc-divider-spacer" aria-hidden="true" style="height:' . $height . 'px;"></div>';
            } else {
                $paths = [
                    'wave' => 'M0,60 C150,100 350,20 600,60 C850,100 1050,20 1200,60 L1200,120 L0,120 Z',
                    'curve' => 'M0,0 C300,120 900,120 1200,0 L1200,120 L0,120 Z',
                    'diagonal' => 'M0,120 L1200,0 L1200,120 Z',
                ];
                $inner = '<svg class="cc-divider-shape" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="display:block; width:100%; height:' . $height . 'px;' . ($flip ? ' transform:scaleY(-1);' : '') . '"><path d="' . $paths[$style] . '" fill="' . $color . '"></path></svg>';
            }
            return $customCss . '<div id="' . $innerId . '" class="cc-divider cc-divider-' . $style . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n" . $inner . "\n</div>\n";
        }

        case 'CALLOUT': {
            $c = $block['content'] ?? [];
            $variants = [
                'info' => ['#e0f2fe', '#0284c7', '#0c4a6e', '&#8505;'],
                'success' => ['#dcfce7', '#16a34a', '#14532d', '&#10003;'],
                'warning' => ['#fef3c7', '#d97706', '#78350f', '&#9888;'],
                'danger' => ['#fee2e2', '#dc2626', '#7f1d1d', '&#10006;'],
                'note' => ['#f1f5f9', '#64748b', '#1e293b', '&#9998;'],
            ];
            $v = $c['variant'] ?? 'info';
            if (!isset($variants[$v])) $v = 'info';
            list($bg, $bd, $fg, $ic) = $variants[$v];
            $title = htmlspecialchars($c['title'] ?? '');
            $text = cc_sanitize_html($c['text'] ?? '');
            $showIcon = ($c['showIcon'] ?? true) !== false;
            $html = '<div id="' . $innerId . '" class="cc-callout cc-callout-' . $v . $animClass . $innerClass . '" role="note" style="' . $styleAttr . ' display:flex; gap:14px; padding:16px 18px; border-radius:10px; border-left:4px solid ' . $bd . '; background:' . $bg . '; color:' . $fg . ';">'
                . ($showIcon ? '<span class="cc-callout-icon" aria-hidden="true" style="font-size:20px; line-height:1.3; flex-shrink:0;">' . $ic . '</span>' : '')
                . '<div class="cc-callout-body" style="flex:1; min-width:0;">'
                . ($title !== '' ? '<div class="cc-callout-title" style="font-weight:700; margin-bottom:4px;">' . $title . '</div>' : '')
                . '<div class="cc-callout-text" style="font-size:15px; line-height:1.55;">' . $text . '</div></div></div>' . "\n";
            return $customCss . $html;
        }

        case 'STEPS': {
            $c = $block['content'] ?? [];
            $items = array_values((isset($c['items']) && is_array($c['items'])) ? $c['items'] : []);
            $vertical = (($c['layout'] ?? 'horizontal') === 'vertical');
            $cols = max(1, min(4, count($items)));
            if ($vertical) {
                $css = '#' . $innerId . ' .cc-step{position:relative; padding-left:60px; padding-bottom:28px}#' . $innerId . ' .cc-step:last-child{padding-bottom:0}#' . $innerId . ' .cc-step:not(:last-child)::after{content:""; position:absolute; left:19px; top:44px; bottom:4px; width:2px; background:#e2e8f0}';
                $rootStyle = ' list-style:none; margin:0; padding:0;';
                $numStyle = 'position:absolute; left:0; top:0; ';
            } else {
                $css = '#' . $innerId . ' .cc-step{position:relative; text-align:center}#' . $innerId . ' .cc-step:not(:last-child)::after{content:""; position:absolute; top:19px; left:calc(50% + 28px); width:calc(100% - 32px); height:2px; background:#e2e8f0}@media(max-width:768px){#' . $innerId . '.cc-steps-horizontal{grid-template-columns:1fr !important}#' . $innerId . ' .cc-step:not(:last-child)::after{display:none}}';
                $rootStyle = ' list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(' . $cols . ', 1fr); gap:24px;';
                $numStyle = 'margin:0 auto 14px; ';
            }
            $lis = '';
            foreach ($items as $i => $it) {
                $title = htmlspecialchars($it['title'] ?? '');
                $text = htmlspecialchars($it['text'] ?? '');
                $lis .= '<li class="cc-step"><div class="cc-step-num" style="' . $numStyle . 'display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:var(--brand-color, #3b82f6); color:#fff; font-weight:700;">' . ($i + 1) . '</div>'
                    . '<h3 class="cc-step-title" style="margin:0 0 6px 0; font-size:17px;">' . $title . '</h3>'
                    . ($text !== '' ? '<p class="cc-step-text" style="margin:0; font-size:14px; color:#64748b; line-height:1.55;">' . $text . '</p>' : '')
                    . '</li>';
            }
            return $customCss . '<style>' . $css . '</style>'
                . '<ol id="' . $innerId . '" class="cc-steps cc-steps-' . ($vertical ? 'vertical' : 'horizontal') . $animClass . $innerClass . '" style="' . $styleAttr . $rootStyle . '">' . $lis . '</ol>' . "\n";
        }

        case 'COUNTERS': {
            $c = $block['content'] ?? [];
            $items = array_values((isset($c['items']) && is_array($c['items'])) ? $c['items'] : []);
            $cols = (int)cc_num($c['columns'] ?? 0, 0, 4, 0);
            if ($cols < 1) $cols = max(1, min(4, count($items)));
            $animate = ($c['animate'] ?? true) !== false;
            $dur = (int)cc_num($c['duration'] ?? 1800, 500, 5000, 1800);
            $cells = '';
            foreach ($items as $it) {
                $val = is_numeric($it['value'] ?? null) ? (float)$it['value'] : 0.0;
                $dec = (int)cc_num($it['decimals'] ?? 0, 0, 2, 0);
                $pre = htmlspecialchars($it['prefix'] ?? '');
                $suf = htmlspecialchars($it['suffix'] ?? '');
                $label = htmlspecialchars($it['label'] ?? '');
                $cells .= '<div class="cc-counter" style="text-align:center; padding:8px;"><div class="cc-counter-value" data-target="' . $val . '" data-decimals="' . $dec . '" data-prefix="' . $pre . '" data-suffix="' . $suf . '" style="font-size:44px; font-weight:800; color:var(--brand-color, #3b82f6); line-height:1.1; font-variant-numeric:tabular-nums;">' . $pre . cc_fmt_num($val, $dec) . $suf . '</div>'
                    . ($label !== '' ? '<div class="cc-counter-label" style="margin-top:6px; color:#64748b; font-size:15px;">' . $label . '</div>' : '') . '</div>';
            }
            $html = '<style>@media(max-width:768px){#' . $innerId . ' .cc-counters-grid{grid-template-columns:repeat(2, 1fr) !important}}</style>';
            $html .= '<div id="' . $innerId . '" class="cc-counters' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n";
            $html .= '<div class="cc-counters-grid" style="display:grid; grid-template-columns:repeat(' . $cols . ', 1fr); gap:16px;">' . $cells . '</div>' . "\n";
            if ($animate && $items) $html .= "<script>\n" . cc_script_counters($innerId, $dur) . "\n</script>\n";
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'PROGRESS': {
            $c = $block['content'] ?? [];
            $items = array_values((isset($c['items']) && is_array($c['items'])) ? $c['items'] : []);
            $h = (int)cc_num($c['height'] ?? 10, 4, 30, 10);
            $showValue = ($c['showValue'] ?? true) !== false;
            $animate = ($c['animate'] ?? true) !== false;
            $rows = '';
            foreach ($items as $it) {
                $label = htmlspecialchars($it['label'] ?? '');
                $val = round(cc_num($it['value'] ?? 0, 0, 100, 0), 1);
                $color = cc_color($it['color'] ?? '', 'var(--brand-color, #3b82f6)');
                $rows .= '<div class="cc-progress-item" style="margin-bottom:18px;"><div class="cc-progress-head" style="display:flex; justify-content:space-between; font-size:14px; font-weight:600; margin-bottom:6px;"><span class="cc-progress-label">' . $label . '</span>'
                    . ($showValue ? '<span class="cc-progress-value">' . $val . '%</span>' : '') . '</div>'
                    . '<div class="cc-progress-track" role="progressbar" aria-label="' . $label . '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' . $val . '" style="height:' . $h . 'px; background:#e2e8f0; border-radius:999px; overflow:hidden;"><div class="cc-progress-fill" data-w="' . $val . '" style="width:' . $val . '%; height:100%; background:' . $color . '; border-radius:999px;"></div></div></div>';
            }
            $html = '<div id="' . $innerId . '" class="cc-progress' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n" . $rows . "\n";
            if ($animate && $items) $html .= "<script>\n" . cc_script_progress($innerId) . "\n</script>\n";
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'TABLE': {
            $c = $block['content'] ?? [];
            $lines = cc_lines($c['data'] ?? '');
            $rows = [];
            foreach ($lines as $l) $rows[] = preg_split('/\s*\|\s*|\t/', $l);
            $headerRow = ($c['headerRow'] ?? true) !== false;
            $striped = ($c['striped'] ?? true) !== false;
            $bordered = !empty($c['bordered']);
            $compact = !empty($c['compact']);
            $rowHeaders = !empty($c['rowHeaders']);
            $sticky = !empty($c['stickyHeader']);
            $maxH = (int)cc_num($c['maxHeight'] ?? 0, 0, 1200, 0);
            $caption = htmlspecialchars($c['caption'] ?? '');
            $head = ($headerRow && $rows) ? array_shift($rows) : null;
            $ncols = 0;
            if ($head) $ncols = count($head);
            foreach ($rows as $r) $ncols = max($ncols, count($r));
            $pad = $compact ? '6px 10px' : '12px 14px';
            $wrap = 'overflow-x:auto;' . (($sticky && $maxH > 0) ? ' max-height:' . $maxH . 'px; overflow-y:auto;' : '');
            $cellBorder = $bordered ? 'border:1px solid #e2e8f0;' : 'border-bottom:1px solid #e2e8f0;';
            $thStyle = 'padding:' . $pad . '; background:#f1f5f9; border-bottom:2px solid #cbd5e1; font-weight:700;' . ($sticky ? ' position:sticky; top:0;' : '') . ($bordered ? ' border:1px solid #cbd5e1;' : '');
            $table = '';
            if ($ncols > 0) {
                $table .= '<table class="cc-table" style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">';
                if ($caption !== '') $table .= '<caption style="caption-side:top; text-align:left; font-weight:700; padding:0 0 10px 0;">' . $caption . '</caption>';
                if ($head) {
                    $table .= '<thead><tr>';
                    for ($i = 0; $i < $ncols; $i++) $table .= '<th scope="col" style="' . $thStyle . '">' . htmlspecialchars($head[$i] ?? '') . '</th>';
                    $table .= '</tr></thead>';
                }
                $table .= '<tbody>';
                foreach ($rows as $ri => $r) {
                    $table .= '<tr' . (($striped && $ri % 2 === 1) ? ' style="background:#f8fafc;"' : '') . '>';
                    for ($i = 0; $i < $ncols; $i++) {
                        $cell = htmlspecialchars($r[$i] ?? '');
                        if ($i === 0 && $rowHeaders) $table .= '<th scope="row" style="padding:' . $pad . '; ' . $cellBorder . ' font-weight:600;">' . $cell . '</th>';
                        else $table .= '<td style="padding:' . $pad . '; ' . $cellBorder . '">' . $cell . '</td>';
                    }
                    $table .= '</tr>';
                }
                $table .= '</tbody></table>';
            }
            return $customCss . '<div id="' . $innerId . '" class="cc-table-block' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n" . '<div class="cc-table-wrap" style="' . $wrap . '">' . $table . '</div>' . "\n</div>\n";
        }

        case 'COUNTDOWN': {
            $c = $block['content'] ?? [];
            $dt = trim((string)($c['datetime'] ?? ''));
            if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $dt)) $dt = '2030-01-01T00:00';
            $tz = (string)($c['utcOffset'] ?? 'local');
            if ($tz !== 'local' && !preg_match('/^[+-]\d{2}:\d{2}$/', $tz)) $tz = 'local';
            $target = ($tz === 'local') ? $dt : $dt . ':00' . $tz;
            $dateText = str_replace('T', ' ', $dt) . (($tz === 'local') ? '' : ' UTC' . $tz);
            $end = (($c['endAction'] ?? 'message') === 'hide') ? 'hide' : 'message';
            $endMsg = htmlspecialchars($c['endMessage'] ?? '');
            $showSeconds = ($c['showSeconds'] ?? true) !== false;
            $showDate = ($c['showDate'] ?? true) !== false;
            $units = [['days', 'labelDays', 'Days'], ['hours', 'labelHours', 'Hours'], ['minutes', 'labelMinutes', 'Minutes']];
            if ($showSeconds) $units[] = ['seconds', 'labelSeconds', 'Seconds'];
            $cells = '';
            foreach ($units as $u) {
                $cells .= '<div class="cc-cd-unit" style="text-align:center; min-width:72px;"><span class="cc-cd-num" data-unit="' . $u[0] . '" style="display:block; font-size:42px; font-weight:800; line-height:1.1; font-variant-numeric:tabular-nums; color:var(--brand-color, #3b82f6);">00</span>'
                    . '<span class="cc-cd-label" style="display:block; font-size:13px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-top:4px;">' . htmlspecialchars($c[$u[1]] ?? $u[2]) . '</span></div>';
            }
            $html = '<div id="' . $innerId . '" class="cc-countdown' . $animClass . $innerClass . '" data-target="' . htmlspecialchars($target) . '" data-end="' . $end . '" role="timer" style="' . $styleAttr . '">' . "\n";
            $html .= '<div class="cc-cd-units" style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">' . $cells . '</div>' . "\n";
            if ($showDate) $html .= '<div class="cc-cd-date" style="text-align:center; font-size:13px; color:#94a3b8; margin-top:12px;"><time datetime="' . htmlspecialchars($target) . '">' . htmlspecialchars($dateText) . '</time></div>' . "\n";
            $html .= '<div class="cc-cd-done" hidden style="text-align:center; font-size:22px; font-weight:700;">' . $endMsg . '</div>' . "\n";
            $html .= "<script>\n" . cc_script_countdown($innerId) . "\n</script>\n";
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'TIMELINE': {
            $c = $block['content'] ?? [];
            $items = array_values((isset($c['items']) && is_array($c['items'])) ? $c['items'] : []);
            $alt = (($c['layout'] ?? 'left') === 'alternate');
            $css = '#' . $innerId . '::before{content:""; position:absolute; left:9px; top:6px; bottom:6px; width:2px; background:#e2e8f0}#' . $innerId . ' .cc-tl-item{position:relative; margin-bottom:28px}#' . $innerId . ' .cc-tl-item:last-child{margin-bottom:0}#' . $innerId . ' .cc-tl-dot{position:absolute; left:-34px; top:4px; width:20px; height:20px; border-radius:50%; background:var(--brand-color, #3b82f6); border:4px solid #fff; box-shadow:0 0 0 2px #e2e8f0; box-sizing:border-box}';
            if ($alt) {
                $css .= '@media(min-width:769px){#' . $innerId . '{padding-left:0 !important}#' . $innerId . '::before{left:50%; margin-left:-1px}#' . $innerId . ' .cc-tl-item{width:50%; box-sizing:border-box; padding-right:36px; text-align:right}#' . $innerId . ' .cc-tl-item:nth-child(even){margin-left:50%; padding-right:0; padding-left:36px; text-align:left}#' . $innerId . ' .cc-tl-dot{left:auto; right:-46px}#' . $innerId . ' .cc-tl-item:nth-child(even) .cc-tl-dot{right:auto; left:-46px}}';
            }
            $lis = '';
            foreach ($items as $it) {
                $date = htmlspecialchars($it['date'] ?? '');
                $title = htmlspecialchars($it['title'] ?? '');
                $text = htmlspecialchars($it['text'] ?? '');
                $lis .= '<li class="cc-tl-item"><span class="cc-tl-dot" aria-hidden="true"></span>'
                    . ($date !== '' ? '<div class="cc-tl-date" style="font-size:13px; font-weight:700; color:var(--brand-color, #3b82f6); margin-bottom:4px;">' . $date . '</div>' : '')
                    . '<h3 class="cc-tl-title" style="margin:0 0 6px 0; font-size:18px;">' . $title . '</h3>'
                    . ($text !== '' ? '<p class="cc-tl-text" style="margin:0; font-size:14px; color:#64748b; line-height:1.55;">' . $text . '</p>' : '')
                    . '</li>';
            }
            return $customCss . '<style>' . $css . '</style><ol id="' . $innerId . '" class="cc-timeline cc-timeline-' . ($alt ? 'alternate' : 'left') . $animClass . $innerClass . '" style="' . $styleAttr . ' list-style:none; margin:0; padding:0 0 0 34px; position:relative;">' . $lis . '</ol>' . "\n";
        }

        case 'LOGOS': {
            $c = $block['content'] ?? [];
            $logos = array_values((isset($c['logos']) && is_array($c['logos'])) ? $c['logos'] : []);
            $marquee = (($c['layout'] ?? 'grid') === 'marquee');
            $title = htmlspecialchars($c['title'] ?? '');
            $cols = (int)cc_num($c['columns'] ?? 5, 1, 8, 5);
            $h = (int)cc_num($c['height'] ?? 48, 20, 120, 48);
            $gap = (int)cc_num($c['gap'] ?? 40, 8, 80, 40);
            $gray = ($c['grayscale'] ?? true) !== false;
            $speed = (int)cc_num($c['speed'] ?? 30, 10, 120, 30);
            $imgStyle = 'height:' . $h . 'px; width:auto; max-width:100%; object-fit:contain; display:block;' . ($gray ? ' filter:grayscale(1); opacity:0.7; transition:filter 0.2s, opacity 0.2s;' : '');
            $mk = function ($lg, $dup) use ($imgStyle) {
                $src = htmlspecialchars($lg['src'] ?? '');
                $alt = $dup ? '' : htmlspecialchars($lg['alt'] ?? '');
                $href = cc_block_url($lg['href'] ?? '');
                $img = '<img src="' . $src . '" alt="' . $alt . '" loading="lazy" style="' . $imgStyle . '">';
                $box = 'display:flex; align-items:center; justify-content:center;';
                if (trim((string)($lg['href'] ?? '')) !== '' && $href !== '#') {
                    return '<a href="' . htmlspecialchars($href) . '" class="cc-logo-item" rel="noopener"' . ($dup ? ' tabindex="-1" aria-hidden="true"' : '') . ' style="' . $box . '">' . $img . '</a>';
                }
                return '<div class="cc-logo-item"' . ($dup ? ' aria-hidden="true"' : '') . ' style="' . $box . '">' . $img . '</div>';
            };
            $set1 = ''; $set2 = '';
            foreach ($logos as $lg) { $set1 .= $mk($lg, false); $set2 .= $mk($lg, true); }
            $css = $gray ? '#' . $innerId . ' .cc-logo-item:hover img,#' . $innerId . ' .cc-logo-item:focus-visible img{filter:none !important; opacity:1 !important}' : '';
            if ($marquee) {
                $css .= '@keyframes ccMq_' . $innerId . '{from{transform:translateX(0)}to{transform:translateX(-50%)}}#' . $innerId . ' .cc-logos-track{animation:ccMq_' . $innerId . ' ' . $speed . 's linear infinite}#' . $innerId . ' .cc-logos-marquee:hover .cc-logos-track{animation-play-state:paused}@media(prefers-reduced-motion:reduce){#' . $innerId . ' .cc-logos-track{animation:none; flex-wrap:wrap; width:auto !important}#' . $innerId . ' .cc-logos-set[aria-hidden="true"]{display:none}}';
                $setStyle = 'display:flex; align-items:center; gap:' . $gap . 'px; padding-right:' . $gap . 'px;';
                $body = '<div class="cc-logos-marquee" style="overflow:hidden;"><div class="cc-logos-track" style="display:flex; width:max-content;"><div class="cc-logos-set" style="' . $setStyle . '">' . $set1 . '</div><div class="cc-logos-set" aria-hidden="true" style="' . $setStyle . '">' . $set2 . '</div></div></div>';
            } else {
                $css .= '@media(max-width:768px){#' . $innerId . ' .cc-logos-grid{grid-template-columns:repeat(' . min($cols, 3) . ', 1fr) !important}}';
                $body = '<div class="cc-logos-grid" style="display:grid; grid-template-columns:repeat(' . $cols . ', 1fr); gap:' . $gap . 'px; align-items:center; justify-items:center;">' . $set1 . '</div>';
            }
            return $customCss . '<style>' . $css . '</style><div id="' . $innerId . '" class="cc-logos' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n"
                . ($title !== '' ? '<div class="cc-logos-title" style="text-align:center; font-size:14px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:24px;">' . $title . '</div>' : '')
                . $body . "\n</div>\n";
        }

        case 'TEAM': {
            $c = $block['content'] ?? [];
            $members = array_values((isset($c['members']) && is_array($c['members'])) ? $c['members'] : []);
            $cols = (int)cc_num($c['columns'] ?? 0, 0, 4, 0);
            if ($cols < 1) $cols = max(1, min(4, count($members)));
            $shape = $c['photoShape'] ?? 'circle';
            $radius = $shape === 'square' ? '0' : ($shape === 'rounded' ? '16px' : '50%');
            $card = (($c['layout'] ?? 'card') === 'card');
            $cardStyle = $card ? 'background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:24px; ' : 'padding:8px; ';
            $linkDefs = [['email', 'Email'], ['linkedin', 'LinkedIn'], ['twitter', 'X'], ['website', 'Website']];
            $cells = '';
            foreach ($members as $m) {
                $name = htmlspecialchars($m['name'] ?? '');
                $role = htmlspecialchars($m['role'] ?? '');
                $bio = htmlspecialchars($m['bio'] ?? '');
                $photo = trim((string)($m['photo'] ?? ''));
                $pstyle = 'width:112px; height:112px; border-radius:' . $radius . '; margin:0 auto 14px; ';
                if ($photo !== '') $media = '<img src="' . htmlspecialchars($photo) . '" alt="' . $name . '" loading="lazy" style="' . $pstyle . 'object-fit:cover; display:block;">';
                else $media = '<div class="cc-member-initials" aria-hidden="true" style="' . $pstyle . 'background:#e0e7ff; color:#3730a3; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:700; text-transform:uppercase;">' . htmlspecialchars(cc_initials($m['name'] ?? '')) . '</div>';
                $links = '';
                foreach ($linkDefs as $ld) {
                    $raw = trim((string)($m[$ld[0]] ?? ''));
                    if ($raw === '') continue;
                    if ($ld[0] === 'email') { if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $raw)) continue; $href = 'mailto:' . $raw; }
                    else $href = cc_ext_url($raw);
                    $links .= '<a href="' . htmlspecialchars($href) . '" class="cc-member-link" rel="noopener" aria-label="' . $name . ' - ' . $ld[1] . '" style="color:inherit;">' . $ld[1] . '</a>';
                }
                $cells .= '<div class="cc-member" style="' . $cardStyle . 'text-align:center;">' . $media
                    . '<h3 class="cc-member-name" style="margin:0; font-size:18px;">' . $name . '</h3>'
                    . ($role !== '' ? '<div class="cc-member-role" style="color:var(--brand-color, #3b82f6); font-weight:600; font-size:14px; margin-top:2px;">' . $role . '</div>' : '')
                    . ($bio !== '' ? '<p class="cc-member-bio" style="margin:10px 0 0 0; font-size:14px; color:#64748b; line-height:1.55;">' . $bio . '</p>' : '')
                    . ($links !== '' ? '<div class="cc-member-links" style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:12px; font-size:13px;">' . $links . '</div>' : '')
                    . '</div>';
            }
            return $customCss . '<style>@media(max-width:768px){#' . $innerId . ' .cc-team-grid{grid-template-columns:repeat(' . min($cols, 2) . ', 1fr) !important}}@media(max-width:480px){#' . $innerId . ' .cc-team-grid{grid-template-columns:1fr !important}}</style>'
                . '<div id="' . $innerId . '" class="cc-team' . $animClass . $innerClass . '" style="' . $styleAttr . '">' . "\n"
                . '<div class="cc-team-grid" style="display:grid; grid-template-columns:repeat(' . $cols . ', 1fr); gap:24px;">' . $cells . '</div>' . "\n</div>\n";
        }

        case 'BEFORE_AFTER': {
            $c = $block['content'] ?? [];
            $b = (isset($c['before']) && is_array($c['before'])) ? $c['before'] : [];
            $a = (isset($c['after']) && is_array($c['after'])) ? $c['after'] : [];
            $start = (int)round(cc_num($c['startPosition'] ?? 50, 0, 100, 50));
            $ar = htmlspecialchars($c['aspectRatio'] ?? '16 / 9');
            $showLabels = ($c['showLabels'] ?? true) !== false;
            $img = 'width:100%; height:100%; object-fit:cover; display:block;';
            $chip = 'position:absolute; top:12px; background:rgba(15,23,42,0.7); color:#fff; font-size:12px; padding:3px 9px; border-radius:6px;';
            $html = '<style>#' . $innerId . ':focus-within .cc-ba-knob{outline:2px solid var(--brand-color, #3b82f6); outline-offset:2px}</style>';
            $html .= '<div id="' . $innerId . '" class="cc-ba' . $animClass . $innerClass . '" style="' . $styleAttr . ' --pos:' . $start . '%; position:relative; overflow:hidden; aspect-ratio:' . $ar . '; user-select:none;">' . "\n";
            $html .= '<img class="cc-ba-after" src="' . htmlspecialchars($a['src'] ?? '') . '" alt="' . htmlspecialchars($a['alt'] ?? '') . '" loading="lazy" style="position:absolute; top:0; left:0; ' . $img . '">';
            $html .= '<div class="cc-ba-before" style="position:absolute; top:0; left:0; width:100%; height:100%; clip-path:inset(0 calc(100% - var(--pos)) 0 0);"><img src="' . htmlspecialchars($b['src'] ?? '') . '" alt="' . htmlspecialchars($b['alt'] ?? '') . '" loading="lazy" style="' . $img . '"></div>';
            if ($showLabels) {
                $html .= '<span class="cc-ba-label cc-ba-label-before" style="' . $chip . ' left:12px;">' . htmlspecialchars($b['label'] ?? 'Before') . '</span>';
                $html .= '<span class="cc-ba-label cc-ba-label-after" style="' . $chip . ' right:12px;">' . htmlspecialchars($a['label'] ?? 'After') . '</span>';
            }
            $html .= '<div class="cc-ba-handle" aria-hidden="true" style="position:absolute; top:0; bottom:0; left:var(--pos); width:2px; margin-left:-1px; background:#fff; pointer-events:none;"><span class="cc-ba-knob" style="position:absolute; top:50%; left:50%; width:36px; height:36px; margin:-18px 0 0 -18px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-size:14px; color:#0f172a;">&#8596;</span></div>';
            $html .= '<input type="range" class="cc-ba-range" min="0" max="100" step="0.1" value="' . $start . '" aria-label="Comparison slider" style="position:absolute; top:0; left:0; width:100%; height:100%; margin:0; opacity:0; cursor:ew-resize;">' . "\n";
            $html .= "<script>\n" . cc_script_beforeafter($innerId) . "\n</script>\n";
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'BUSINESS': {
            $c = $block['content'] ?? [];
            $types = ['LocalBusiness', 'Restaurant', 'Store', 'CafeOrCoffeeShop', 'Dentist', 'HairSalon', 'HealthAndBeautyBusiness', 'ProfessionalService', 'LegalService', 'AutoRepair', 'Hotel', 'Organization'];
            $type = in_array($c['businessType'] ?? '', $types, true) ? $c['businessType'] : 'LocalBusiness';
            $nameRaw = trim((string)($c['name'] ?? ''));
            $addrLines = cc_lines($c['address'] ?? '');
            $phone = trim((string)($c['phone'] ?? ''));
            $phoneDigits = preg_replace('/[^0-9+]/', '', $phone);
            $email = trim((string)($c['email'] ?? ''));
            $emailOk = preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email) === 1;
            $web = cc_ext_url($c['website'] ?? '');
            $closedLabel = htmlspecialchars($c['closedLabel'] ?? 'Closed');
            $hoursTitle = htmlspecialchars($c['hoursTitle'] ?? 'Opening hours');
            $note = htmlspecialchars($c['note'] ?? '');
            $hours = array_values((isset($c['hours']) && is_array($c['hours'])) ? array_slice($c['hours'], 0, 7) : []);
            $dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            $contact = '';
            if ($nameRaw !== '') $contact .= '<h3 class="cc-biz-name" style="margin:0 0 10px 0; font-size:20px;">' . htmlspecialchars($nameRaw) . '</h3>';
            if ($addrLines) $contact .= '<address class="cc-biz-address" style="font-style:normal; line-height:1.6; margin:0 0 10px 0;">' . cc_br($c['address'] ?? '') . '</address>';
            if ($phoneDigits !== '') $contact .= '<div class="cc-biz-line" style="margin-bottom:4px;"><a class="cc-biz-link" href="tel:' . htmlspecialchars($phoneDigits) . '" style="color:inherit;">' . htmlspecialchars($phone) . '</a></div>';
            if ($emailOk) $contact .= '<div class="cc-biz-line" style="margin-bottom:4px;"><a class="cc-biz-link" href="mailto:' . htmlspecialchars($email) . '" style="color:inherit;">' . htmlspecialchars($email) . '</a></div>';
            if ($web !== '') $contact .= '<div class="cc-biz-line" style="margin-bottom:4px;"><a class="cc-biz-link" href="' . htmlspecialchars($web) . '" rel="noopener" style="color:inherit;">' . htmlspecialchars(preg_replace('~^https?://~i', '', $web)) . '</a></div>';
            if ($addrLines && (($c['mapsLink'] ?? true) !== false)) {
                $contact .= '<a class="cc-biz-directions" rel="noopener" href="' . htmlspecialchars('https://www.google.com/maps/search/?api=1&query=' . cc_enc(implode(', ', $addrLines))) . '" style="display:inline-block; margin-top:12px; padding:9px 16px; border-radius:8px; background:var(--brand-color, #3b82f6); color:#fff; text-decoration:none; font-weight:600; font-size:14px;">' . htmlspecialchars($c['directionsLabel'] ?? 'Get directions') . '</a>';
            }
            $rows = '';
            $specs = [];
            foreach ($hours as $i => $hr) {
                $closed = !empty($hr['closed']);
                $open = trim((string)($hr['open'] ?? '')); $close = trim((string)($hr['close'] ?? ''));
                $okTimes = preg_match('/^\d{2}:\d{2}$/', $open) && preg_match('/^\d{2}:\d{2}$/', $close);
                $val = ($closed || !$okTimes) ? $closedLabel : htmlspecialchars($open) . '&ndash;' . htmlspecialchars($close);
                $rows .= '<tr style="border-bottom:1px solid #e2e8f0;"><th scope="row" style="text-align:left; padding:8px 0; font-weight:600;">' . htmlspecialchars($hr['day'] ?? $dayNames[$i]) . '</th><td style="text-align:right; padding:8px 0;">' . $val . '</td></tr>';
                if (!$closed && $okTimes) $specs[] = ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => $dayNames[$i], 'opens' => $open, 'closes' => $close];
            }
            $hoursHtml = '';
            if ($rows !== '' || $note !== '') {
                $hoursHtml = '<div class="cc-biz-hours"><h3 class="cc-biz-hours-title" style="margin:0 0 10px 0; font-size:20px;">' . $hoursTitle . '</h3>'
                    . ($rows !== '' ? '<table class="cc-biz-table" style="width:100%; border-collapse:collapse; font-size:15px;"><tbody>' . $rows . '</tbody></table>' : '')
                    . ($note !== '' ? '<p class="cc-biz-note" style="margin:10px 0 0 0; font-size:13px; color:#64748b;">' . $note . '</p>' : '') . '</div>';
            }
            $html = '<style>@media(max-width:768px){#' . $innerId . '{grid-template-columns:1fr !important}}</style>';
            $html .= '<div id="' . $innerId . '" class="cc-business' . $animClass . $innerClass . '" style="' . $styleAttr . ' display:grid; grid-template-columns:repeat(2, 1fr); gap:32px;">' . "\n";
            $html .= '<div class="cc-biz-contact">' . $contact . '</div>' . "\n" . $hoursHtml . "\n";
            if (($c['jsonLd'] ?? true) !== false && $nameRaw !== '') {
                $ld = ['@context' => 'https://schema.org', '@type' => $type, 'name' => $nameRaw];
                if ($addrLines) $ld['address'] = ['@type' => 'PostalAddress', 'streetAddress' => implode(', ', $addrLines)];
                if ($phoneDigits !== '') $ld['telephone'] = $phoneDigits;
                if ($emailOk) $ld['email'] = $email;
                if ($web !== '') $ld['url'] = $web;
                if ($specs) $ld['openingHoursSpecification'] = $specs;
                $html .= '<script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . "</script>\n";
            }
            $html .= '</div>' . "\n";
            return $customCss . $html;
        }

        case 'COLLECTION_LIST': {
            $cid = $block['content']['collectionId'] ?? '';
            $cslugRaw = $block['content']['collectionSlug'] ?? '';
            $limit = max(1, intval($block['content']['limit'] ?? 6));
            $columns = max(1, intval($block['content']['columns'] ?? 3));
            $showCover = ($block['content']['showCover'] ?? true) !== false;
            $showExcerpt = ($block['content']['showExcerpt'] ?? true) !== false;
            $showDate = ($block['content']['showDate'] ?? true) !== false;
            $source = $block['content']['source'] ?? 'active';       // active|archived|all
            $layout = $block['content']['layout'] ?? 'grid';         // grid|list
            $showAll = !empty($block['content']['showAll']);

            $data = cc_collections_data();
            $coll = $data['by_id'][$cid] ?? ($data['by_slug'][$cslugRaw] ?? null);
            $cslug = $coll ? cc_safe_slug($coll['slug']) : cc_safe_slug($cslugRaw);
            $all = $coll ? $coll['items'] : [];
            // Filter by archive status
            $items = array_values(array_filter($all, function ($it) use ($source) {
                $arch = !empty($it['archived']);
                if ($source === 'archived') return $arch;
                if ($source === 'all') return true;
                return !$arch; // active
            }));
            if (!$showAll) $items = array_slice($items, 0, $limit);

            $isList = ($block['content']['layout'] ?? 'grid') === 'list';
            $cards = '';
            foreach ($items as $it) {
                $islug = cc_safe_slug($it['slug']);
                $href = '{{BASE_URL}}' . $cslug . '/' . $islug . '/';
                $title = htmlspecialchars($it['title']);
                $dateTxt = (!empty($it['date'])) ? htmlspecialchars($it['date']) : '';
                $excTxt = (!empty($it['excerpt'])) ? htmlspecialchars($it['excerpt']) : '';
                if ($isList) {
                    $thumb = ($showCover && !empty($it['cover_image']))
                        ? '<div style="flex:0 0 96px; width:96px; height:64px; border-radius:8px; overflow:hidden; background:#e2e8f0;"><img src="' . htmlspecialchars($it['cover_image']) . '" alt="' . $title . '" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;"></div>'
                        : '';
                    $date = ($showDate && $dateTxt !== '') ? '<span style="font-size:12px; color:#64748b; white-space:nowrap;">' . $dateTxt . '</span>' : '';
                    $excerpt = ($showExcerpt && $excTxt !== '') ? '<p style="margin:3px 0 0 0; font-size:13px; color:#475569; line-height:1.4;">' . $excTxt . '</p>' : '';
                    $cards .= '<a href="' . htmlspecialchars($href) . '" class="cc-cl-row" style="display:flex; align-items:center; gap:16px; text-decoration:none; color:inherit; padding:14px 4px; border-bottom:1px solid #e2e8f0;">'
                        . $thumb
                        . '<div style="flex:1; min-width:0;"><div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline;"><h3 style="margin:0; font-size:16px; color:#0f172a;">' . $title . '</h3>' . $date . '</div>' . $excerpt . '</div>'
                        . '</a>';
                } else {
                    $cover = ($showCover && !empty($it['cover_image']))
                        ? '<div style="aspect-ratio:16/9; overflow:hidden; background:#e2e8f0;"><img src="' . htmlspecialchars($it['cover_image']) . '" alt="' . $title . '" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;"></div>'
                        : '';
                    $date = ($showDate && $dateTxt !== '') ? '<div style="font-size:12px; color:#64748b; margin-bottom:6px;">' . $dateTxt . '</div>' : '';
                    $excerpt = ($showExcerpt && $excTxt !== '') ? '<p style="margin:8px 0 0 0; font-size:14px; color:#475569; line-height:1.5;">' . $excTxt . '</p>' : '';
                    $cards .= '<a href="' . htmlspecialchars($href) . '" class="cc-cl-card" style="display:block; text-decoration:none; color:inherit; background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">'
                        . $cover
                        . '<div style="padding:18px;">' . $date . '<h3 style="margin:0; font-size:18px; color:#0f172a;">' . $title . '</h3>' . $excerpt . '</div>'
                        . '</a>';
                }
            }
            if ($cards === '') $cards = '<div style="grid-column:1/-1; padding:30px; text-align:center; color:#94a3b8; border:1px dashed #cbd5e1; border-radius:12px;">No published items yet.</div>';

            $html = "<div id=\"$innerId\" class=\"cc-collection-list$animClass$innerClass\" style=\"$styleAttr\">\n";
            if ($layout === 'list') {
                $html .= "<div class=\"cc-cl-list\" style=\"display:flex; flex-direction:column; gap:0;\">$cards</div>\n";
            } else {
                $html  = "<style>@media(max-width:768px){ #$innerId .cc-cl-grid { grid-template-columns:1fr !important; } }</style>" . $html;
                $html .= "<div class=\"cc-cl-grid\" style=\"display:grid; grid-template-columns:repeat($columns, 1fr); gap:24px;\">$cards</div>\n";
            }
            $html .= "</div>\n";
            return $customCss . $html;
        }

        case 'HTML':
            $html = "<div id=\"$innerId\" class=\"cc-html-block$animClass$innerClass\"$styleString>\n" . ($block['content']['code'] ?? '') . "\n</div>\n";
            return $customCss . $html;

        case 'ICON_BOX':
            $icon = htmlspecialchars($block['content']['icon'] ?? '⚡');
            $title = htmlspecialchars($block['content']['title'] ?? '');
            $desc = htmlspecialchars($block['content']['description'] ?? '');
            $align = htmlspecialchars($block['styles']['textAlign'] ?? 'center');
            $ibOwn = $block['styles'] ?? []; unset($ibOwn['textAlign'], $ibOwn['animation']);
            $html = "<div id=\"$innerId\" class=\"cc-icon-box$animClass$innerClass\" style=\"" . build_inline_style($ibOwn) . "text-align:$align;\">\n<div style=\"font-size:36px; margin-bottom:15px;\">$icon</div>\n<h3 style=\"margin:0 0 10px 0; font-size:18px;\">$title</h3>\n<p style=\"margin:0; font-size:14px; opacity:0.8;\">$desc</p>\n</div>\n";
            return $customCss . $html;

        case 'TESTIMONIAL':
            $quote = htmlspecialchars($block['content']['quote'] ?? '');
            $author = htmlspecialchars($block['content']['author'] ?? '');
            $role = htmlspecialchars($block['content']['role'] ?? '');
            $html = "<div id=\"$innerId\" class=\"cc-testimonial$animClass$innerClass\" style=\"$styleAttr\">\n<p style=\"font-size:16px; font-style:italic; margin:0 0 20px 0; line-height:1.6;\">&ldquo;$quote&rdquo;</p>\n<div style=\"font-weight:700; font-size:14px;\">$author</div>\n<div style=\"font-size:12px; opacity:0.6;\">$role</div>\n</div>\n";
            return $customCss . $html;

        case 'FAQ':
            $html = "<div id=\"$innerId\" class=\"cc-faq$animClass$innerClass\" style=\"$styleAttr\">\n";
            if (isset($block['content']['items']) && is_array($block['content']['items'])) {
                foreach($block['content']['items'] as $item) {
                    $q = htmlspecialchars($item['q'] ?? '');
                    $a = nl2br(htmlspecialchars($item['a'] ?? ''));
                    $html .= "  <details style=\"margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;\">\n";
                    $html .= "    <summary style=\"padding:15px 20px; font-weight:600; cursor:pointer; background:#f8fafc; outline:none; list-style:none;\"><span style=\"display:inline-block; width:15px; font-weight:bold; color:var(--brand-color, #3b82f6);\">+</span> $q</summary>\n";
                    $html .= "    <div style=\"padding:15px 20px; border-top:1px solid #e2e8f0; font-size:15px; color:#475569; line-height:1.6;\">$a</div>\n";
                    $html .= "  </details>\n";
                }
            }
            $html .= "</div>\n";
            return $customCss . $html;

        case 'SLIDER':
            $effect = $block['content']['effect'] ?? 'slide';
            $autoplay = $block['content']['autoplay'] ?? true;
            $delay = intval($block['content']['delay'] ?? 3000);
            $isFade = $effect === 'fade';
            $fit = htmlspecialchars($block['content']['objectFit'] ?? 'cover');
            $opos = htmlspecialchars($block['content']['objectPosition'] ?? 'center');
            // Box with a set aspect ratio: every image fills the same frame
            // with the right zoom (cover), regardless of its own aspect ratio.
            $ar = htmlspecialchars($block['content']['aspectRatio'] ?? '16 / 9');
            $hasHeight = !empty($block['styles']['height']) && $block['styles']['height'] !== 'auto';
            $boxSize = $hasHeight ? "" : " aspect-ratio:$ar;";

            $html = "<div id=\"$innerId\" class=\"cc-slider$animClass$innerClass\" style=\"$styleAttr position:relative; overflow:hidden; border-radius:inherit;$boxSize\">\n";
            $html .= "  <div class=\"cc-slides\" style=\"display:flex; position:relative; height:100%; " . ($isFade ? "" : "overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none;") . "\">\n";

            if (isset($block['content']['images']) && is_array($block['content']['images'])) {
                foreach($block['content']['images'] as $idx => $img) {
                    $src = htmlspecialchars($img['src'] ?? '');
                    $alt = htmlspecialchars($img['alt'] ?? '');
                    if ($isFade) {
                        $opacity = $idx === 0 ? 1 : 0;
                        $pos = $idx === 0 ? 'relative' : 'absolute';
                        $html .= "    <img src=\"$src\" alt=\"$alt\" style=\"position:$pos; top:0; left:0; width:100%; height:100%; object-fit:$fit; object-position:$opos; opacity:$opacity; transition:opacity 0.8s ease; border-radius:inherit;\" class=\"cc-slide\">\n";
                    } else {
                        $html .= "    <img src=\"$src\" alt=\"$alt\" style=\"flex:0 0 100%; width:100%; height:100%; scroll-snap-align:start; object-fit:$fit; object-position:$opos; border-radius:inherit;\" class=\"cc-slide\">\n";
                    }
                }
            }
            $html .= "  </div>\n";
            if (!$isFade) $html .= "  <style>#$innerId .cc-slides::-webkit-scrollbar { display: none; }</style>\n";

            if ($autoplay) {
                $html .= "  <script>\n";
                $html .= "    document.addEventListener('DOMContentLoaded', function() {\n";
                $html .= "      var slider = document.getElementById('$innerId');\n";
                $html .= "      if(slider) { \n";
                $html .= "        var container = slider.querySelector('.cc-slides');\n";
                $html .= "        var slides = slider.querySelectorAll('.cc-slide');\n";
                $html .= "        var current = 0;\n";
                $html .= "        if (slides.length > 1) {\n";
                $html .= "          setInterval(function() {\n";
                $html .= "            current = (current + 1) % slides.length;\n";
                if ($isFade) {
                    $html .= "            slides.forEach((s, i) => s.style.opacity = i === current ? 1 : 0);\n";
                } else {
                    $html .= "            container.scrollTo({ left: slides[current].offsetLeft, behavior: 'smooth' });\n";
                }
                $html .= "          }, $delay);\n";
                $html .= "        }\n";
                $html .= "      }\n";
                $html .= "    });\n";
                $html .= "  </script>\n";
            }
            $html .= "</div>\n";
            return $customCss . $html;

        case 'MAPS':
            $address = urlencode($block['content']['address'] ?? '');
            $zoom = intval($block['content']['zoom'] ?? 15);
            $html = "<div id=\"$innerId\" class=\"cc-maps$animClass$innerClass\" style=\"$styleAttr\">\n";
            $html .= "  <div style=\"position:relative; overflow:hidden; padding-bottom:56.25%; height:0; border-radius:inherit;\">\n";
            $html .= "    <iframe src=\"https://maps.google.com/maps?q=$address&t=&z=$zoom&ie=UTF8&iwloc=&output=embed\" style=\"position:absolute; top:0; left:0; width:100%; height:100%; border:0;\" allowfullscreen loading=\"lazy\"></iframe>\n";
            $html .= "  </div>\n";
            $html .= "</div>\n";
            return $customCss . $html;

        default: return "<!-- Unknown element: " . $block['type'] . " -->\n";
    }
}
?>
