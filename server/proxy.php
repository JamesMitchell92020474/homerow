<?php
/**
 * HomeRow — Anthropic API Proxy
 *
 * Receives session data from the browser, forwards it to the Anthropic API
 * using the key stored in config.php, and returns the AI feedback response.
 * The API key never leaves the server and is never exposed to the browser.
 */

require_once __DIR__ . '/config.php';

// ─── CORS ─────────────────────────────────────────────────────────────────────

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = defined('ALLOWED_ORIGINS') ? ALLOWED_ORIGINS : [];

if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Allow any origin for local file access (file://) — browsers send empty Origin
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Validate request ──────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || !isset($body['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing prompt in request body']);
    exit;
}

// Sanitise — ensure prompt is a plain string
$prompt = substr(strip_tags((string) $body['prompt']), 0, 4000);

if (!defined('ANTHROPIC_API_KEY') || ANTHROPIC_API_KEY === 'your-api-key-here') {
    http_response_code(503);
    echo json_encode(['error' => 'API key not configured in server/config.php']);
    exit;
}

// ─── Call Anthropic API ────────────────────────────────────────────────────────

$payload = json_encode([
    'model'      => ANTHROPIC_MODEL,
    'max_tokens' => 400,
    'messages'   => [
        ['role' => 'user', 'content' => $prompt]
    ]
]);

$ch = curl_init(ANTHROPIC_API_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to reach Anthropic API: ' . $curlError]);
    exit;
}

$data = json_decode($response, true);

if ($httpCode !== 200 || !isset($data['content'][0]['text'])) {
    http_response_code($httpCode ?: 502);
    $errMsg = $data['error']['message'] ?? 'Unexpected API response';
    echo json_encode(['error' => $errMsg]);
    exit;
}

// ─── Return feedback text ──────────────────────────────────────────────────────

echo json_encode(['feedback' => $data['content'][0]['text']]);
