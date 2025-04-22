<?php

namespace Miruni;

use WP_Post;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


use Exception;

/**
 * Utility class for handling post meta operations
 */
class Miruni_Post_Meta_Utils
{
    /**
     * Updates a value in a post meta array
     * 
     * @param int $post_id The ID of the post to update meta for
     * @param Miruni_Preview_Meta_Keys::* $meta_key The meta key for the array
     * @param string|int $item_key The key within the array to update
     * @param mixed $item_value The new value to set
     * @param ?string $log_message Optional message to log
     * @return bool Success status
     */
    public static function update_meta_array_item(
        int $post_id,
        string $meta_key,
        string|int $item_key,
        mixed $item_value,
        ?string $log_message = null
    ): bool {
        try {
            error_log("Updating post meta array: {$meta_key} for post ID: {$post_id}");
            // Log message if provided
            if ($log_message) {
                do_action('miruni_error', new Exception($log_message), [
                    'context' => [
                        'post_id' => $post_id,
                        'meta_key' => $meta_key,
                        'item_key' => $item_key,
                        'item_value' => $item_value
                    ],
                    'operation' => 'Update Meta Array Item',
                    'user_id' => get_current_user_id()
                ]);
            }

            // Get existing changes if any
            $changes = get_post_meta($post_id, $meta_key, true);
            error_log("Existing changes: " . print_r($changes, true));
            if (!is_array($changes)) {
                $changes = [];
            }

            // Add or update the item
            $changes[$item_key] = $item_value;

            // Save to post meta
            update_post_meta($post_id, $meta_key, $changes);

            return true;
        } catch (Exception $e) {
            error_log($e->getMessage());
            do_action('miruni_error', $e, [
                'context' => [
                    'post_id' => $post_id,
                    'meta_key' => $meta_key,
                    'item_key' => $item_key
                ],
                'operation' => 'Failed to update post meta array',
                'user_id' => get_current_user_id()
            ]);
            return false;
        }
    }

    /**
     * Apply transient title changes
     * 
     * @param int $draft_id The draft post ID
     * @param array<int,string> $existing_changes Existing title changes to avoid duplication
     * @return array<int,string> Updated title changes
     */
    public static function apply_transient_title_changes(int $draft_id, array $existing_changes = []): array
    {
        $title_changes = $existing_changes;
        $transient_key = 'miruni_preview_titles_' . $draft_id;
        $transient_title_changes = get_transient($transient_key);

        if (is_array($transient_title_changes) && !empty($transient_title_changes)) {
            foreach ($transient_title_changes as $post_id => $new_title) {
                if (!isset($title_changes[$post_id])) { // Don't duplicate if already processed from meta
                    $result = wp_update_post([
                        'ID' => $post_id,
                        'post_title' => $new_title
                    ]);

                    if ($result) {
                        $title_changes[$post_id] = $new_title;
                    }
                }
            }
        }

        return $title_changes;
    }

    /**
     * Apply theme mod changes from both post meta and transients
     * 
     * @param int $draft_id The draft post ID
     * @return array<string,mixed> Applied theme mods
     */
    public static function apply_theme_mod_changes(int $draft_id): array
    {
        $theme_mod_changes = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::THEME_MODS, true);
        $transient_theme_mods = get_transient('miruni_preview_theme_mods_' . $draft_id);
        $applied_mods = [];

        // Merge and apply theme mod changes
        if (is_array($theme_mod_changes) || is_array($transient_theme_mods)) {
            $combined_mods = array_merge(
                is_array($theme_mod_changes) ? $theme_mod_changes : [],
                is_array($transient_theme_mods) ? $transient_theme_mods : []
            );

            foreach ($combined_mods as $mod_name => $value) {
                set_theme_mod($mod_name, $value);
                $applied_mods[$mod_name] = $value;
            }
        }

        return $applied_mods;
    }

    /**
     * Apply WordPress option changes
     * 
     * @param int $draft_id The draft post ID
     * @return array<string,mixed> Applied options
     */
    public static function apply_wp_option_changes(int $draft_id): array
    {
        $applied_options = [];
        $wp_option_changes = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::WP_OPTIONS, true);

        if (is_array($wp_option_changes)) {
            foreach ($wp_option_changes as $option_name => $value) {
                do_action('miruni_error', new Exception("Updating WP option: {$option_name}"), [
                    'context' => [
                        'draft_id' => $draft_id,
                        'option_name' => $option_name,
                        'value' => $value
                    ],
                    'operation' => 'Update WordPress Option',
                    'user_id' => get_current_user_id()
                ]);
                update_option($option_name, $value);
                $applied_options[$option_name] = $value;
            }
        }

        return $applied_options;
    }

    /**
     * Apply menu item name changes
     * 
     * @param int $draft_id The draft post ID
     * @return array<int,string> Applied menu item changes
     */
    public static function apply_menu_item_changes(int $draft_id): array
    {
        $applied_changes = [];
        $menu_item_names = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::MENU_ITEM_NAMES, true);

        do_action('miruni_error', new Exception("Applying menu item changes"), [
            'context' => [
                'draft_id' => $draft_id,
                'menu_item_names' => $menu_item_names
            ],
            'operation' => 'Apply Menu Item Changes',
            'user_id' => get_current_user_id()
        ]);

        if (is_array($menu_item_names)) {
            foreach ($menu_item_names as $menu_item_id => $new_name) {
                $menu_terms = wp_get_object_terms($menu_item_id, 'nav_menu');
                $menu_id = 0; // Default fallback
                if (!empty($menu_terms) && !is_wp_error($menu_terms)) {
                    $menu_id = $menu_terms[0]->term_id;
                }
                if ($menu_id === 0) {
                    do_action('miruni_error', new Exception("Failed to get menu ID for menu item {$menu_item_id}"), [
                        'context' => [
                            'draft_id' => $draft_id,
                            'menu_item_id' => $menu_item_id
                        ],
                        'operation' => 'Apply Menu Item Changes',
                        'user_id' => get_current_user_id()
                    ]);
                    continue;
                }
                $menu_item_post = get_post($menu_item_id);
                if (!($menu_item_post instanceof WP_Post)) {
                    do_action('miruni_error', new Exception("Menu item post not found for ID {$menu_item_id}"), [
                        'context' => [
                            'draft_id' => $draft_id,
                            'menu_item_id' => $menu_item_id
                        ],
                        'operation' => 'Apply Menu Item Changes',
                        'user_id' => get_current_user_id()
                    ]);
                    continue;
                }
                wp_update_post([
                    'ID' => $menu_item_id,
                    'post_title' => $new_name
                ]);
                $applied_changes[$menu_item_id] = $new_name;
            }
        }

        return $applied_changes;
    }

    /**
     * Apply block template changes
     * 
     * @param int $draft_id The draft post ID
     * @return array<string,bool> Applied block template changes
     */
    public static function apply_block_template_changes(int $draft_id): array
    {
        $applied_changes = [];
        $block_templates = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::BLOCK_TEMPLATE, true);

        if (!is_array($block_templates) || empty($block_templates)) {
            return $applied_changes;
        }

        do_action('miruni_error', new Exception("Applying block template changes"), [
            'context' => [
                'draft_id' => $draft_id,
                'block_templates' => $block_templates
            ],
            'operation' => 'Apply Block Template Changes',
            'user_id' => get_current_user_id()
        ]);

        foreach ($block_templates as $template_slug => $template_content) {
            // Skip if no content
            if (empty($template_content)) {
                continue;
            }

            // For theme templates, we need to get the active theme
            $current_theme = get_stylesheet();

            // Determine template type (template or template part)
            $template_type = 'wp_template';
            if (strpos($template_slug, 'template-parts/') === 0) {
                $template_type = 'wp_template_part';
                // Remove the template-parts/ prefix for proper slug
                $template_slug = str_replace('template-parts/', '', $template_slug);
            }

            // Try to find existing template
            $template_post = null;

            // Query for existing customized template
            $query_args = [
                'post_type' => $template_type,
                'post_status' => ['publish', 'auto-draft'],
                'name' => $template_slug,
                'posts_per_page' => 1,
                'no_found_rows' => true,
                'tax_query' => [
                    [
                        'taxonomy' => 'wp_theme',
                        'field' => 'name',
                        'terms' => $current_theme
                    ]
                ],
            ];

            $template_query = new \WP_Query($query_args);

            if ($template_query->have_posts()) {
                $template_post = $template_query->posts[0];
            }

            // If template exists, update it
            if ($template_post && $template_post instanceof \WP_Post) {
                $update_args = [
                    'ID' => $template_post->ID,
                    'post_content' => $template_content,
                ];

                wp_update_post($update_args);

                $applied_changes[$template_slug] = true;

            } else {
                // Template doesn't exist, create a new one
                $insert_args = [
                    'post_type' => $template_type,
                    'post_name' => $template_slug,
                    'post_title' => ucwords(str_replace(['-', '_'], ' ', $template_slug)),
                    'post_content' => $template_content,
                    'post_status' => 'publish',
                    'tax_input' => [
                        'wp_theme' => [$current_theme]
                    ]
                ];

                $new_id = wp_insert_post($insert_args);

                // @phpstan-ignore function.impossibleType
                if ($new_id && !is_wp_error($new_id)) {
                    // Set the theme for the template
                    wp_set_post_terms($new_id, [$current_theme], 'wp_theme');

                    $applied_changes[$template_slug] = true;
                    do_action('miruni_error', new Exception("Created new template: {$template_slug} (ID: {$new_id})"), [
                        'context' => [
                            'draft_id' => $draft_id,
                            'template_slug' => $template_slug,
                            'new_id' => $new_id
                        ],
                        'operation' => 'Create New Block Template',
                        'user_id' => get_current_user_id()
                    ]);
                } else {
                    do_action('miruni_error', new Exception("Failed to create template: {$template_slug}"), [
                        'context' => [
                            'draft_id' => $draft_id,
                            'template_slug' => $template_slug,
                        ],
                        'operation' => 'Create New Block Template',
                        'user_id' => get_current_user_id()
                    ]);
                }
            }
        }

        return $applied_changes;
    }
}


/**
 * Enum-like class for draft preview meta keys
 */
class Miruni_Preview_Meta_Keys
{
    /**
     * Meta key for storing menu item name changes
     */
    public const MENU_ITEM_NAMES = '_miruni_menu_item_names';

    /**
     * Meta key for storing other post title changes
     */
    public const OTHER_POST_TITLES = '_miruni_other_post_titles';

    /**
     * Meta key for storing other post content changes
     */
    public const OTHER_POST_CONTENT = '_miruni_other_post_content';

    /**
     * Meta key for storing other post excerpt changes
     */
    public const OTHER_POST_EXCERPTS = '_miruni_other_post_excerpts';

    /**
     * Meta key for storing theme modification changes
     */
    public const THEME_MODS = '_miruni_theme_mods';

    /**
     * Meta key for storing WordPress option changes
     */
    public const WP_OPTIONS = '_miruni_wp_options';

    /**
     * Meta key for storing Elementor changes
     */
    public const ELEMENTOR_JSON = '_miruni_elementor_json';

    /**
     * Meta key for storing updates to the block template
     */
    public const BLOCK_TEMPLATE = '_miruni_block_template';

    /**
     * Meta key for storing menu item parent changes
     */
    public const MENU_ITEM_PARENTS = '_miruni_menu_item_parents';

    /**
     * Meta key for storing menu item URL changes
     */
    public const MENU_ITEM_URLS = '_miruni_menu_item_urls';

    /**
     * Meta key for storing menu item object ID changes
     */
    public const MENU_ITEM_OBJECT_IDS = '_miruni_menu_item_object_ids';

    /**
     * Meta key for storing menu item object changes
     */
    public const MENU_ITEM_OBJECTS = '_miruni_menu_item_objects';
}

/**
 * Special placeholder post ID values for non-standard WordPress content
 * 
 * The Miruni plugin generally operates on individual WordPress posts with unique post IDs.
 * However, certain WordPress features don't map to specific post IDs (like the "Latest Posts" 
 * homepage). This class provides standardized placeholder values to handle these special cases.
 * 
 * Usage:
 * When a function requires a post ID but you're working with content that doesn't have one,
 * use these constants instead of hardcoding magic numbers in your code.
 * 
 * Example:
 * ```php
 * if ($post_id === Miruni_Post_ID_Placeholder::LATEST_POSTS) {
 *     // Handle latest posts homepage specially
 * }
 * ```
 */
class Miruni_Post_ID_Placeholder
{
    /**
     * Placeholder ID for the "Your Latest Posts" homepage display
     * 
     * WordPress can display recent posts on the homepage without being tied
     * to a specific post ID. Use this constant when you need to reference
     * this special case in functions that normally operate on post IDs.
     * 
     * @var int
     */
    public const LATEST_POSTS = -1;

    // Additional placeholder IDs can be added here as needed
}