<?php

namespace Miruni;

use Miruni\Elementor\Miruni_Elementor_Service;
use Miruni\Miruni_Post_Meta_Utils;
use Miruni\Miruni_Preview_Meta_Keys;

use Exception;
use WP_Post;
class Miruni_Draft_Publisher
{

    /**
     * Clean up all temporary data associated with a draft
     * 
     * @param int $draft_id ID of the draft post
     * @return void
     */
    public static function cleanup_draft_data(int $draft_id): void
    {
        // Clean up post meta using enum constants
        $meta_keys = [
            Miruni_Preview_Meta_Keys::OTHER_POST_TITLES,
            Miruni_Preview_Meta_Keys::OTHER_POST_CONTENT,
            Miruni_Preview_Meta_Keys::OTHER_POST_EXCERPTS,
            Miruni_Preview_Meta_Keys::THEME_MODS,
            Miruni_Preview_Meta_Keys::WP_OPTIONS,
            Miruni_Preview_Meta_Keys::ELEMENTOR_JSON,
            Miruni_Preview_Meta_Keys::BLOCK_TEMPLATE,
            Miruni_Preview_Meta_Keys::MENU_ITEM_NAMES,
            Miruni_Preview_Meta_Keys::MENU_ITEM_PARENTS,
            Miruni_Preview_Meta_Keys::MENU_ITEM_URLS,
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECT_IDS,
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECTS
        ];

        foreach ($meta_keys as $meta_key) {
            delete_post_meta($draft_id, $meta_key);
        }

        // Clean up transients
        $transient_keys = [
            'miruni_preview_titles_' . $draft_id,
            'miruni_preview_content_' . $draft_id,
            'miruni_preview_theme_mods_' . $draft_id
        ];

        foreach ($transient_keys as $transient_key) {
            delete_transient($transient_key);
        }

        do_action('miruni_error', new Exception("Cleaned up temporary data for draft ID: {$draft_id}"), [
            'context' => [
                'draft_id' => $draft_id,
                'meta_keys' => $meta_keys,
                'transient_keys' => $transient_keys
            ],
            'operation' => 'Cleanup Draft Data',
            'user_id' => get_current_user_id()
        ]);
    }

    /**
     * Store original state when publishing to enable later reversion
     * 
     * @param int $draft_id ID of the draft being published
     * @param int $parent_id ID of the parent post being updated
     * @return bool Success status
     */
    private static function create_reversion_backup(int $draft_id, int $parent_id): bool
    {
        try {
            $parent_post = get_post($parent_id);

            // Create backup object
            $backup = [
                'timestamp' => current_time('mysql'),
                'parent_post' => [
                    'ID' => $parent_id,
                    'post_title' => $parent_post instanceof WP_Post ? $parent_post->post_title : null,
                    'post_content' => $parent_post instanceof WP_Post ? $parent_post->post_content : null,
                ],
                'other_titles' => [],
                'other_content' => [],
                'other_excerpts' => [],
                'theme_mods' => [],
                'wp_options' => [],
                'block_template' => [],
                'menu_item_names' => [],
                'menu_item_parents' => [],
                'menu_item_urls' => [],
                'menu_item_object_ids' => [],
                'menu_item_objects' => []
            ];

            // Backup parent post's Elementor data if it exists
            $elementor_data = get_post_meta($parent_id, '_elementor_data', true);
            if ($elementor_data) {
                $backup['parent_post']['_elementor_data'] = $elementor_data;
            }

            // Store original titles and content of other posts being modified
            $post_changes = [
                Miruni_Preview_Meta_Keys::OTHER_POST_TITLES => ['field' => 'post_title', 'backup_key' => 'other_titles'],
                Miruni_Preview_Meta_Keys::OTHER_POST_CONTENT => ['field' => 'post_content', 'backup_key' => 'other_content'],
                Miruni_Preview_Meta_Keys::OTHER_POST_EXCERPTS => ['field' => 'post_excerpt', 'backup_key' => 'other_excerpts'],
                Miruni_Preview_Meta_Keys::THEME_MODS => ['field' => 'option_value', 'backup_key' => 'theme_mods'],
                Miruni_Preview_Meta_Keys::MENU_ITEM_NAMES => ['field' => 'menu_item_name', 'backup_key' => 'menu_item_names'],
                Miruni_Preview_Meta_Keys::WP_OPTIONS => ['field' => 'option_value', 'backup_key' => 'wp_options'],
                Miruni_Preview_Meta_Keys::BLOCK_TEMPLATE => ['field' => 'block_template', 'backup_key' => 'block_template']
            ];

            foreach ($post_changes as $meta_key => $config) {
                $changes = get_post_meta($draft_id, $meta_key, true);

                do_action('miruni_error', new Exception("Processing changes for meta key: {$meta_key}"), [
                    'context' => [
                        'draft_id' => $draft_id,
                        'parent_id' => $parent_id,
                        'meta_key' => $meta_key,
                        'changes' => $changes
                    ],
                    'operation' => 'Create Reversion Backup',
                    'user_id' => get_current_user_id()
                ]);

                $transient_changes = get_transient('miruni_preview_' . $meta_key . '_' . $draft_id);

                $changes = is_array($changes) ? $changes : [];
                $transient_changes = is_array($transient_changes) ? $transient_changes : [];

                // Merge the changes properly, preserving keys
                $merged_changes = $changes;
                foreach ($transient_changes as $key => $value) {
                    $merged_changes[$key] = $value;
                }

                foreach ($merged_changes as $key => $new_value) {
                    $value = null;
                    if ($config['field'] === 'option_value') {
                        $value = get_theme_mod($key);
                    } else if ($config['field'] === "block_template") {
                        $blocks = get_block_templates([
                            'slug_in' => $key,
                        ]);
                        $block = null;
                        if (count($blocks) > 0) {
                            $block = $blocks[0];
                        }

                        if ($block) {
                            $value = $block->content;
                        }
                    } else {
                        $original_post = get_post($key);
                        if ($original_post instanceof WP_Post && isset($original_post->{$config['field']})) {
                            $value = $original_post->{$config['field']};
                        }
                    }

                    if ($value) {
                        $backup[$config['backup_key']][$key] = $value;
                    }
                }
            }

            // Store original wp_option values
            $wp_option_changes = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::WP_OPTIONS, true);

            if (is_array($wp_option_changes)) {
                foreach ($wp_option_changes as $option_name => $new_value) {
                    // Store the original option value
                    $original_value = get_option($option_name);

                    $backup['wp_options'][$option_name] = $original_value;

                    do_action('miruni_error', new Exception("Backing up WP option: {$option_name}"), [
                        'context' => [
                            'draft_id' => $draft_id,
                            'parent_id' => $parent_id,
                            'option_name' => $option_name,
                            'original_value' => $original_value
                        ],
                        'operation' => 'Backup WordPress Option',
                        'user_id' => get_current_user_id()
                    ]);
                }
            }

            // Store original menu item meta values
            $menu_item_meta_keys = [
                Miruni_Preview_Meta_Keys::MENU_ITEM_NAMES => ['backup_key' => 'menu_item_names', 'original_meta' => 'post_title'],
                Miruni_Preview_Meta_Keys::MENU_ITEM_PARENTS => ['backup_key' => 'menu_item_parents', 'original_meta' => '_menu_item_menu_item_parent'],
                Miruni_Preview_Meta_Keys::MENU_ITEM_URLS => ['backup_key' => 'menu_item_urls', 'original_meta' => '_menu_item_url'],
                Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECT_IDS => ['backup_key' => 'menu_item_object_ids', 'original_meta' => '_menu_item_object_id'],
                Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECTS => ['backup_key' => 'menu_item_objects', 'original_meta' => '_menu_item_object'],
            ];

            foreach ($menu_item_meta_keys as $draft_meta_key => $config) {
                $changes = get_post_meta($draft_id, $draft_meta_key, true);
                if (is_array($changes)) {
                    foreach (array_keys($changes) as $menu_item_id) {
                        if (!isset($backup[$config['backup_key']][$menu_item_id])) {
                            $original_value = null;
                            if ($config['original_meta'] === 'post_title') {
                                $menu_item_post = get_post($menu_item_id);
                                if ($menu_item_post instanceof WP_Post) {
                                    $original_value = $menu_item_post->post_title;
                                }
                            } else {
                                $original_value = get_post_meta($menu_item_id, $config['original_meta'], true);
                            }
                            $backup[$config['backup_key']][$menu_item_id] = $original_value;
                        }
                    }
                }
            }

            do_action('miruni_error', new Exception("Created reversion backup"), [
                'context' => [
                    'draft_id' => $draft_id,
                    'parent_id' => $parent_id,
                    'backup' => $backup
                ],
                'operation' => 'Create Reversion Backup',
                'user_id' => get_current_user_id()
            ]);

            // Store the backup
            $update_result = update_post_meta($parent_id, '_miruni_reversion_backup', $backup);

            // Set an expiration for this backup (optional, for cleanup)
            set_transient('miruni_reversion_' . $parent_id, time(), 24 * 60 * 60 * 7);

            return true;
        } catch (Exception $e) {
            $error_message = $e->getMessage();
            $error_file = $e->getFile();
            $error_line = $e->getLine();
            $error_trace = $e->getTraceAsString();

            do_action('miruni_error', $e, [
                'context' => [
                    'draft_id' => $draft_id,
                    'parent_id' => $parent_id,
                    'error_message' => $error_message,
                    'error_file' => $error_file,
                    'error_line' => $error_line
                ],
                'operation' => 'Failed to create reversion backup',
                'user_id' => get_current_user_id()
            ]);

            return false;
        }
    }

    /**
     * Summary of publish_draft
     * @param int $draft_id
     * @throws \Exception
     * @return array{
     *  post_id: int,
     *  updated_titles: array<int, string>,
     *  updated_content: array<int>,
     *  message: string
     * }
     */
    public static function publish_draft(int $draft_id): array
    {
        $draft = get_post($draft_id);

        if (!$draft instanceof WP_Post) {
            throw new Exception('Draft not found');
        }

        if ($draft->post_status !== 'draft') {
            throw new Exception('Post is not a draft');
        }

        // Get the parent post ID
        $parent_id = $draft->post_parent;
        if (!$parent_id) {
            $parent_id = Miruni_Post_ID_Placeholder::LATEST_POSTS;
        }

        // Create reversion backup BEFORE applying changes
        $backup_created = Miruni_Draft_Publisher::create_reversion_backup($draft_id, $parent_id);
        if (!$backup_created) {
            do_action('miruni_error', new Exception("Failed to create reversion backup"), [
                'context' => [
                    'draft_id' => $draft_id,
                    'parent_id' => $parent_id
                ],
                'operation' => 'Create Reversion Backup',
                'user_id' => get_current_user_id()
            ]);
            throw new Exception('Failed to create reversion backup.');
        }

        // If the parent ID is Miruni_Post_ID_Placeholder::LATEST_POSTS, there is no actual post to update
        if ($parent_id !== Miruni_Post_ID_Placeholder::LATEST_POSTS) {
            $update_result = wp_update_post([
                'ID' => $parent_id,
                'post_content' => $draft->post_content,
                'post_title' => $draft->post_title,
                'post_excerpt' => $draft->post_excerpt
            ], true);

            if (is_wp_error($update_result)) {
                do_action('my_plugin_error', $update_result, [
                    'draft_id' => $draft_id,
                    'parent_id' => $parent_id,
                    'update_result' => $update_result,
                    'user_id' => get_current_user_id()
                ]);
                throw new Exception(esc_html($update_result->get_error_message()));
            }
        }

        // Copy Elementor data from draft to parent if it exists
        $elementor_data = get_post_meta($draft_id, '_elementor_data', true);

        if (!empty($elementor_data)) {
            update_post_meta($parent_id, '_elementor_data', $elementor_data);
        }

        Miruni_Elementor_Service::delete_element_cache($parent_id);

        // Publish any referenced post title and content changes
        $title_changes = [];
        $content_changes = [];
        $other_post_titles = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::OTHER_POST_TITLES, true) ?: [];
        $other_post_content = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::OTHER_POST_CONTENT, true) ?: [];
        $other_post_excerpts = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::OTHER_POST_EXCERPTS, true) ?: [];

        // Ensure we're working with arrays
        $other_post_titles = is_array($other_post_titles) ? $other_post_titles : [];
        $other_post_content = is_array($other_post_content) ? $other_post_content : [];
        $other_post_excerpts = is_array($other_post_excerpts) ? $other_post_excerpts : [];

        // Get unique post IDs from both arrays
        $other_post_ids = array_unique(
            array_merge(
                array_keys($other_post_titles),
                array_keys($other_post_content)
            )
        );

        if (!empty($other_post_ids)) {
            foreach ($other_post_ids as $post_id) {
                $update_args = ['ID' => (int) $post_id];

                // Check if title exists in the array
                if (isset($other_post_titles[$post_id]) && !empty($other_post_titles[$post_id])) {
                    $update_args['post_title'] = $other_post_titles[$post_id];
                }

                // Check if content exists in the array
                if (isset($other_post_content[$post_id]) && !empty($other_post_content[$post_id])) {
                    $update_args['post_content'] = $other_post_content[$post_id];
                    $content_changes[$post_id] = true;
                }

                if (count($update_args) > 1) { // Only update if we have more than just the ID
                    $result = wp_update_post($update_args);
                    if ($result && isset($update_args['post_title'])) {
                        $title_changes[$post_id] = $update_args['post_title'];
                    }
                }

                // Update post excerpt if it exists
                if (isset($other_post_excerpts[$post_id]) && !empty($other_post_excerpts[$post_id])) {
                    wp_update_post([
                        'ID' => (int) $post_id,
                        'post_excerpt' => $other_post_excerpts[$post_id]
                    ]);
                }
            }
        }

        // Apply transient title changes
        $title_changes = Miruni_Post_Meta_Utils::apply_transient_title_changes($draft_id, $title_changes);

        // Apply theme mod changes
        Miruni_Post_Meta_Utils::apply_theme_mod_changes($draft_id);

        // Apply WordPress option changes
        Miruni_Post_Meta_Utils::apply_wp_option_changes($draft_id);

        // Apply menu item name changes
        Miruni_Post_Meta_Utils::apply_menu_item_changes($draft_id);

        // Explicitly apply other menu item meta changes
        $menu_meta_to_apply = [
            Miruni_Preview_Meta_Keys::MENU_ITEM_PARENTS => '_menu_item_menu_item_parent',
            Miruni_Preview_Meta_Keys::MENU_ITEM_URLS => '_menu_item_url',
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECT_IDS => '_menu_item_object_id',
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECTS => '_menu_item_object',
        ];

        foreach ($menu_meta_to_apply as $draft_key => $target_meta_key) {
            $changes = get_post_meta($draft_id, $draft_key, true);
            if (is_array($changes)) {
                foreach ($changes as $menu_item_id => $new_value) {
                    update_post_meta($menu_item_id, $target_meta_key, $new_value);
                }
            }
        }

        // Apply block template changes
        $updated_blocks = Miruni_Post_Meta_Utils::apply_block_template_changes($draft_id);

        Miruni_Draft_Publisher::cleanup_draft_data($draft_id);

        // Clear all relevant caches
        wp_cache_flush();
        do_action('wp_cache_flush_group', 'options');
        if (function_exists('rocket_clean_domain')) {
            rocket_clean_domain();
        }

        if (function_exists('w3tc_flush_all')) {
            w3tc_flush_all();
        }

        return [
            'post_id' => $parent_id,
            'updated_titles' => $title_changes,
            'updated_content' => array_keys($content_changes),
            'updated_excerpts' => array_keys($other_post_excerpts),
            'updated_blocks' => array_keys($updated_blocks),
            'message' => 'Changes published successfully'
        ];
    }

    /**
     * Revert published changes back to original state
     * 
     * @param int $post_id ID of the post to revert
     * @return array{
     * success: bool,
     * message: string,
     * reverted_items: string[]
     * }
     */
    public static function revert_published_changes(int $post_id): array
    {
        try {
            // Clear all relevant caches
            wp_cache_delete($post_id, 'post_meta');
            wp_cache_delete('theme_mods_' . get_stylesheet(), 'options');

            // Get the backup data
            $backup = get_post_meta(absint($post_id), '_miruni_reversion_backup', true);

            if (!is_array($backup) || empty($backup)) {
                return [
                    'success' => false,
                    'message' => 'No backup found for this post',
                    'reverted_items' => []
                ];
            }

            $reverted_items = [];

            // Restore the main post content and title
            if (isset($backup['parent_post'])) {
                $update_result = wp_update_post([
                    'ID' => $post_id,
                    'post_content' => $backup['parent_post']['post_content'],
                    'post_title' => $backup['parent_post']['post_title']
                ], true);

                if (!is_wp_error($update_result)) {
                    $reverted_items[] = 'main_post';
                }

                // Restore Elementor data if it was backed up
                if (isset($backup['parent_post']['_elementor_data'])) {
                    update_post_meta($post_id, '_elementor_data', $backup['parent_post']['_elementor_data']);
                    $reverted_items[] = 'elementor_data';
                }
            }

            // Restore other post titles
            if (isset($backup['other_titles']) && is_array($backup['other_titles'])) {
                foreach ($backup['other_titles'] as $other_post_id => $original_title) {
                    $result = wp_update_post([
                        'ID' => $other_post_id,
                        'post_title' => $original_title
                    ]);

                    if ($result) {
                        $reverted_items[] = 'post_title_' . $other_post_id;
                    }
                }
            }

            // Restore other post content
            if (isset($backup['other_content']) && is_array($backup['other_content'])) {
                foreach ($backup['other_content'] as $other_post_id => $original_content) {
                    $result = wp_update_post([
                        'ID' => $other_post_id,
                        'post_content' => $original_content
                    ]);

                    if ($result) {
                        $reverted_items[] = 'post_content_' . $other_post_id;
                    }
                }
            }

            // Restore other post excerpts
            if (isset($backup['other_excerpts']) && is_array($backup['other_excerpts'])) {
                foreach ($backup['other_excerpts'] as $other_post_id => $original_excerpt) {
                    $result = wp_update_post([
                        'ID' => $other_post_id,
                        'post_excerpt' => $original_excerpt
                    ]);

                    if ($result) {
                        $reverted_items[] = 'post_excerpt_' . $other_post_id;
                    }
                }
            }

            // Restore theme mods
            if (isset($backup['theme_mods']) && is_array($backup['theme_mods'])) {
                foreach ($backup['theme_mods'] as $mod_name => $original_value) {
                    set_theme_mod($mod_name, $original_value);
                    wp_cache_delete('theme_mods_' . get_stylesheet(), 'options');
                    $reverted_items[] = 'theme_mod_' . $mod_name;
                }
            }

            // Restore WordPress options
            if (isset($backup['wp_options']) && is_array($backup['wp_options'])) {
                foreach ($backup['wp_options'] as $option_name => $original_value) {
                    update_option($option_name, $original_value);
                    wp_cache_delete($option_name, 'options');
                    $reverted_items[] = 'wp_option_' . $option_name;
                }
            }

            // Restore menu item names
            if (isset($backup['menu_item_names']) && is_array($backup['menu_item_names'])) {
                foreach ($backup['menu_item_names'] as $menu_item_id => $original_name) {
                    $result = wp_update_post(['ID' => $menu_item_id, 'post_title' => $original_name]);
                    if ($result) {
                        $reverted_items[] = 'menu_item_name_' . $menu_item_id;
                    }
                }
            }

            // Restore other menu item meta fields
            $menu_meta_to_revert = [
                'menu_item_parents' => '_menu_item_menu_item_parent',
                'menu_item_urls' => '_menu_item_url',
                'menu_item_object_ids' => '_menu_item_object_id',
                'menu_item_objects' => '_menu_item_object',
            ];

            foreach ($menu_meta_to_revert as $backup_key => $target_meta_key) {
                if (isset($backup[$backup_key]) && is_array($backup[$backup_key])) {
                    foreach ($backup[$backup_key] as $menu_item_id => $original_value) {
                        update_post_meta($menu_item_id, $target_meta_key, $original_value);
                        $reverted_items[] = $backup_key . '_' . $menu_item_id;
                    }
                }
            }

            // Restore block templates
            if (isset($backup['block_template']) && is_array($backup['block_template'])) {
                foreach ($backup['block_template'] as $template_slug => $original_content) {
                    $current_theme = get_stylesheet();
                    $template_type = 'wp_template';

                    if (strpos($template_slug, 'template-parts/') === 0) {
                        $template_type = 'wp_template_part';
                        $template_slug = str_replace('template-parts/', '', $template_slug);
                    }

                    $query_args = [
                        'post_type' => $template_type,
                        'post_status' => 'publish',
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
                        wp_update_post([
                            'ID' => $template_post instanceof WP_Post ? $template_post->ID : $template_post,
                            'post_content' => $original_content,
                        ]);
                        $reverted_items[] = 'block_template_' . $template_slug;
                    }
                }
            }

            // Restore Elementor data
            if (isset($backup['parent_post']['_elementor_data'])) {
                do_action('miruni_error', new Exception("Restoring Elementor data"), [
                    'context' => [
                        'post_id' => $post_id,
                        'elementor_data' => $backup['parent_post']['_elementor_data']
                    ],
                    'operation' => 'Restore Elementor Data',
                    'user_id' => get_current_user_id()
                ]);

                update_post_meta($post_id, '_elementor_data', $backup['parent_post']['_elementor_data']);
                $reverted_items[] = 'elementor_data';
                Miruni_Elementor_Service::delete_element_cache($post_id);
            }

            // Remove the backup after reversion
            delete_post_meta($post_id, '_miruni_reversion_backup');
            delete_transient('miruni_reversion_' . $post_id);

            return [
                'success' => true,
                'message' => 'Changes reverted successfully',
                'reverted_items' => $reverted_items
            ];

        } catch (Exception $e) {
            do_action('miruni_error', $e, [
                'context' => [
                    'post_id' => $post_id
                ],
                'operation' => 'Failed to revert published changes',
                'user_id' => get_current_user_id()
            ]);
            return [
                'success' => false,
                'message' => 'Error reverting changes: ' . $e->getMessage(),
                'reverted_items' => []
            ];
        }
    }
}