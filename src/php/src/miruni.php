<?php
/*
 * Plugin Name: Miruni
 * Description: Automate website feedback and edit requests directly in WordPress with AI. Cut down 80% of the time you spend managing your website.
 * Version: 1.0
 * Requires at least: 6.0
 * Requires PHP: 8.2
 * Author: Miruni
 * Author URI: https://miruni.io
 * License: GPL v3 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

// Prevent direct access to this file
if (!defined('ABSPATH')) {
    exit;
}

// Load the autoloader and file loader
require_once plugin_dir_path(__FILE__) . 'autoloader.php';
require_once plugin_dir_path(__FILE__) . 'file-loader.php';

// Register the autoloader
\Miruni\Miruni_Autoloader::register();

// Initialize the file loader
$loader = \Miruni\Miruni_File_Loader::get_instance();

// Register core files with dependencies
$loader->register('env', 'env.php');
$loader->register('api-endpoints', 'api-endpoints.php');
$loader->register('template-dependency-tracker', 'template-dependency-tracker.php');
$loader->register('newrelic', 'newrelic.php');

// Register REST API files with dependencies
$loader->register('rest-api-status', 'rest-api/status.php');
$loader->register('rest-api-base', 'rest-api/base.php');
$loader->register('rest-api-context', 'rest-api/context-api.php', ['rest-api-base']);
$loader->register('rest-api-menu-settings', 'rest-api/menu-settings-api.php', ['rest-api-base']);
$loader->register('rest-api-generate-preview', 'rest-api/generate-preview-api.php', ['rest-api-base']);

// Theme preview files
$loader->register('theme-preview-manager', 'theme-preview/theme-preview-manager.php');
$loader->register('elementor-theme-preview-manager', 'theme-preview/elementor-theme-preview-manager.php', ['theme-preview-manager']);
$loader->register('theme-preview-factory', 'theme-preview/theme-preview-factory.php', ['theme-preview-manager', 'elementor-theme-preview-manager']);
$loader->register('preview-theme-builder', 'theme-preview/preview-theme-builder.php');

// Elementor integration
$loader->register('miruni-elementor', 'elementor/miruni-elementor.php');
$loader->register('elementor-widget-manager', 'elementor/elementor-widget-manager.php', ['miruni-elementor']);

// Page info classes
$loader->register('page-info-base', 'page-info/base.php');
$loader->register('page-info-wordpress', 'page-info/wordpress.php', ['page-info-base']);
$loader->register('page-info-elementor', 'page-info/elementor.php', ['page-info-base']);
$loader->register('page-info-factory', 'page-info/factory.php', ['page-info-wordpress', 'page-info-elementor']);

$loader->register('post-meta-utils', 'post-meta-utils.php');

$loader->register('miruni-notice', 'notice/free-trial-notice.php');

// Load all registered files with dependencies resolved
$loader->load_all();

use Miruni\ThemePreview\Miruni_Theme_Preview_Factory;
use Miruni\RestApi\Miruni_Referenced_Posts_API;
use Miruni\PageInfo\Miruni_Page_Info_Factory;
use Miruni\RestApi\Miruni_Menu_Settings_API;

/**
 * Initialize Miruni components
 */
function miruni_init(): void
{
    Miruni_Referenced_Posts_API::setup();
    Miruni_Menu_Settings_API::setup();
    new Miruni_API_Endpoints();

    // Initialize the appropriate theme preview manager

    Miruni_Theme_Preview_Factory::register_maybe_use_preview_theme();
}

// Hook the initialization function to WordPress init
add_action('init', 'miruni_init');

// @phpstan-ignore missingType.parameter
function miruni_log($message): void
{
    if (defined('WP_DEBUG') && WP_DEBUG === true) {
        if (is_array($message) || is_object($message)) {
            // Using wp_debug_log-compatible approach instead of direct error_log
            if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG === true) {
                error_log(print_r($message, true));
            }
        } else {
            if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG === true) {
                error_log($message);
            }
        }
    }
}

$miruni_logo_svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICA8cGF0aAogICAgZmlsbD0idXJsKCNnc20pIgogICAgZmlsbFJ1bGU9ImV2ZW5vZGQiCiAgICBkPSJNMTEwLjYwNyAxOS42MjZjMS4wMTUtNC41OTggMi4zMzYtOS44MjMgNC45MzctMTMuNTk1IDIuNjAyLTMuNzcyIDYuNTA4LTYuMDE3IDEyLjcxNi00LjYzOCA0LjU5MyAxLjAyNSA5LjgyMyAyLjMzNiAxMy41OTYgNC45MzcgMy43NzIgMi42MDEgNi4wMTIgNi41MTggNC42MyAxMi43MTgtMS4wMTUgNC41OTgtMi4zMzYgOS44MjMtNC45MzcgMTMuNTk1LTIuNjAyIDMuNzcyLTYuNTA4IDYuMDE3LTEyLjcxNiA0LjYzOC00LjU5My0xLjAyNC05LjgyMy0yLjMzNS0xMy41OTYtNC45MzctMy43NzItMi42MDEtNi4wMTItNi41MTctNC42My0xMi43MThaTTIyLjc0OSA1MC41OTJDMzkuNjIgNjguMDI0IDYxLjgzNCA3Mi4wMTkgNzYuMSA3MS41OTdhMTAuMjIyIDEwLjIyMiAwIDAgMCA2LjM2NC0yLjQyOSAxMC4zNCAxMC4zNCAwIDAgMCAzLjQ1My01LjkwM2MzLjUyLTE3Ljc4NC0uNzgtMzkuMDYyLTkuMjA1LTU0LjE0NWExMC44MzQgMTAuODM0IDAgMCAwLTUuNi00Ljc5OSAxMC43MTIgMTAuNzEyIDAgMCAwLTcuMzQ2LS4wNzhDNTAuNjM1IDguNjkyIDM0Ljg2MyAxNy43OTUgMjEuODE4IDM2LjEyYTExLjMzNSAxMS4zMzUgMCAwIDAgLjkzIDE0LjQ3MVptMTU0LjEyNSAxMTAuMDM3YzExLjYxNS04LjcxIDE1LjY5My0yMS41OTkgMTYuNTM2LTMwLjEyNGE2LjEwOCA2LjEwOCAwIDAgMC00LjE1MS02LjQ1MWMtMTAuMTk1LTMuMzk4LTIzLjExOC0yLjQ4OC0zMi42NzkgMS4zNjhhNi41MDUgNi41MDUgMCAwIDAtMy4yNzQgMi45ODMgNi40NDggNi40NDggMCAwIDAtLjU5OCA0LjM3NiA1MC4yNDQgNTAuMjQ0IDAgMCAwIDE1LjUyOSAyNy4zNDEgNi42NzYgNi42NzYgMCAwIDAgNC4yMTggMS44MzMgNi43MzggNi43MzggMCAwIDAgNC40MTktMS4zMjZabS0zNC4xMjEgMTkuNTk5YzQuNjExLTcuMTY2IDQuMjEyLTE1LjEwNCAyLjkyOS0xOS45ODFhMy42MDYgMy42MDYgMCAwIDAtMy42MTMtMi43MTFjLTYuMzQ2LjE5My0xMy4yNjUgMy4zNDQtMTcuNzM5IDcuNDI0YTMuODE0IDMuODE0IDAgMCAwLTEuMTkyIDIuMzEyIDMuNzk2IDMuNzk2IDAgMCAwIC41NjkgMi41MzUgMjkuNjcgMjkuNjcgMCAwIDAgMTQuMTgyIDExLjkxMSAzLjkyOCAzLjkyOCAwIDAgMCAyLjcwMi4xNDcgMy45NDggMy45NDggMCAwIDAgMi4xNjItMS42MzdaTTM4LjU3NyAxNDcuMDQ3Yy42MTcgMy40ODguNDQgOS4wNTUtMy4xOTggMTMuNzU2YTIuNzM2IDIuNzM2IDAgMCAxLTEuNjA3IDEuMDAxIDIuNzc3IDIuNzc3IDAgMCAxLTEuODgzLS4yNzkgMjEuMTU1IDIxLjE1NSAwIDAgMS05LjIzOC05LjI0MSAyLjY2OCAyLjY2OCAwIDAgMS0uMjUzLTEuODA2Yy4xMzEtLjYxMS40NzQtMS4xNTUuOTY4LTEuNTM2IDMuMzY1LTIuNTU1IDguMzg3LTQuMzAzIDEyLjgzOC00LjAyM2EyLjU2IDIuNTYgMCAwIDEgMi4zNzMgMi4xMjhabS03LjgwNC01NS41MDRjLTUuODA0LS44ODYtMTIuNTkuNTY5LTE4LjQ2NiAxLjk5Mi03LjkzNCAxLjkxNi0xMS4xNTkgNi43My0xMi4wNCAxMi41MzItLjg4IDUuODAyLjU4MiAxMi41OTUgMS45ODMgMTguNDY3IDEuOTIgNy45MzUgNi43MjcgMTEuMTUgMTIuNTM1IDEyLjAzNiA1LjgxLjg4NyAxMi02LjU2NyAxOC40NzMtMiA3LjkzMi0xMS4xNTMtNi43MjctMTIuMDM4LTEyLjUyMy0xMi4wMzZabTE2OS4yMjItOS40NTRjLjE0MS03LjU1NC0yLjg3OS0xNS45OTYtNS42OTUtMjMuMjY0LTMuNzk5LTkuODA3LTEwLjUzNC0xMy4xMjUtMTguMDkyLTEzLjI1OS03LjU1OC0uMTMzLTE2LjAwNyAyLjg5My0yMy4yODIgNS43MTMtOS44MjQgMy44MTItMTMuMTI1IDEwLjU0NS0xMy4yNjYgMTguMS0uMTQgNy41NTQgMi44OCAxNS45OTYgNS42OTYgMjMuMjY1IDMuODA0IDkuODE2IDEwLjUyOCAxMy4xMTUgMTguMDg2IDEzLjI0OCA3LjU1OS4xMzMgMTYuMDA3LTIuODkzIDIzLjI4Mi01LjcxMyA5LjgyNC0zLjgxMSAxMy4xMzEtMTAuNTM1IDEzLjI3MS0xOC4wOVptLTkzLjc3Ny03LjE2MmMtOC45OSAyLjcyNS0xNC45OTMgOS41MDYtMTYuNTMgMTcuMjRDODguMTUgOTkuOSA5MS4wNCAxMDguNjI0IDk5Ljg3IDExNS4yMmMxMC4wMjUgNy40ODkgMTguOTI5IDYuNDUxIDI1LjMyNSAxLjkxOGEyNS4xOTcgMjUuMTk3IDAgMCAwIDcuMzI5LTguNDAxIDI1LjAyIDI1LjAyIDAgMCAwIDIuOTY2LTEwLjcyYzAtNS4yMjgtMi44MTctMTIuMzY0LTcuODg0LTE3LjUyYTIwLjQyMiAyMC40MjIgMCAwIDAtOS44NjgtNS45MTUgMjAuNTI0IDIwLjUyNCAwIDAgMC0xMS41MjEuMzQ0Wm0tODguNzg2IDMuNDc4YTUuODI0IDUuODI0IDAgMCAxLTIuMDUtMi4zMzUgNS4xMDcgNS4xMDcgMCAwIDEgLjQtNS41MiA2Ljg1NCA2Ljg1NCAwIDAgMSAzLjk4LTIuNzc2IDYuMzQyIDYuMzQyIDAgMCAxIDUuMTkgMS42NzZjMS40MTMgMS4zNjcgMi4wOCAzLjUxMy42ODIgNi4zMjYtMS4yMzIgMi41MS0zLjI1NCAzLjU3Ny01LjI0MyAzLjU3N2E1LjgxNSA1LjgxNSAwIDAgMS0yLjk1OS0uOTQ4Wm0zNi4wNzkgMzEuOTkzYTE0Ljc3NSAxNC43NzUgMCAwIDAgNS4yNiA1LjkyIDE0Ljk2OCAxNC45NjggMCAwIDAgNy41ODcgMi4zODJjNS4wODEgMCAxMC4yNDUtMi43ODEgMTMuMzkyLTkuMDQ1IDMuNTctNy4xMTQgMS44OC0xMi41NDEtMS43NDQtMTUuOTk3YTE2LjI0NiAxNi4yNDYgMCAwIDAtNi4xNzctMy41ODUgMTYuMzU0IDE2LjM1NCAwIDAgMC03LjEzMy0uNiAxNy41MDggMTcuNTA4IDAgMCAwLTEwLjE2MyA2Ljk2NiAxMi44MSAxMi44MSAwIDAgMC0xLjAyMiAxMy45NlptNzAuMzYzIDMyLjk3M2E3LjA2OCA3LjA2OCAwIDAgMS0yLjQ5OS0yLjg0OSA2LjI1MiA2LjI1MiAwIDAgMSAuNDcyLTYuNzM1IDguMjkgOC4yOSAwIDAgMSA0LjgxOS0zLjM0NiA3LjYyMyA3LjYyMyAwIDAgMSAzLjM4NC4yODUgNy42NzkgNy42NzkgMCAwIDEgMi45MjkgMS43MjdjMS43MzkgMS42NjUgMi41MzIgNC4zMDYuODQ0IDcuNzAzLTEuNDg1IDMuMDI0LTMuOTQxIDQuMzU3LTYuMzQ3IDQuMzU3YTcuMDA0IDcuMDA0IDAgMCAxLTMuNjAyLTEuMTQyWm0tMjMuMjktODQuNjVhMTAuNTkzIDEwLjU5MyAwIDAgMCAzLjc0IDQuMjY0IDEwLjQ5OSAxMC40OTkgMCAwIDAgNS4zOTEgMS43MDhjMy41OTkgMCA3LjI3NC0xLjk5NSA5LjQ5Ny02LjUyIDIuNTI2LTUuMDgzIDEuMzM5LTkuMDM1LTEuMjYzLTExLjUyNmExMS40NjIgMTEuNDYyIDAgMCAwLTQuMzg0LTIuNTg1IDExLjQwOSAxMS40MDkgMCAwIDAtNS4wNjMtLjQyNyAxMi40IDEyLjQgMCAwIDAtNy4yMTEgNS4wMDcgOS4zNjIgOS4zNjIgMCAwIDAtLjcwNyAxMC4wNzhaTTQ4LjI2NiAxNzIuMDc2Yy0yLjY1My0xMS4yOTkgMS4yNy0yNC4wMjEgMTEuNjQzLTMzLjEyMiAxMC4zOS05LjEwOSAyMi4xMjQtOS4yOTkgMzIuMDMzLTUuNDc1IDkuOTA5IDMuODIzIDE4LjAwNiAxMS42OTEgMjEuMTgyIDE4LjcwNiAzLjkyNSA4Ljc4MiAzLjYyNyAyMS45MTEtMi4xODEgMzEuODY5LTUuODA5IDkuOTU3LTE3LjA5MiAxNi43MjctMzUuMDQyIDEyLjc2MS0xNS44NTgtMy40OTQtMjQuOTgyLTEzLjQ0LTI3LjYzNS0yNC43MzlaIgogICAgY2xpcFJ1bGU9ImV2ZW5vZGQiCiAgLz4KICA8cGF0aAogICAgZmlsbD0iIzg4ODg4OCIKICAgIGQ9Ik0xMDAuNTg1IDU4LjcyMWExMC41OTMgMTAuNTkzIDAgMCAwIDMuNzQgNC4yNjUgMTAuNSAxMC41IDAgMCAwIDUuMzkxIDEuNzA5YzMuNTk5IDAgNy4yNzQtMS45OTYgOS40OTctNi41MiAyLjUyNi01LjA4NCAxLjMzOS05LjAzNi0xLjI2My0xMS41MjdhMTEuNDYyIDExLjQ2MiAwIDAgMC00LjM4NC0yLjU4NSAxMS40MSAxMS40MSAwIDAgMC01LjA2My0uNDI3IDEyLjQwMyAxMi40MDMgMCAwIDAtNy4yMTEgNS4wMDcgOS4zNTcgOS4zNTcgMCAwIDAtLjcwNyAxMC4wNzhaTTEyMS4zNzQgMTQwLjUyM2E3LjA2OCA3LjA2OCAwIDAgMCAyLjQ5OSAyLjg0OSA3LjAwNCA3LjAwNCAwIDAgMCAzLjYwMiAxLjE0MmMyLjQwNiAwIDQuODYyLTEuMzMzIDYuMzQ3LTQuMzU3IDEuNjg4LTMuMzk3Ljg5NS02LjAzOC0uODQ0LTcuNzAzYTcuNjc5IDcuNjc5IDAgMCAwLTIuOTI5LTEuNzI3IDcuNjIzIDcuNjIzIDAgMCAwLTMuMzg0LS4yODUgOC4yODcgOC4yODcgMCAwIDAtNC44MTkgMy4zNDYgNi4yNTIgNi4yNTIgMCAwIDAtLjQ3MiA2LjczNVpNNTMuNTEgMTEwLjM5OWExNC43NzUgMTQuNzc1IDAgMCAwIDUuMjYgNS45MiAxNC45NTkgMTQuOTU5IDAgMCAwIDcuNTg4IDIuMzgyYzUuMDgxIDAgMTAuMjQ1LTIuNzgxIDEzLjM5Mi05LjA0NSAzLjU3LTcuMTE0IDEuODgtMTIuNTQtMS43NDQtMTUuOTk3YTE2LjI0NCAxNi4yNDQgMCAwIDAtNi4xNzctMy41ODUgMTYuMzU0IDE2LjM1NCAwIDAgMC03LjEzMy0uNiAxNy41MDggMTcuNTA4IDAgMCAwLTEwLjE2NCA2Ljk2NkExMi44MTEgMTIuODExIDAgMCAwIDUzLjUxIDExMC40WiIKICAvPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgIGlkPSJnc20iCiAgICAgIHgxPSI1NC44NjQiCiAgICAgIHgyPSI1NC44NjQiCiAgICAgIHkxPSIuOTg0IgogICAgICB5Mj0iMTk3Ljk2OCIKICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICA+CiAgICAgIDxzdG9wIHN0b3BDb2xvcj0iZ3JheSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIuNDQ4IiBzdG9wQ29sb3I9IiNBRkFGQUYiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcENvbG9yPSIjOUI5QjlCIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+Cjwvc3ZnPg==';


// Add a menu item to the admin dashboard
function miruni_add_menu_item(): void
{
    global $miruni_logo_svg;
    add_menu_page(
        page_title: 'Miruni', // Page title
        menu_title: 'Miruni', // Menu title
        capability: 'manage_options',  // Capability required to see this option
        menu_slug: 'miruni', // Menu slug
        callback: 'miruni_display_page', // Function to output content
        icon_url: $miruni_logo_svg, // Icon URL (escaped)
    );

    // Add submenu pages that will be handled by React
    add_submenu_page(
        'miruni',                // Parent slug
        'Dashboard',             // Page title
        'Dashboard',             // Menu title
        'manage_options',        // Capability
        'miruni',               // Menu slug (same as parent for default page)
        'miruni_display_page'    // Same display function
    );

    add_submenu_page(
        'miruni',
        'Settings',
        'Settings',
        'manage_options',
        'miruni&view=settings',  // Note the view parameter
        'miruni_display_page'    // Same display function
    );

}
add_action('admin_menu', 'miruni_add_menu_item');

/**
 * Display the plugin page content
 */
function miruni_display_page(): void
{

    ?>
    <div id="miruni-admin-root"></div>
    <?php
}

/**
 * Sets free trial options based on payment subscriptions
 * 
 * @param array<array{id: string|int, nodeId: string, freeTrialEnds: string|null, plan: array{id: string|int, nodeId: string, label: string}}> $payment_subscriptions
 * @return void
 */
function set_free_trial_options(array $payment_subscriptions): void
{
    if (defined('WP_DEBUG') && WP_DEBUG === true) {
        error_log("Setting free trial options: " . json_encode($payment_subscriptions));
    }
    update_option('miruni_is_trial', true);

    $trial_end_date = null;
    if (!empty($payment_subscriptions)) {
        foreach ($payment_subscriptions as $subscription) {
            if (isset($subscription['freeTrialEnds']) && $subscription['freeTrialEnds']) {
                $trial_end_date = $subscription['freeTrialEnds'];
                break;
            }
        }
    }
    if (defined('WP_DEBUG') && WP_DEBUG === true) {
        error_log("Trial end date: " . $trial_end_date);
    }

    if ($trial_end_date) {
        update_option('miruni_trial_end_date', $trial_end_date);

        // Calculate days remaining
        $now = new DateTime();
        $end = new DateTime($trial_end_date);
        $days_remaining = $now->diff($end)->days;

        update_option('miruni_days_remaining', $days_remaining);
    } else {
        delete_option('miruni_trial_end_date');
        delete_option('miruni_days_remaining');
    }
}

/**
 * Custom implementation of miruni_array_find to find the first element in an array that passes a test
 *
 * @param array<mixed> $array The input array
 * @param callable $callback The test function to run on each element
 * @return mixed|null The first matching element or null if none found
 */
function miruni_array_find(array $array, callable $callback): mixed
{
    foreach ($array as $key => $value) {
        if ($callback($value, $key, $array)) {
            return $value;
        }
    }
    return null;
}

/**
 * Initialize WordPress login before admin pages load
 */
function miruni_init_wordpress_login(): void
{
    // Only proceed if we're in the Miruni admin pages
    if (!is_admin()) {
        return;
    }

    // Check and sanitize the 'page' parameter properly
    $page = isset($_GET['page']) ? sanitize_text_field(wp_unslash($_GET['page'])) : '';
    if (empty($page) || strpos($page, 'miruni') !== 0) {
        return;
    }

    try {
        $miruni_service = new Miruni_Service();
        $keys = miruni_get_api_key_and_secret_key();
        $domain = wp_parse_url(get_site_url(), PHP_URL_HOST);

        if (!$domain) {
            do_action('my_plugin_error', new Exception("Domain not found"), [
                'context' => 'miruni_init_wordpress_login',
                'operation' => "Getting domain",
                'user_id' => get_current_user_id()
            ]);
            return;
        }

        // Call the wordpress_login function
        $login_response = $miruni_service->wordpress_login(
            $domain,
            false,
            $keys['api_key'],
            $keys['snippet_secret_key']
        );
        if (!$login_response) {
            return;
        }

        $wp_login_data = isset($login_response['data']) && isset($login_response['data']['wordpressLogin']) ? $login_response['data']['wordpressLogin'] : null;

        $snippet_workspace_id = $wp_login_data['snippet']['workspaceId'] ?? null;


        // Safely access workspaces data
        $workspaces = isset($wp_login_data['workspaces']) && isset($wp_login_data['workspaces']['nodes'])
            ? ($wp_login_data['workspaces']['nodes'])
            : [];

        $snippet_workspace = miruni_array_find($workspaces, function ($workspace) use ($snippet_workspace_id) {
            return $workspace['id'] === $snippet_workspace_id;
        });

        if (!$snippet_workspace) {
            do_action('my_plugin_error', new Exception("Snippet workspace not found"), [
                'context' => 'miruni_init_wordpress_login',
                'operation' => "Getting snippet workspace",
                'user_id' => get_current_user_id()
            ]);
            return;
        }

        if ($snippet_workspace_id && $snippet_workspace["subscriptionStatus"] === "FREE_TRIAL") {
            $payment_subscriptions = $miruni_service->get_workspace_payment_subscriptions($snippet_workspace_id);
            set_free_trial_options($payment_subscriptions);
        } else {
            // Not a trial, update options accordingly
            update_option('miruni_is_trial', false);
            delete_option('miruni_trial_end_date');
            delete_option('miruni_days_remaining');
        }

        // Store the response for later use
        set_transient('miruni_wordpress_login_response', $login_response, 60 * 60);
    } catch (Exception $e) {
        // Log the error but don't disrupt the admin experience
        miruni_log('[Miruni] WordPress login initialization error: ' . $e->getMessage());
        // Store the error message
        set_transient('miruni_wordpress_login_error', $e->getMessage(), 60 * 60);
        // clear the response
        delete_transient('miruni_wordpress_login_response');
    }
}

add_action('admin_init', 'miruni_init_wordpress_login');

function miruni_admin_enqueue_scripts(string $hook): void
{
    // Simple log to test the plugin
    miruni_log('----------------------------------------');
    miruni_log(sprintf('[Miruni] START - Plugin loaded on hook: %s', $hook));

    if ('toplevel_page_miruni' !== $hook) {
        return;
    }

    wp_enqueue_script(
        'miruni-admin-runtime',
        plugins_url('admin/js/runtime.js', __FILE__),
        ['wp-element'],
        null,
        true
    );


    wp_enqueue_script(
        'miruni-admin',
        plugins_url('admin/js/admin.js', __FILE__),
        ['wp-element'],
        null,
        true
    );

    $current_user = wp_get_current_user();
    $keys = miruni_get_api_key_and_secret_key();

    // Get the WordPress login response data
    $login_response = get_transient('miruni_wordpress_login_response');
    $login_error = get_transient('miruni_wordpress_login_error');

    // Using proper debug logging
    if (defined('WP_DEBUG') && WP_DEBUG === true) {
        error_log("MIRUNI_API_ENDPOINT: " . get_env_var('MIRUNI_API_ENDPOINT'));
        error_log("get_miruni_api_url: " . get_miruni_api_url());
    }

    wp_localize_script('miruni-admin', 'miruniData', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'adminUrl' => admin_url('admin.php'),
        'snippetApiKey' => $keys['api_key'],
        'snippetSecretKey' => $keys['snippet_secret_key'],
        'cssUrl' => plugins_url('css/styles.css', __FILE__),
        'stripePublicKey' => get_env_var('STRIPE_PUBLIC_KEY'),
        'miruniApiUrl' => get_env_var('MIRUNI_API_ENDPOINT'), // The url to the Miruni graphql proxy
        'miruniWebappUrl' => get_env_var('SNIPPET_API_ENDPOINT'), // The url to the Miruni webapp
        'nonce' => wp_create_nonce('miruni-nonce'),
        'siteDomain' => wp_parse_url(get_site_url(), PHP_URL_HOST), // Extract domain only
        'auth0' => array(
            'domain' => get_env_var('AUTH0_DOMAIN'),
            'clientId' => get_env_var('AUTH0_CLIENT_ID'),
            'redirectUri' => get_env_var('AUTH0_REDIRECT_URI'),
            'audience' => get_env_var('AUTH0_AUDIENCE'),
        ),
        'currentUser' => array(
            'id' => $current_user->ID,
            'username' => $current_user->user_login,
            'email' => $current_user->user_email,
            'displayName' => $current_user->display_name,
            'roles' => $current_user->roles
        ),
        'posthogId' => get_env_var('POSTHOG_ID'),
        'wordpressLogin' => array(
            'response' => $login_response,
            'error' => $login_error
        ),
        "new" => true
    ));
}
add_action('admin_enqueue_scripts', 'miruni_admin_enqueue_scripts');



/**
 * Summary of miruni_extract_theme_mod_keys
 * @param string $file_content
 * @return array<string>
 */
function miruni_extract_theme_mod_keys($file_content)
{
    $theme_mod_keys = [];

    // Regular expression to match get_theme_mod calls
    // This pattern looks for get_theme_mod with single or double quotes around the key
    $pattern = "/get_theme_mod\(\s*['\"]([^'\"]+)['\"]/";

    // Find all matches
    preg_match_all($pattern, $file_content, $matches);

    if (!empty($matches[1])) {
        // Remove duplicates
        $theme_mod_keys = array_unique($matches[1]);
        // Sort keys alphabetically
        sort($theme_mod_keys);
    }

    return $theme_mod_keys;
}



/**
 * Get current page content and ID
 * @return array<mixed>|null
 */
function miruni_get_current_page_info(): ?array
{
    // Use the factory to get the appropriate page info implementation
    $page_id = get_the_ID();
    $page_info_service = Miruni_Page_Info_Factory::create();
    $page_info = $page_info_service->get_page_info();
    if ($page_id) {
        $template = get_page_template_slug($page_id);
        $page_info['template'] = $template;

    }
    if ($page_id) {
        $endpoints = [
            'referenced_posts' => Miruni_Referenced_Posts_API::get_rest_url($page_id),
            'menu_settings' => Miruni_Menu_Settings_API::get_rest_url($page_id),
        ];
        $page_info['endpoints'] = $endpoints;
    }

    return $page_info;
}

function miruni_add_miruni_footer_code(): void
{
    $api_key = miruni_get_api_key();
    $cdn_domain = get_env_var('SNIPPET_CDN_DOMAIN') . '/miruni_snippet.js';
    $page_info = miruni_get_current_page_info();
    $posthog_id = get_env_var('POSTHOG_ID');
    ?>
    <script>
        window.MIRUNI_PAGE_INFO = <?php echo wp_json_encode($page_info); ?>;
        const SNIPPET_API_KEY = '<?php echo esc_js($api_key ?? ""); ?>';
        const SNIPPET_API_URL = '<?php echo esc_js(get_env_var('SNIPPET_API_ENDPOINT') ?? ""); ?>';

        const s = '<?php echo esc_url($cdn_domain); ?>';
        let e = document.createElement("script");
        e.type = "application/javascript", e.src = s, e.id = "miruni-snippet-script",
            e.setAttribute("data-api-key", SNIPPET_API_KEY), e.setAttribute("data-api-url", SNIPPET_API_URL),
            e.setAttribute("data-posthog-id", '<?php echo esc_js($posthog_id ?? ""); ?>'),
            e.async = !0, document.head.appendChild(e)
    </script>
    <?php
}
add_action('wp_footer', 'miruni_add_miruni_footer_code');

add_action('template_include', function ($template) {
    return $template;
});

