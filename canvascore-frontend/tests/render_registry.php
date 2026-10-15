<?php
// Renders a single block (JSON on stdin) through the real compiler and prints {"html": …, "registry": …}: the form
// registry is what submit_form.php later trusts (recipient, field labels, message).
require __DIR__ . '/../../canvascore-admin/compiler.php';
$block = json_decode(stream_get_contents(STDIN), true);
$html = render_block($block);
$reg =& cc_form_registry();
echo json_encode(['html' => $html, 'registry' => $reg], JSON_UNESCAPED_UNICODE);
