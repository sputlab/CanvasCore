<?php
// Renders a menu ({items, settings} JSON on stdin) through the real compiler.
// With the argument "effects" it prints the compiler's effect catalog instead.
require __DIR__ . '/../../canvascore-admin/compiler.php';
if (($argv[1] ?? '') === 'effects') { echo json_encode(['effects' => CC_MENU_EFFECTS, 'single' => CC_MENU_SINGLE_GROUPS, 'burgers' => CC_MENU_BURGERS]); exit; }
$opts = json_decode($argv[1] ?? '{}', true) ?: [];
echo render_menu_html(stream_get_contents(STDIN), $opts);
