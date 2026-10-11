<?php
// canvascore-admin/submit_form.php
// Receives forms from the public site and sends the email.
// SECURITY: the recipient is NEVER taken from the client (no open relay):
// only the global email configured in Global Options is used.
require_once __DIR__ . '/config.php';
header('Content-Type: text/html; charset=utf-8');

$data_dir = cc_data_dir();
$settings_file = $data_dir . '/settings.json';
$settings = file_exists($settings_file) ? json_decode(file_get_contents($settings_file), true) : [];

// Per-form recipient registry (written by the build). The client can NOT choose the recipient.
$forms_file = $data_dir . '/forms.json';
$forms = file_exists($forms_file) ? json_decode(file_get_contents($forms_file), true) : [];
$form_id = $_POST['_form'] ?? '';
$form_to = (is_array($forms) && isset($forms[$form_id]) && filter_var($forms[$form_id], FILTER_VALIDATE_EMAIL)) ? $forms[$form_id] : '';

function cc_finish($message) {
    $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo "<!doctype html><meta charset='utf-8'><title>Form</title>";
    echo "<div style=\"font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:30px;border:1px solid #e2e8f0;border-radius:12px;text-align:center;\">";
    echo "<p style=\"font-size:16px;color:#0f172a;\">{$safe}</p>";
    echo "<a href=\"javascript:history.back()\" style=\"display:inline-block;margin-top:15px;color:#3b82f6;\">&larr; Back</a>";
    echo "</div>";
    exit;
}

$successMsg = $_POST['_success'] ?? 'Message sent successfully!';

// Honeypot anti-spam: bots fill in the hidden field -> pretend success and stop
if (!empty($_POST['_hp'])) { cc_finish($successMsg); }

// Store the submission in the database (regardless of the email outcome)
try {
    $db = $data_dir . '/canvascore.sqlite';
    if (file_exists($db)) {
        $pdo = new PDO("sqlite:$db");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("CREATE TABLE IF NOT EXISTS form_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, form_id TEXT, page TEXT, data_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
        $fields = [];
        foreach ($_POST as $k => $v) {
            if (strpos($k, 'field_') === 0) {
                $label = $_POST['_label_' . $k] ?? ucfirst(str_replace('field_', 'Field ', $k));
                $fields[$label] = is_string($v) ? trim($v) : $v;
            }
        }
        $page_ref = $_SERVER['HTTP_REFERER'] ?? '';
        $pdo->prepare("INSERT INTO form_submissions (form_id, page, data_json) VALUES (?,?,?)")
            ->execute([$form_id, $page_ref, json_encode($fields, JSON_UNESCAPED_UNICODE)]);
    }
} catch (Exception $e) { /* storage must not block sending */ }

// Priority: form-specific recipient (registry) -> global email from the settings.
$to = $form_to !== '' ? $form_to : (!empty($settings['adminEmail']) ? trim($settings['adminEmail']) : '');
if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    cc_finish('Form is not configured: set a valid receiving email in Global Options.');
}

$from = !empty($settings['emailFrom']) ? trim($settings['emailFrom']) : 'noreply@' . preg_replace('/[^a-zA-Z0-9.\-]/', '', ($_SERVER['HTTP_HOST'] ?? 'localhost'));
if (!filter_var($from, FILTER_VALIDATE_EMAIL)) $from = 'noreply@localhost';
$subject = !empty($settings['emailSubject']) ? $settings['emailSubject'] : "New submission from your website";
// Remove any header injection attempts
$subject = str_replace(["\r", "\n"], ' ', $subject);

$body  = "You have received a new message from your website:\n";
$body .= "------------------------------------------------------\n\n";
foreach ($_POST as $key => $value) {
    if (strpos($key, 'field_') === 0) {
        $labelKey = '_label_' . $key;
        $label = isset($_POST[$labelKey]) ? $_POST[$labelKey] : ucfirst(str_replace('field_', 'Field ', $key));
        $label = str_replace(["\r", "\n"], ' ', $label);
        $body .= strtoupper($label) . ":\n";
        $body .= trim((string)$value) . "\n\n";
    }
}
$body .= "------------------------------------------------------\n";
$body .= "Powered by CanvasCore";

$headers  = "From: $from\r\n";
$headers .= "Reply-To: $from\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if (@mail($to, $subject, $body, $headers)) {
    cc_finish($successMsg);
} else {
    cc_finish('Error sending email. Please check the server mail configuration.');
}
