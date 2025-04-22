<?php



defined('ABSPATH') or die('No direct script access allowed');

/**
 * Summary of exchange_auth0_token
 * @param string $code
 * @param string $state
 * @throws \Exception
 * @return array<string, mixed>
 */
function miruni_exchange_auth0_token(string $code, string $state): array
{
    $verifier = miruni_get_pkce_verifier($state);
    if (!$verifier) {
        throw new Exception('Invalid or expired PKCE verifier');
    }

    $auth0_domain = get_env_var('AUTH0_DOMAIN');
    $client_id = get_env_var('AUTH0_CLIENT_ID');
    $redirect_uri = get_env_var('AUTH0_REDIRECT_URI');

    $token_url = "https://{$auth0_domain}/oauth/token";

    $response = wp_remote_post($token_url, [
        'body' => [
            'grant_type' => 'authorization_code',
            'client_id' => $client_id,
            'code' => $code,
            'redirect_uri' => $redirect_uri,
            'code_verifier' => $verifier
        ],
        'headers' => [
            'Content-Type' => 'application/x-www-form-urlencoded',
            'authorization' => base64_encode($client_id . ':')
        ]
    ]);

    if (is_wp_error($response)) {
        throw new Exception('Failed to exchange token: ' . esc_html($response->get_error_message()));
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (isset($data['error'])) {
        throw new Exception('Auth0 error: ' . esc_html($data['error_description']));
    }

    // Decode the ID token to get user information
    $id_token_parts = explode('.', $data['id_token']);

    if (count($id_token_parts) !== 3) {

        throw new Exception('Invalid ID token format');
    }

    $user_info = json_decode(miruni_base64url_decode($id_token_parts[1]), true);
    if (!$user_info) {

        throw new Exception('Failed to decode user information from ID token');
    }

    // Create user in Miruni
    $success = miruni_create_user_in_miruni(
        $data['access_token'],
        $user_info['sub'],
        $user_info['email'],
        $user_info['given_name'] ?? $user_info['nickname'],
        $user_info['family_name'] ?? ''
    );

    if (!$success) {

        // Continue anyway as this might be an existing user
    }

    return $data;
}

function miruni_get_encryption_key(): string
{
    $key = get_option('miruni_encryption_key');
    if (!$key) {
        $key = wp_generate_password(32, true, true);
        update_option('miruni_encryption_key', $key);
    }
    return $key;
}

function miruni_encrypt_data(string $data): string
{
    $key = miruni_get_encryption_key();
    $iv = random_bytes(16);
    $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
    return base64_encode($iv . $encrypted);
}

function miruni_decrypt_data(string $encrypted_data): string
{
    $key = miruni_get_encryption_key();
    $data = base64_decode($encrypted_data);
    $iv = substr($data, 0, 16);
    $encrypted = substr($data, 16);
    $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    if (empty($decrypted)) {
        throw new Exception('Failed to decrypt data');
    }
    return $decrypted;
}

/**
 * Summary of miruni_store_auth_tokens
 * @param array<string,mixed> $token_data
 * @return bool
 */
function miruni_store_auth_tokens(array $token_data): bool
{
    // Add expires_at timestamp if not present
    if (!isset($token_data['expires_at']) && isset($token_data['expires_in'])) {
        $token_data['expires_at'] = wp_date('U') + $token_data['expires_in'];
    }

    $required = ['access_token', 'refresh_token'];

    foreach ($required as $field) {
        if (!isset($token_data[$field])) {

            return false;
        }
    }

    $encoded_string = json_encode($token_data);
    if ($encoded_string === false) {
        return false;
    }
    $encrypted_tokens = miruni_encrypt_data($encoded_string);
    $user_id = get_current_user_id();

    $updated_meta = update_user_meta($user_id, 'miruni_auth_tokens', $encrypted_tokens);
    if ($updated_meta === false) {
        return false;
    }
    return true;
}

/**
 * Summary of get_auth_tokens
 * @return array<string,mixed>|null
 */
function get_auth_tokens(): ?array
{
    $user_id = get_current_user_id();
    $encrypted_tokens = get_user_meta($user_id, 'miruni_auth_tokens', true);

    if (!$encrypted_tokens) {
        return null;
    }

    try {
        $decrypted = miruni_decrypt_data($encrypted_tokens);
        return json_decode($decrypted, true);
    } catch (Exception $e) {

        return null;
    }
}

function miruni_delete_auth_tokens(): bool
{
    $user_id = get_current_user_id();
    return delete_user_meta($user_id, 'miruni_auth_tokens');
}

/**
 * Refreshes the access token using the refresh token
 * @param string $refresh_token
 * @return array<string, mixed>
 * @throws Exception
 */
function refresh_auth_token(string $refresh_token): array
{
    // This is already correct - refresh token flow doesn't use PKCE
    $auth0_domain = get_env_var('AUTH0_DOMAIN');
    $client_id = get_env_var('AUTH0_CLIENT_ID');

    $token_url = "https://{$auth0_domain}/oauth/token";

    $response = wp_remote_post($token_url, [
        'body' => [
            'grant_type' => 'refresh_token',
            'client_id' => $client_id,
            'refresh_token' => $refresh_token
        ],
        'headers' => [
            'Content-Type' => 'application/x-www-form-urlencoded',
            'authorization' => 'Basic ' . base64_encode($client_id . ':')
        ]
    ]);

    if (is_wp_error($response)) {
        throw new Exception('Failed to refresh token: ' . esc_html($response->get_error_message()));
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (isset($data['error'])) {
        throw new Exception('Auth0 refresh error: ' . esc_html($data['error_description']));
    }
    if (!isset($data['refresh_token'])) {
        error_log('Auth0 refresh error: No refresh token returned - ' . json_encode($data));
        throw new Exception('Auth0 refresh error: No refresh token returned');
    }
    // if refresh token is not returned, add the existing refresh token to the response
    $return_data = $data['refresh_token'] ? $data : array_merge($data, ['refresh_token' => $refresh_token]);

    return $return_data;
}

/**
 * Gets the current access token, refreshing if necessary
 * @return array{token: string|null, reason: string}
 */
function get_current_access_token(): array
{
    $tokens = get_auth_tokens();
    if (!$tokens) {
        return ['token' => null, 'reason' => 'No stored tokens found'];
    }

    $now_date = wp_date('U');
    if (empty($now_date)) {
        return ['token' => null, 'reason' => 'Could not determine current time'];
    }

    $stored_token_expires_at = (int) $tokens['expires_at'];
    $token_has_expired = $stored_token_expires_at <= $now_date;

    if ($token_has_expired) {
        try {
            $new_tokens = refresh_auth_token($tokens['refresh_token']);

            $new_tokens['expires_at'] = (int) wp_date('U') + $new_tokens['expires_in'];


            // Store new tokens
            if (!miruni_store_auth_tokens($new_tokens)) {

                miruni_delete_auth_tokens();
                return ['token' => null, 'reason' => 'Failed to store refreshed tokens'];
            }

            return ['token' => $new_tokens['access_token'], 'reason' => 'Token refreshed successfully'];
        } catch (Exception $e) {
            miruni_delete_auth_tokens();
            return ['token' => null, 'reason' => 'Token refresh failed: ' . $e->getMessage()];
        }
    }

    return ['token' => $tokens['access_token'], 'reason' => 'Valid token found'];
}

function miruni_generate_pkce_verifier(): string
{
    return bin2hex(random_bytes(32));
}

function miruni_generate_pkce_challenge(string $verifier): string
{
    $hash = hash('sha256', $verifier, true);
    return rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
}

function miruni_store_pkce_verifier(string $state, string $verifier): bool
{
    return update_option('miruni_pkce_' . $state, [
        'verifier' => $verifier,
        'expires' => time() + 300 // 5 minutes expiry
    ]);
}

function miruni_get_pkce_verifier(string $state): ?string
{
    $data = get_option('miruni_pkce_' . $state);
    if (!$data || time() > $data['expires']) {
        delete_option('miruni_pkce_' . $state);
        return null;
    }
    delete_option('miruni_pkce_' . $state);
    return $data['verifier'];
}

/**
 * Performs a complete logout by clearing all stored tokens
 * @return bool Whether the logout was successful
 */
function miruni_perform_complete_logout(): bool
{
    try {
        return miruni_delete_auth_tokens();
    } catch (Exception $e) {

        return false;
    }
}

function miruni_create_user_in_miruni(string $token, string $user_id, string $email, string $first_name, string $last_name): bool
{
    $api_endpoint = get_miruni_api_url() . '/rest/user/create';
    $body = json_encode([
        'userId' => $user_id,
        'email' => $email,
        'createdBy' => $user_id,
        'firstName' => $first_name,
        'lastName' => $last_name
    ]);

    if (!$body) {
        throw new Exception('Failed to encode request body');
    }

    $response = wp_remote_post($api_endpoint, [
        'headers' => [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $token
        ],
        'body' => $body
    ]);

    if (is_wp_error($response)) {


        do_action('my_plugin_error', new Exception("Error creating user in Miruni"), [
            'context' => 'miruni_init_wordpress_login - payload - ' . $body . ' - url - ' . $api_endpoint,
            'operation' => "Creating user",
            'user_id' => get_current_user_id()
        ]);
        return false;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    return $response_code === 200;
}

function miruni_base64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}