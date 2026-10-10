<?php
// Rende un singolo blocco (JSON su stdin) tramite il compiler reale.
require __DIR__ . '/../../canvascore-admin/compiler.php';
$block = json_decode(stream_get_contents(STDIN), true);
echo render_block($block);
