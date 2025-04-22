<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


defined('ABSPATH') or die('No direct script access allowed');

require_once plugin_dir_path(__FILE__) . 'snippet-settings.php';
require_once plugin_dir_path(__FILE__) . 'env.php';
require_once plugin_dir_path(__FILE__) . 'auth.php';
require_once plugin_dir_path(__FILE__) . 'draft-manager.php';
require_once plugin_dir_path(__FILE__) . 'draft-publisher.php';
require_once plugin_dir_path(__FILE__) . 'miruni-service.php';
require_once plugin_dir_path(__FILE__) . 'miruni-update-utils.php';

use Miruni\ThemePreview\Miruni_Theme_Preview_Manager;
use Miruni\Miruni_Draft_Manager;
use Miruni\Miruni_Draft_Publisher;


class Miruni_API_Endpoints
{
    public function __construct()
    {
        add_action('wp_ajax_update_miruni_api_key', [$this, 'set_api_key']);
        add_action('wp_ajax_update_snippet_secret_key', [$this, 'set_snippet_secret_key']);
        add_action('wp_ajax_get_onboarding_status', [$this, 'get_onboarding_status']);
        add_action('wp_ajax_set_onboarding_status', [$this, 'set_onboarding_status']);
        add_action('wp_ajax_exchange_auth0_token', [$this, 'handle_auth0_token_exchange']);
        add_action('wp_ajax_get_auth_token_status', [$this, 'handle_get_auth_token_status']);
        add_action('wp_ajax_clear_auth_tokens', [$this, 'handle_clear_auth_tokens']);
        add_action('wp_ajax_get_pkce_challenge', [$this, 'handle_get_pkce_challenge']);
        add_action('wp_ajax_miruni_logout', [$this, 'handle_logout']);
        add_action('wp_ajax_get_published_pages', [$this, 'handle_get_published_pages']);
        add_action('wp_ajax_request_edit_preview_v2', [$this, 'handle_request_edit_preview_v2']);
        add_action('wp_ajax_update_draft_content', [$this, 'handle_update_draft_content']);
        add_action('wp_ajax_update_draft_title', [$this, 'handle_update_draft_title']);
        add_action('wp_ajax_get_draft_content', [$this, 'handle_get_draft_content']);
        add_action('wp_ajax_publish_draft', [$this, 'handle_publish_draft']);
        add_action('wp_ajax_revert_publish_draft', [$this, 'revert_publish_draft']);
        add_action('wp_ajax_user_update_to_change', [$this, 'handle_user_update_to_change']);
        add_action('wp_ajax_store_other_post_change', [$this, 'handle_store_other_post_change']);
    }



    public function set_api_key(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }

        // make sure api key is in the request
        if (!isset($_POST['api_key'], $_POST['secret_key'])) {
            wp_send_json_error('API key and secret key is required');
        }
        miruni_update_api_key(
            sanitize_text_field(wp_unslash($_POST['api_key'])),
            sanitize_text_field(wp_unslash($_POST['secret_key']))
        );

        wp_send_json_success("API key updated");
    }

    public function set_snippet_secret_key(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }

        // make sure api key is in the request
        if (!isset($_POST['secret_key'])) {
            wp_send_json_error('API key is required');
        }
        miruni_update_snippet_secret_key(sanitize_text_field(wp_unslash($_POST['secret_key'])));

        wp_send_json_success("API key updated");
    }


    public function get_onboarding_status(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }
        $status = miruni_get_onboarding_status();
        if ($status === null) {
            wp_send_json_error('Onboarding status not found');
        }
        wp_send_json_success($status);
    }

    public function set_onboarding_status(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }
        if (!isset($_POST['status'])) {
            wp_send_json_error('Status is required');
        }
        $result = miruni_set_onboarding_status(sanitize_text_field(wp_unslash($_POST['status'])));
        if ($result === false) {
            wp_send_json_error('Failed to update onboarding status');
        }
        wp_send_json_success('Onboarding status updated');
    }

    public function handle_auth0_token_exchange(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }

        if (!isset($_POST['code']) || !isset($_POST['state'])) {
            wp_send_json_error('Code and state are required');
        }

        $code = sanitize_text_field(wp_unslash($_POST['code']));
        $state = sanitize_text_field(wp_unslash($_POST['state']));

        try {
            $token_response = miruni_exchange_auth0_token($code, $state);

            // Store tokens securely
            if (!miruni_store_auth_tokens($token_response)) {
                throw new Exception('Failed to store authentication tokens');
            }

            // Only return non-sensitive data
            wp_send_json_success([
                'authenticated' => true,
                'expires_in' => $token_response['expires_in']
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_get_auth_token_status(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }

        try {
            $result = get_current_access_token();
            if (!$result['token']) {
                wp_send_json_error([
                    'message' => 'No valid access token found',
                    'reason' => $result['reason']
                ]);
            }

            $tokens = get_auth_tokens();
            if (!$tokens || !isset($tokens['expires_at'])) {
                wp_send_json_error([
                    'message' => 'Token expiration not found',
                    'reason' => 'Missing expiration data in stored tokens'
                ]);
            }

            wp_send_json_success([
                'access_token' => $result['token'],
                'expires_at' => (int) $tokens['expires_at'],
                'status' => $result['reason']
            ]);
        } catch (Exception $e) {
            wp_send_json_error([
                'message' => $e->getMessage(),
                'reason' => 'Unexpected error during token validation'
            ]);
        }
    }

    public function handle_clear_auth_tokens(): void
    {


        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!miruni_delete_auth_tokens()) {
                throw new Exception('Failed to delete authentication tokens');
            }
            wp_send_json_success('Tokens cleared successfully');
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_get_pkce_challenge(): void
    {
        if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
            wp_send_json_error('Invalid security token');
        }

        if (!isset($_POST['state'])) {
            wp_send_json_error('State parameter is required');
        }

        $state = sanitize_text_field(wp_unslash($_POST['state']));
        $verifier = miruni_generate_pkce_verifier();
        $challenge = miruni_generate_pkce_challenge($verifier);

        if (!miruni_store_pkce_verifier($state, $verifier)) {
            wp_send_json_error('Failed to store PKCE verifier');
        }

        wp_send_json_success(['challenge' => $challenge]);
    }

    public function handle_logout(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!miruni_perform_complete_logout()) {
                throw new Exception('Failed to perform logout');
            }

            wp_send_json_success('Logged out successfully');
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }



    public function handle_get_published_pages(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            $pages = get_pages([
                'post_status' => 'publish',
                'sort_column' => 'post_title',
            ]);

            if (empty($pages)) {
                throw new Exception('No published pages found');
            }

            $formatted_pages = array_map(function ($page) {
                return [
                    'id' => $page->ID,
                    'title' => $page->post_title,
                    'slug' => $page->post_name,
                    'url' => get_permalink($page->ID),
                ];
            }, $pages);

            wp_send_json_success($formatted_pages);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }


    public function handle_request_edit_preview_v2(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            // Check required fields exist before sanitizing
            if (!isset($_POST['page_id']) || !isset($_POST['updates']) || !isset($_POST['suggestion_batch_id'])) {
                throw new Exception('Page ID, updates, and suggestion_batch_id are required');
            }

            // Sanitize simple inputs
            $page_id = intval($_POST['page_id']);
            $suggestion_batch_id = intval($_POST['suggestion_batch_id']);

            // Use the new function to sanitize the 'updates' JSON
            // Pass $_POST['updates'] directly, the function handles null check and unslashing
            $updates = miruni_sanitize_update_json($_POST['updates']);

            // No need for json_decode or further validation here, it's done in the function

            $preview_manager = new Miruni_Theme_Preview_Manager();
            $draft_manager = new Miruni_Draft_Manager(
                $preview_manager
            );

            // Pass the sanitized $updates array
            $edit_preview_data = $draft_manager->request_edit_preview_v2($page_id, $suggestion_batch_id, $updates);

            wp_send_json_success($edit_preview_data);
        } catch (Exception $e) {
            // Log the error for debugging
            error_log("Miruni API Error in handle_request_edit_preview_v2: " . $e->getMessage());
            // Send a generic error to the client
            wp_send_json_error('An error occurred while processing the preview request: ' . $e->getMessage());
        }
    }

    public function handle_update_draft_content(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['post_id']) || !isset($_POST['content'])) {
                throw new Exception('Post ID and content are required');
            }

            $post_id = intval($_POST['post_id']);
            $content = wp_kses_post(wp_unslash($_POST['content']));

            // Verify that the post exists and is a draft
            $post = get_post($post_id);
            if (!$post) {
                throw new Exception('Post not found');
            }
            $post_status = "";
            if ($post instanceof WP_Post) {
                $post_status = $post->post_status;
            } else {
                $post_status = $post['post_status'];
            }

            if ($post_status !== 'draft') {
                throw new Exception('Cannot update content: Post is not a draft');
            }

            // Update the post content
            $update_result = wp_update_post([
                'ID' => $post_id,
                'post_content' => $content
            ], true);

            if (is_wp_error($update_result)) {
                throw new Exception($update_result->get_error_message());
            }

            wp_send_json_success([
                'post_id' => $post_id,
                'message' => 'Draft updated successfully'
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_update_draft_title(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['post_id']) || !isset($_POST['title'])) {
                throw new Exception('Post ID and title are required');
            }

            $post_id = intval($_POST['post_id']);
            $title = sanitize_text_field(wp_unslash($_POST['title']));

            // Verify that the post exists and is a draft
            $post = get_post($post_id);
            if (!$post) {
                throw new Exception('Post not found');
            }

            $post_status = $post instanceof WP_Post ? $post->post_status : $post['post_status'];
            if ($post_status !== 'draft') {
                throw new Exception('Cannot update title: Post is not a draft');
            }

            // Update the post title
            $update_result = wp_update_post([
                'ID' => $post_id,
                'post_title' => $title
            ], true);

            if (is_wp_error($update_result)) {
                throw new Exception($update_result->get_error_message());
            }

            wp_send_json_success([
                'post_id' => $post_id,
                'message' => 'Draft title updated successfully'
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_get_draft_content(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['post_id'])) {
                throw new Exception('Post ID is required');
            }

            $post_id = intval($_POST['post_id']);

            // Verify that the post exists and is a draft
            $post = get_post($post_id);
            if (!$post) {
                throw new Exception('Post not found');
            }

            $post_status = $post instanceof WP_Post ? $post->post_status : $post['post_status'];
            if ($post_status !== 'draft') {
                throw new Exception('Post is not a draft');
            }
            $post_content = $post instanceof WP_Post ? $post->post_content : $post['post_content'];
            $post_title = $post instanceof WP_Post ? $post->post_title : $post['post_title'];

            $parent = get_post($post instanceof WP_Post ? $post->post_parent : $post['post_parent']);
            if (!$parent instanceof WP_Post) {
                throw new Exception('Parent post not found');
            }

            wp_send_json_success([
                'post_id' => $post_id,
                'content' => $post_content,
                'title' => $post_title,
                'parent_id' => $parent->ID,
                'parent_content' => $parent->post_content,
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_publish_draft(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['post_id'])) {
                throw new Exception('Post ID is required');
            }

            $draft_id = intval($_POST['post_id']);
            $draft = get_post($draft_id);

            if (!$draft) {
                throw new Exception('Draft not found');
            }

            $parent_id = Miruni_Draft_Publisher::publish_draft($draft_id);

            wp_send_json_success([
                'post_id' => $parent_id,
                'message' => 'Changes published successfully'
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function revert_publish_draft(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['post_id'])) {
                throw new Exception('Post ID is required');
            }

            $post_id = intval($_POST['post_id']);

            $parent_id = Miruni_Draft_Publisher::revert_published_changes($post_id);

            wp_send_json_success([
                'post_id' => $parent_id,
                'message' => 'Reverted changes successfully'
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_user_update_to_change(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['draft_id']) || !isset($_POST['change'])) {
                throw new Exception('User ID and change are required');
            }

            $draft_id = intval($_POST['draft_id']);
            $sanitized_changes = miruni_sanitize_update_json($_POST['change']);

            $preview_manager = new Miruni_Theme_Preview_Manager();
            $draft_manager = new Miruni_Draft_Manager(
                $preview_manager
            );
            $result = $draft_manager->handle_ad_hoc_change($draft_id, $sanitized_changes[0]);

            wp_send_json_success($result);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function handle_store_other_post_change(): void
    {
        try {
            if (!check_ajax_referer('miruni-nonce', 'nonce', false)) {
                wp_send_json_error('Invalid security token');
            }

            if (!isset($_POST['draft_id']) || !isset($_POST['change_type']) || !isset($_POST['content'])) {
                throw new Exception('Missing required parameters: draft_id, change_type, and content are required');
            }

            $draft_id = intval($_POST['draft_id']);
            $change_type = sanitize_text_field(wp_unslash($_POST['change_type']));
            $content = wp_kses_post(wp_unslash($_POST['content']));

            // Verify that draft exists
            $draft = get_post($draft_id);
            if (!$draft) {
                throw new Exception('Draft post not found');
            }

            $preview_manager = new Miruni_Theme_Preview_Manager();
            $draft_manager = new Miruni_Draft_Manager($preview_manager);

            $result = false;

            switch ($change_type) {
                case 'post_title':
                    if (!isset($_POST['post_id'])) {
                        throw new Exception('Post ID is required for title changes');
                    }
                    $post_id = intval($_POST['post_id']);
                    $result = $draft_manager->store_other_post_title_change($draft_id, $post_id, $content);
                    break;

                case 'post_content':
                    if (!isset($_POST['post_id'])) {
                        throw new Exception('Post ID is required for content changes');
                    }
                    $post_id = intval($_POST['post_id']);
                    $result = $draft_manager->store_other_post_content_change($draft_id, $post_id, $content);
                    break;

                case 'theme_mod':
                    if (!isset($_POST['mod_name'])) {
                        throw new Exception('Mod name is required for theme mod changes');
                    }
                    $mod_name = sanitize_text_field(wp_unslash($_POST['mod_name']));
                    $result = $draft_manager->store_theme_mod_change($draft_id, $mod_name, $content);
                    break;

                default:
                    throw new Exception('Invalid change type');
            }

            if (!$result) {
                throw new Exception('Failed to store change');
            }

            wp_send_json_success([
                'draft_id' => $draft_id,
                'change_type' => $change_type,
                'message' => 'Change stored successfully'
            ]);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
}