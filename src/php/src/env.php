<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

function get_env_var(string $key): ?string
{

    $config_file_path = plugin_dir_path(__FILE__) . 'config.php';
    $config_file = include $config_file_path;
    return $config_file[$key] ?? null;
}

function get_miruni_api_url(): string
{
    return rtrim(str_replace('localhost', 'host.docker.internal', (string) get_env_var('MIRUNI_API_ENDPOINT')), '/');
}
