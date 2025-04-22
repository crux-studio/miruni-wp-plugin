<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


require_once plugin_dir_path(__FILE__) . 'db.php';

define("MIRUNI_API_KEY_OPTION_NAME", 'miruni_api_key');
define("MIRUNI_SECRET_KEY_OPTION_NAME", 'miruni_secret_key');
define("MIRUNI_ONBOARDING_STATUS_OPTION_NAME", 'miruni_onboarding_status');


function miruni_get_api_key(): string|null
{
    $miruni_api_key = get_option(MIRUNI_API_KEY_OPTION_NAME);

    if ($miruni_api_key === false) {
        return null;
    }

    return $miruni_api_key;
}


/**
 * Summary of miruni_get_api_key_and_secret_key
 * @throws \Exception
 * @return array{
 * api_key: string,
 * snippet_secret_key: string
 * }
 */
function miruni_get_api_key_and_secret_key(): array
{
    $api_key = get_option(MIRUNI_API_KEY_OPTION_NAME);
    $secret_key = get_option(MIRUNI_SECRET_KEY_OPTION_NAME);

    return [
        'api_key' => $api_key === false ? null : $api_key,
        'snippet_secret_key' => $secret_key === false ? null : $secret_key,
    ];
}

// Helper function to update the API key
function miruni_update_api_key(string $api_key, string $secret_key): bool
{

    try {
        update_option(MIRUNI_API_KEY_OPTION_NAME, $api_key);
        update_option(MIRUNI_SECRET_KEY_OPTION_NAME, $secret_key);
        return true;
    } catch (Exception $e) {
        do_action('my_plugin_error', $e, [
            'context' => 'miruni_update_api_key',
            'operation' => 'Updating API key',
            'user_id' => get_current_user_id()
        ]);
        return false;
    }
}

function miruni_update_snippet_secret_key(string $secret_key): bool
{
    update_option(MIRUNI_SECRET_KEY_OPTION_NAME, $secret_key);

    return true;
}

function miruni_get_snippet_secret_key(): string|null
{
    $miruni_secret_key = get_option(MIRUNI_SECRET_KEY_OPTION_NAME);

    if ($miruni_secret_key === false) {
        return null;
    }

    return $miruni_secret_key;
}


function miruni_get_onboarding_status(): string|null
{
    $onboarding_status = get_option(MIRUNI_ONBOARDING_STATUS_OPTION_NAME);
    if ($onboarding_status === false) {
        return null;
    }
    return $onboarding_status;
}

function miruni_set_onboarding_status(string $status): bool
{
    $status = sanitize_text_field($status);
    $result = update_option(MIRUNI_ONBOARDING_STATUS_OPTION_NAME, $status);

    if ($result === false) {
        return false;
    }

    return true;
}
