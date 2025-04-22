<?php

namespace Miruni\ThemePreview;

use WP_Query;
use WP_Post;
use Miruni\Miruni_Preview_Meta_Keys;

if (!defined('ABSPATH'))
    exit;

class Miruni_Theme_Preview_Manager
{
    private string $preview_theme_path;
    private string $preview_theme_url;

    public function __construct()
    {
        $upload_dir = wp_upload_dir();

        $this->preview_theme_path = $upload_dir['basedir'] . '/theme-preview/' . get_stylesheet();
        $this->preview_theme_url = $upload_dir['baseurl'] . '/theme-preview/' . get_stylesheet();

    }

    public function init(): void
    {
        add_action('init', array($this, 'init_preview_system'));
    }

    public function init_preview_system(): void
    {
        // Create preview directory if it doesn't exist
        if (!file_exists($this->preview_theme_path)) {
            wp_mkdir_p($this->preview_theme_path);
        }
        add_action('template_redirect', array($this, 'maybe_use_preview_theme'));

        // Use the theme builder to create the preview theme
    }

    public function get_preview_url(string $url): string
    {
        // Generate a unique preview token
        $preview_token = wp_create_nonce('theme_preview');

        // Store the token
        update_option('theme_preview_token_' . get_current_user_id(), $preview_token, false);

        // Return the preview URL with the token
        return add_query_arg(
            array(
                'preview_theme' => '1',
                'preview_token' => $preview_token
            ),
            $url
        );
    }



    protected function validate_is_preview(): bool
    {
        if (!check_ajax_referer('theme_preview', 'preview_token', false)) {
            return false;
        }
        // Check if we're in preview mode
        if (isset($_GET['preview_theme'])) {
            return true;
        }
        return false;
    }

    protected function get_preview_draft_id(): ?int
    {
        if (!check_ajax_referer('theme_preview', 'preview_token', false)) {
            wp_send_json_error('Invalid security token');
        }        // Check if we're in preview mode
        if (isset($_GET['preview_draft_id'])) {
            return (int) $_GET['preview_draft_id'];
        }

        return null;
    }

    protected function get_page_id(): ?int
    {
        if (!check_ajax_referer('theme_preview', 'preview_token', false)) {
            wp_send_json_error('Invalid security token');
        }        // Check if we're in preview mode
        if (isset($_GET['page_id'])) {
            return (int) $_GET['page_id'];
        }

        return null;
    }

    protected function get_p_param(): ?int
    {
        if (!check_ajax_referer('theme_preview', 'preview_token', false)) {
            wp_send_json_error('Invalid security token');
        }        // Check if we're in preview mode
        if (isset($_GET['p'])) {
            return (int) $_GET['p'];
        }

        return null;
    }

    /**
     * Check if we're in preview mode and get the preview ID
     * 
     * @param bool $require_preview Whether to require the 'preview' parameter
     * @return int|null The preview post ID or null if not in preview mode
     */
    protected function get_preview_id(bool $require_preview = false): ?int
    {
        // Only run in preview context

        if (!check_ajax_referer('theme_preview', 'preview_token', false)) {
            wp_send_json_error('Invalid security token');
        }
        if ($require_preview && !isset($_GET['preview'])) {
            return null;
        }

        // First check for a special Latest Posts draft ID
        $preview_id = $this->get_preview_draft_id();
        if ($preview_id) {
            // Verify this is indeed a latest posts preview draft
            if ($preview_id > 0 && get_post_meta($preview_id, '_miruni_latest_posts_preview', true)) {
                return $preview_id;
            }
        }

        // Get the preview post ID from standard parameters
        $preview_id = 0;
        $page_id = $this->get_page_id();
        $p_param = $this->get_p_param();
        if ($page_id) {
            $preview_id = $page_id;
        } else if ($p_param) {
            $preview_id = $p_param;
        }

        return $preview_id ?: null;
    }

    /**
     * Get stored preview value from post meta or transient
     * 
     * @param int $preview_id The preview post ID
     * @param int $target_id The target post or item ID
     * @param string $meta_key The meta key to check
     * @param string|null $transient_key_base The transient key base (optional)
     * @return mixed|null The stored value or null if not found
     */
    private function get_stored_preview_value(int $preview_id, int $target_id, string $meta_key, ?string $transient_key_base = null)
    {
        // Check post meta first (our preferred storage)
        $meta_changes = get_post_meta($preview_id, $meta_key, true);
        if (is_array($meta_changes) && isset($meta_changes[$target_id])) {
            return $meta_changes[$target_id];
        }

        // Then check transients as fallback if provided
        if ($transient_key_base) {
            $transient_key = $transient_key_base . '_' . $preview_id;
            $changes = get_transient($transient_key);
            if (is_array($changes) && isset($changes[$target_id])) {
                return $changes[$target_id];
            }
        }

        return null;
    }

    /**
     * Filter function for post titles in preview mode
     * 
     * @param string $title The post title
     * @param int|null $post_id The post ID
     * @return string The filtered title
     */
    public function filter_preview_titles($title, $post_id = null)
    {
        // Skip if no post ID
        if (empty($post_id)) {
            return $title;
        }

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $title;
        }

        $new_title = $this->get_stored_preview_value(
            $preview_id,
            $post_id,
            Miruni_Preview_Meta_Keys::OTHER_POST_TITLES,
            'miruni_preview_titles'
        );

        if ($new_title !== null) {
            return $new_title;
        }

        return $title;
    }

    /**
     * Filter function for post content in preview mode
     * 
     * @param string $content The post content
     * @return string The filtered content
     */
    public function filter_preview_content($content): string
    {

        global $post;


        $post_id = $post?->ID;

        // Skip if no post ID
        if (empty($post_id)) {
            return $content;
        }

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $content;
        }

        $new_content = $this->get_stored_preview_value(
            $preview_id,
            $post_id,
            Miruni_Preview_Meta_Keys::OTHER_POST_CONTENT,
            'miruni_preview_content'
        );

        if ($new_content !== null) {
            return $new_content;
        }

        return $content;
    }

    public function filter_preview_excerpt(string $excerpt): string
    {
        global $post;
        $post_id = $post?->ID;

        // Skip if no post ID
        if (empty($post_id)) {
            return $excerpt;
        }

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $excerpt;
        }

        $new_excerpt = $this->get_stored_preview_value(
            $preview_id,
            $post_id,
            Miruni_Preview_Meta_Keys::OTHER_POST_EXCERPTS,
            'miruni_preview_excerpts'
        );

        if ($new_excerpt !== null) {
            return $new_excerpt;
        }

        return $excerpt;
    }

    /**
     * Filter menu item titles and parent in preview mode
     * Properties:
     * - ID:               The term_id if the menu item represents a taxonomy term.
     * - attr_title:       The title attribute of the link element for this menu item.
     * - classes:          The array of class attribute values for the link element of this menu item.
     * - db_id:            The DB ID of this item as a nav_menu_item object, if it exists (0 if it doesn't exist).
     * - description:      The description of this menu item.
     * - menu_item_parent: The DB ID of the nav_menu_item that is this item's menu parent, if any. 0 otherwise.
     * - object:           The type of object originally represented, such as 'category', 'post', or 'attachment'.
     * - object_id:        The DB ID of the original object this menu item represents, e.g. ID for posts and term_id for categories.
     * - post_parent:      The DB ID of the original object's parent object, if any (0 otherwise).
     * - post_title:       A "no title" label if menu item represents a post that lacks a title.
     * - target:           The target attribute of the link element for this menu item.
     * - title:            The title of this menu item.
     * - type:             The family of objects originally represented, such as 'post_type' or 'taxonomy'.
     * - type_label:       The singular label used to describe this type of menu item.
     * - url:              The URL to which this menu item points.
     * - xfn:              The XFN relationship expressed in the link of this menu item.
     * - _invalid:         Whether the menu item represents an object that no longer exists
     * @param object $menu_item The menu item object
     * @return object Modified menu item if in preview mode
     */
    public function filter_preview_menu_item_title($menu_item): object
    {
        // make sure ID and title exist
        // Check essential properties exist (ID is db_id for menu items)
        if (!isset($menu_item->ID) || !property_exists($menu_item, 'title')) {
            return $menu_item;
        }

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $menu_item;
        }

        $menu_item_id = $menu_item->ID; // Use ID which corresponds to the post ID of the nav_menu_item

        // Title preview (from post_title)
        $new_title = $this->get_stored_preview_value(
            $preview_id,
            $menu_item_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_NAMES
        );
        if ($new_title !== null) {
            $menu_item->title = $new_title; // This is the navigation label
            // Also update post_title if it exists, for consistency, though 'title' is primary for display
            if (property_exists($menu_item, 'post_title')) {
                $menu_item->post_title = $new_title;
            }
        }

        // Parent preview (from post_parent)
        $new_parent = $this->get_stored_preview_value(
            $preview_id,
            $menu_item_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_PARENTS
        );
        if ($new_parent !== null) {
            // The object property is 'menu_item_parent', which corresponds to the _menu_item_menu_item_parent meta field
            // @phpstan-ignore property.notFound
            $menu_item->menu_item_parent = $new_parent;

        }

        // URL preview (from _menu_item_url meta)
        $new_url = $this->get_stored_preview_value(
            $preview_id,
            $menu_item_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_URLS // Assuming this key exists
        );
        if ($new_url !== null && property_exists($menu_item, 'url')) {
            $menu_item->url = $new_url;
        }

        // Object ID preview (from _menu_item_object_id meta)
        $new_object_id = $this->get_stored_preview_value(
            $preview_id,
            $menu_item_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECT_IDS // Assuming this key exists
        );
        if ($new_object_id !== null && property_exists($menu_item, 'object_id')) {
            $menu_item->object_id = $new_object_id;
        }

        // Object preview (from _menu_item_object meta)
        $new_object = $this->get_stored_preview_value(
            $preview_id,
            $menu_item_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECTS // Assuming this key exists
        );
        if ($new_object !== null && property_exists($menu_item, 'object')) {
            $menu_item->object = $new_object;
        }

        // Note: We don't need to filter _menu_item_type, _menu_item_target, _menu_item_classes, _menu_item_xfn
        // here unless the preview explicitly modifies them and stores them under separate meta keys.
        // The properties like 'target', 'classes', 'xfn' are usually derived directly from meta by wp_setup_nav_menu_item.
        // If the preview *only* changes URL, Object ID, Object, Name, Parent, this should be sufficient.

        return $menu_item;
    }

    public function filter_preview_theme_mods(string $name, mixed $value): mixed
    {
        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $value;
        }

        // Check post meta first (our preferred storage)
        $meta_mods = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::THEME_MODS, true);
        if (is_array($meta_mods) && isset($meta_mods[$name])) {
            return $meta_mods[$name];
        }
        return $value;
    }

    /**
     * Filter function for WordPress options in preview mode
     * 
     * @param mixed $value The option value
     * @param string $option The option name
     * @return mixed The filtered option value
     */
    public function filter_preview_wp_options(mixed $value, string $option): mixed
    {
        $preview_id = $this->get_preview_id(false);
        if (!$preview_id) {
            global $post;
            $preview_id = $post?->ID;

            // If still no preview ID but we're on the homepage, check for a latest posts preview
            if (!$preview_id && (is_home() || is_front_page())) {
                // Check if we have any latest posts preview drafts
                $latest_posts_drafts = get_posts([
                    'post_type' => 'page',
                    'post_status' => 'draft',
                    'meta_key' => '_miruni_latest_posts_preview',
                    'meta_value' => '1',
                    'posts_per_page' => 1,
                    'orderby' => 'ID',
                    'order' => 'DESC'
                ]);

                if (!empty($latest_posts_drafts)) {
                    $preview_id = $latest_posts_drafts[0]->ID;
                }
            }

            if (!$preview_id) {
                return $value;
            }
        }

        // Check post meta for stored option changes
        $stored_options = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::WP_OPTIONS, true);
        if (is_array($stored_options) && isset($stored_options[$option])) {
            return $stored_options[$option];
        }

        return $value;
    }


    public function get_original_theme_name(): string
    {
        return get_stylesheet();
    }

    public function maybe_use_preview_theme(): void
    {
        if (!$this->validate_is_preview()) {
            return;
        }
        if (!check_ajax_referer('theme_preview', 'preview_token', false)) {
            return;
        }
        if (current_user_can('edit_theme_options')) {
            // Check if we're viewing a Latest Posts preview
            $is_latest_posts_preview = false;
            if (isset($_GET['preview_draft_id']) && (is_home() || is_front_page())) {
                $draft_id = (int) $_GET['preview_draft_id'];
                $is_latest_posts_preview = (bool) get_post_meta($draft_id, '_miruni_latest_posts_preview', true);
            }

            // Handle direct post data access
            add_filter('get_post_field', array($this, 'filter_post_field_in_preview'), 10, 3);

            // Modify post objects in queries
            add_filter('the_posts', array($this, 'filter_posts_in_preview'), 10, 2);
            add_filter('the_title', array($this, 'filter_preview_titles'), 10, 2);
            add_filter('the_content', array($this, 'filter_preview_content'), 10, 2);
            add_filter('get_the_excerpt', array($this, 'filter_preview_excerpt'), 10, 1);

            add_filter('wp_setup_nav_menu_item', [$this, 'filter_preview_menu_item_title'], 10, 1);

            // Fix: Add proper parameters for these filters
            add_filter('get_block_templates', [$this, 'filter_preview_block_templates'], 10, 3);
            add_filter('get_block_template', [$this, 'filter_preview_block_template'], 10, 3);

            // Handle theme mods
            $theme_mods = get_theme_mods();
            foreach ($theme_mods as $name => $value) {
                add_filter('theme_mod_' . $name, function ($value) use ($name) {
                    return $this->filter_preview_theme_mods($name, $value);
                }, 10, 1);
            }

            // Handle WordPress options
            add_filter('pre_option', array($this, 'filter_preview_wp_options'), 10, 2);

            // Add special handling for Latest Posts homepage preview
            if ($is_latest_posts_preview) {
                add_filter('option_blogname', function ($value) {
                    $preview_id = $this->get_preview_draft_id() ?? 0;
                    if ($preview_id) {
                        $stored_options = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::WP_OPTIONS, true);
                        if (is_array($stored_options) && isset($stored_options['blogname'])) {
                            return $stored_options['blogname'];
                        }
                    }
                    return $value;
                }, 20);

                add_filter('option_blogdescription', function ($value) {
                    $preview_id = $this->get_preview_draft_id() ?? 0;
                    if ($preview_id) {
                        $stored_options = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::WP_OPTIONS, true);
                        if (is_array($stored_options) && isset($stored_options['blogdescription'])) {
                            return $stored_options['blogdescription'];
                        }
                    }
                    return $value;
                }, 20);
            }
        }

    }

    public function get_preview_comments_template(string $template): string
    {
        global $post;
        if ($post && $post->post_parent) {
            $parent_post = get_post($post->post_parent);
            $temp = $post;
            $post = $parent_post;

            $preview_template = locate_template(['comments.php']);

            $post = $temp;
            return $preview_template;
        }
        return $template;
    }

    public function get_preview_theme_path(): string
    {
        return $this->preview_theme_path;
    }

    public function get_preview_theme_url(): string
    {
        return $this->preview_theme_url;
    }

    /**
     * Filters the array of queried block templates after they've been fetched.
     *
     * @since 5.9.0
     *
     * @param \WP_Block_Template[] $block_templates Array of found block templates.
     * @param array{
     *     slug__in?: string[],
     *     wp_id?: int,
     *     area?: string,
     *     post_type?: string
     * } $query {
     *     Arguments to retrieve templates. All arguments are optional.
     *
     *     @type string[] $slug__in  List of slugs to include.
     *     @type int      $wp_id     Post ID of customized template.
     *     @type string   $area      A 'wp_template_part_area' taxonomy value to filter by (for 'wp_template_part' template type only).
     *     @type string   $post_type Post type to get the templates for.
     * }
     * @param string $template_type wp_template or wp_template_part.
     * @return \WP_Block_Template[] Filtered array of block templates.
     */
    public function filter_preview_block_templates($block_templates, $query, $template_type): array
    {

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {

            return $block_templates;
        }

        // Get all template changes from the draft
        $template_changes = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::BLOCK_TEMPLATE, true);

        if (!is_array($template_changes) || empty($template_changes)) {
            return $block_templates;
        }

        // Apply changes to matching templates
        foreach ($block_templates as &$template) {


            if (isset($template_changes[$template->slug])) {

                $template->content = $template_changes[$template->slug];
            }
        }

        return $block_templates;
    }

    /**
     * Filters the block template object before the theme file discovery takes place.
     *
     * @since 5.9.0
     *
     * @param \WP_Block_Template|null $block_template Return block template object to short-circuit the default query,
     *                                               or null to allow WP to run its normal queries.
     * @param string                 $id             Template unique identifier (example: 'theme_slug//template_slug').
     * @param string                 $template_type  Template type. Either 'wp_template' or 'wp_template_part'.
     */
    public function filter_preview_block_template($block_template, $id = null, $template_type = 'wp_template'): ?\WP_Block_Template
    {
        $preview_id = $this->get_preview_id();

        if (!$preview_id || !$block_template) {
            return $block_template;
        }

        // Get the modified template content from the preview draft
        $template_changes = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::BLOCK_TEMPLATE, true);

        // If we have changes for this template ID
        if (is_array($template_changes) && isset($template_changes[$block_template->slug])) {

            // Replace the template content with our modified version
            $block_template->content = $template_changes[$block_template->slug];
        }

        return $block_template;
    }

    /**
     * Filter posts in query results to modify titles
     * 
     * @param WP_Post[]|array<int,WP_Post> $posts The posts array
     * @param WP_Query $query The query object
     * @return WP_Post[]|array<int,WP_Post> The filtered posts
     */
    public function filter_posts_in_preview(array $posts, WP_Query $query): array
    {
        if (empty($posts)) {
            return $posts;
        }

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $posts;
        }

        // Get stored title changes from post meta
        $title_changes = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::OTHER_POST_TITLES, true);

        if (!is_array($title_changes) || empty($title_changes)) {
            return $posts;
        }

        // Modify post objects directly
        foreach ($posts as &$post) {
            if (isset($title_changes[$post->ID])) {
                $post->post_title = $title_changes[$post->ID];
            }
        }

        return $posts;
    }

    /**
     * Filter direct post field access
     * 
     * @param mixed $value The field value
     * @param WP_Post $post The post object
     * @param string $field The field name
     * @return mixed The filtered value
     */
    public function filter_post_field_in_preview($value, $post, $field)
    {
        // Only filter post_title field in preview
        if ($field !== 'post_title') {
            return $value;
        }

        $preview_id = $this->get_preview_id();
        if (!$preview_id) {
            return $value;
        }

        // Get stored title changes
        $title_changes = get_post_meta($preview_id, Miruni_Preview_Meta_Keys::OTHER_POST_TITLES, true);

        // Check if we have a title change for this post
        if (is_array($title_changes) && isset($title_changes[$post->ID])) {
            return $title_changes[$post->ID];
        }

        return $value;
    }

    /**
     * Apply stored title changes to actual posts
     * 
     * @param int $draft_id The ID of the draft/preview post
     * @return array<int,string> Array of updated post IDs and their new titles
     */
    public function publish_title_changes(int $draft_id): array
    {
        $applied_changes = [];
        $title_changes = get_post_meta($draft_id, Miruni_Preview_Meta_Keys::OTHER_POST_TITLES, true);

        if (is_array($title_changes) && !empty($title_changes)) {
            foreach ($title_changes as $post_id => $new_title) {
                $result = wp_update_post([
                    'ID' => $post_id,
                    'post_title' => $new_title
                ]);

                if ($result) {
                    $applied_changes[$post_id] = $new_title;
                }
            }

            // Clean up the meta data
            delete_post_meta($draft_id, Miruni_Preview_Meta_Keys::OTHER_POST_TITLES);
        }

        return $applied_changes;
    }
}

