<?php
// Renders a single block (JSON on stdin) through the real compiler.
require __DIR__ . '/../../canvascore-admin/compiler.php';
$block = json_decode(stream_get_contents(STDIN), true);
echo render_block($block);
