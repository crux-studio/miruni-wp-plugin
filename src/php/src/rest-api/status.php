<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


add_action('rest_api_init', function () {


    register_rest_route('miruni/v1', '/test/', [
        'methods' => 'GET',
        'callback' => function () {
            return new WP_REST_Response(['status' => 'success', 'test' => true]);
        },
        'permission_callback' => '__return_true'
    ]);

    // List all registered routes for debugging
    global $wp_rest_server;
    if ($wp_rest_server) {
        $routes = $wp_rest_server->get_routes();
    }
});

// Run the check on wp_loaded which runs after rest_api_init
add_action('admin_footer', 'check_rest_api_status', 999); // High priority to ensure it runs later



function check_rest_api_status(): void
{
    // Only check on admin pages to avoid unnecessary checks on frontend
    if (!is_admin()) {
        return;
    }

    // Allow bypassing the check with a URL parameter for troubleshooting
    if (isset($_GET['miruni_bypass_rest_check'])) {
        return;
    }

    // Check if we already ran this test recently
    $cached_status = get_transient('miruni_rest_api_status');
    if ($cached_status === 'working') {
        return; // API was working in previous check, don't check again for a while
    }

    $test_route = rest_url('miruni/v1/test');
    error_log("Miruni: Testing REST API at: $test_route (wp_loaded hook)");

    // Use wp_remote_get with additional parameters for more reliable testing
    $response = wp_remote_get($test_route, [
        'timeout' => 15, // Increase timeout
        'sslverify' => false, // Skip SSL verification for internal requests
        'headers' => [
            'Cache-Control' => 'no-cache',
        ],
    ]);

    if (is_wp_error($response)) {
        error_log("Miruni REST API Error: " . $response->get_error_message());
        add_action('admin_notices', 'miruni_rest_api_disabled_notice');
        return;
    }

    $status_code = wp_remote_retrieve_response_code($response);
    error_log("Miruni REST API status code: " . $status_code);

    // Check for successful response
    if (200 !== $status_code) {
        error_log("Miruni REST API unexpected status code: " . $status_code);
        add_action('admin_notices', 'miruni_rest_api_disabled_notice');
    } else {
        // Cache successful result for 24 hours to prevent constant checking
        set_transient('miruni_rest_api_status', 'working', 60 * 60 * 24);
    }
}

/**
 * Display an admin notice when REST API is disabled
 */
function miruni_rest_api_disabled_notice(): void
{
    $test_route = rest_url('miruni/v1/test');
    $admin_url = admin_url('index.php?miruni_bypass_rest_check=1');
    ?>
    <div class="notice notice-error">
        <p>
            <strong>Warning:</strong> The WordPress REST API appears to be inaccessible to the Miruni plugin internally,
            even though it might work when accessed directly with a browser.
        </p>
        <p>
            <strong>How to fix this:</strong>
        <ul style="list-style-type: disc; padding-left: 20px;">
            <li>Go to <a href="<?php echo esc_url(admin_url('options-permalink.php')); ?>">Permalinks Settings</a> and make
                sure your
                permalink structure is not set to "Plain"</li>
            <li>Check if any security plugins are blocking internal REST API requests</li>
            <li>Verify your .htaccess file doesn't have rules blocking the /wp-json/ endpoint</li>
            <li>Some server configurations may block requests from PHP to the same server - contact your hosting provider
            </li>
        </ul>
        </p>
        <p>
            <a href="<?php echo esc_url($test_route); ?>" target="_blank" class="button">Test REST API Directly</a>
            <a href="<?php echo esc_url($admin_url); ?>" class="button">Dismiss This Notice</a>
        </p>
        <p><strong>Technical details:</strong> The plugin tried to access <code><?php echo esc_html($test_route); ?></code>
            internally but failed.</p>
    </div>
    <?php
}

// Add option to recheck the REST API status
add_action('admin_init', function () {
    if (isset($_GET['miruni_recheck_rest'])) {
        // Clear any cached results
        delete_transient('miruni_rest_api_status');
        // Add a flag to force an immediate check on the next page load
        update_option('miruni_force_rest_check', true);
        // Redirect back to remove the query parameter
        wp_redirect(remove_query_arg('miruni_recheck_rest'));
        exit;
    }

    // If force check flag is set, run the check immediately after rest_api_init
    if (get_option('miruni_force_rest_check')) {
        delete_option('miruni_force_rest_check');
        add_action('rest_api_init', function () {
            // Short delay to ensure all routes are registered
            add_action('admin_footer', 'check_rest_api_status');
        }, 999);
    }
});
