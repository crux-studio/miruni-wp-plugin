<?php
namespace Miruni;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


require_once plugin_dir_path(__FILE__) . "miruni-service.php";
// require_once plugin_dir_path(file: __FILE__) . "theme-preview-manager.php";
require_once plugin_dir_path(file: __FILE__) . "draft-publisher.php";
require_once plugin_dir_path(file: __FILE__) . "post-meta-utils.php";
require_once plugin_dir_path(file: __FILE__) . "miruni-update-utils.php"; // Add this line


use Miruni\ThemePreview\Miruni_Theme_Preview_Manager;
use Miruni\Elementor\Miruni_Elementor_Service;
use Miruni\Miruni_Post_Meta_Utils;
use Miruni\Miruni_Preview_Meta_Keys;
use Miruni\Miruni_Draft_Publisher;
use Miruni\MiruniFileType;

use \Exception;
use WP_Post;


/**
 * @phpstan-type MiruniChangeResult array{
 *   file_name: string,
 *   changes_made: string,
 *   original_content: string,
 *   file_identifier: string,
 *   file_type: string,
 *   referenced_post_id?: int,
 *   suggestion_id: int,
 *   post?: array{
 *    post_id: int,
 *    post_title: string,
 *    post_content: string
 *   }
 * }
 */

class Miruni_Draft_Manager
{
    private Miruni_Theme_Preview_Manager $theme_preview_manager;


    public function __construct(Miruni_Theme_Preview_Manager $preview_manager)
    {
        $this->theme_preview_manager = $preview_manager;
    }

    /**
     * Creates a special draft for the "Latest Posts" homepage
     * 
     * @return int|null New draft ID if successful, null if failed
     */
    private function create_latest_posts_preview(): ?int
    {
        try {
            // Create a special placeholder post to store our changes
            $draft_args = [
                'post_type' => 'page',
                'post_content' => '',
                'post_title' => 'Latest Posts Preview - ' . gmdate('Y-m-d H:i:s'),
                'post_status' => 'draft',
                'post_author' => get_current_user_id(),
            ];

            $draft_id = wp_insert_post($draft_args);
            // @phpstan-ignore function.impossibleType
            if (!$draft_id || is_wp_error($draft_id)) {
                // @phpstan-ignore function.impossibleType
                $error_msg = is_wp_error($draft_id) ? $draft_id->get_error_message() : 'Failed to create draft post';
                do_action('my_plugin_error', new Exception(esc_html($error_msg)), [
                    'context' => 'Draft Manager',
                    'operation' => 'Creating latest posts preview',
                    'user_id' => get_current_user_id()
                ]);
                return null;
            }

            // Store a meta flag to identify this as a latest posts preview
            update_post_meta($draft_id, '_miruni_latest_posts_preview', true);

            // Store current theme mods and WP options that might be relevant
            $theme_mods = get_theme_mods();
            // @phpstan-ignore function.alreadyNarrowedType
            if (is_array($theme_mods)) {
                update_post_meta($draft_id, Miruni_Preview_Meta_Keys::THEME_MODS, $theme_mods);
            }

            // Store relevant options
            $relevant_options = [];
            foreach ($this->get_default_wp_options() as $option_name) {
                $relevant_options[$option_name] = get_option($option_name);
            }
            update_post_meta($draft_id, Miruni_Preview_Meta_Keys::WP_OPTIONS, $relevant_options);

            return $draft_id;
        } catch (Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Draft Manager',
                'operation' => 'Creating latest posts preview',
                'user_id' => get_current_user_id()
            ]);
            return null;
        }
    }

    /**
     * Get default WordPress options to track for previews
     * 
     * @return array<string> Default option names
     */
    private function get_default_wp_options(): array
    {
        return [
            'blogname',
            'blogdescription',
            'posts_per_page',
            'date_format',
            'time_format',
            'page_for_posts',
            'show_on_front',
        ];
    }

    /**
     * @param int $page_id
     * @return int|null New draft ID if successful, null if failed
     */
    private function create_preview_post(int $page_id): ?int
    {
        // Check if this is our special placeholder for latest posts
        if ($page_id === Miruni_Post_ID_Placeholder::LATEST_POSTS) {
            return $this->create_latest_posts_preview();
        }

        global $wpdb;
        $original_post = get_post($page_id);
        if (!$original_post instanceof WP_Post) {
            do_action('my_plugin_error', new Exception(esc_html("Original post not found: {$page_id}")), [
                'context' => 'Draft Manager',
                'operation' => 'Creating preview post',
                'user_id' => get_current_user_id()
            ]);
            return null;
        }

        try {
            $draft_args = [
                'post_type' => $original_post->post_type,
                'post_content' => $original_post->post_content,
                'post_title' => $original_post->post_title,
                'post_status' => 'draft',
                'post_author' => get_current_user_id(),
                'post_parent' => $page_id,
                'comment_status' => $original_post->comment_status,
                'comment_count' => $original_post->comment_count,
                'post_date' => $original_post->post_date,
            ];

            $draft_id = wp_insert_post($draft_args);
            // @phpstan-ignore function.impossibleType
            if (!$draft_id || is_wp_error($draft_id)) {
                // @phpstan-ignore function.impossibleType
                $error_msg = is_wp_error($draft_id) ? $draft_id->get_error_message() : 'Failed to create draft post';
                do_action('my_plugin_error', new Exception(esc_html($error_msg)), [
                    'context' => 'Draft Manager',
                    'operation' => 'Creating preview post',
                    'user_id' => get_current_user_id()
                ]);
                return null;
            }

            // Copy all post meta
            $exclude_meta_keys = ["_elementor_element_cache", "_elementor_css", "_elementor_page_assets"];
            $meta_keys = get_post_custom_keys($page_id);
            if ($meta_keys) {
                foreach ($meta_keys as $meta_key) {
                    if (in_array($meta_key, $exclude_meta_keys)) {
                        continue;
                    }

                    $meta_values = get_post_meta($page_id, $meta_key);
                    foreach ($meta_values as $meta_value) {
                        // Special handling for Elementor data
                        if ($meta_key === '_elementor_data' && is_string($meta_value)) {
                            // Decode the JSON string into a PHP array/object
                            $decoded_data = json_decode($meta_value, true);
                            // Check if decoding was successful and resulted in an array
                            if (is_array($decoded_data)) {
                                // Pass the PHP array directly to add_post_meta.
                                // WordPress will handle serialization correctly.
                                add_post_meta($draft_id, $meta_key, $decoded_data);
                                // Skip the generic add_post_meta below for this key
                                continue; // IMPORTANT: Skip the next add_post_meta call
                            } else {
                                // If decoding fails, log an error as this might indicate corrupt data.
                                // We'll still try adding the original string below, but it might be corrupted.
                            }
                        }
                        add_post_meta($draft_id, $meta_key, $meta_value);
                    }
                }
            }

            if (!$wpdb) {
                do_action('my_plugin_error', new Exception(esc_html("Failed to get WPDB instance")), [
                    'context' => 'Draft Manager',
                    'operation' => "Copying post meta",
                    'user_id' => get_current_user_id()
                ]);
                return null;
            }


            // copy wp_term_relationships
            $term_relationships = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM $wpdb->term_relationships WHERE object_id = %d",
                    $page_id
                )
            );


            if ($term_relationships) {
                foreach ($term_relationships as $term_relationship) {
                    $wpdb->insert(
                        $wpdb->term_relationships,
                        [
                            'object_id' => $draft_id,
                            'term_taxonomy_id' => $term_relationship->term_taxonomy_id,
                            'term_order' => $term_relationship->term_order
                        ]
                    );
                }
            }

            return $draft_id;
        } catch (Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Draft Manager',
                'operation' => 'Creating preview post',
                'user_id' => get_current_user_id()
            ]);
            return null;
        }
    }

    /**
     * @param int $draft_id
     * @param string $content
     * @return bool
     */
    private function update_preview_content(int $draft_id, string $content): bool
    {
        try {
            // More aggressive cleaning of problematic characters

            // Handle all possible representations of non-breaking spaces
            $clean_content = preg_replace('/\x{00A0}/u', ' ', $content); // Unicode non-breaking space
            $clean_content = str_replace(
                ["\xC2\xA0", "\xA0", "&nbsp;", "\u00A0", "&#160;", "&#xA0;"],
                ' ',
                $clean_content ?? $content
            );

            // Convert HTML entities to their actual characters and then back to ensure consistent encoding
            $clean_content = html_entity_decode($clean_content, ENT_QUOTES | ENT_HTML5, 'UTF-8');

            // Normalize newlines
            $clean_content = str_replace(["\r\n", "\r"], "\n", $clean_content);

            // Remove excessive whitespace between tags
            $clean_content = preg_replace('/>\s+</', '><', $clean_content);

            // Completely disable WordPress auto-formatting for this content
            kses_remove_filters(); // Temporarily remove kses filters
            remove_filter('the_content', 'wpautop');
            remove_filter('the_content', 'wptexturize');

            // Force raw content handling
            $update_args = [
                'ID' => $draft_id,
                'post_content' => $clean_content ?? $content,
                'filter_content' => false
            ];

            // Update with kses disabled to prevent WP from modifying the HTML
            $result = wp_update_post($update_args);

            // Restore filters for other content
            kses_init_filters();
            add_filter('the_content', 'wpautop');
            add_filter('the_content', 'wptexturize');

            if (!$result) {
                do_action('my_plugin_error', new Exception(esc_html("Failed to update post content")), [
                    'context' => 'Draft Manager',
                    'operation' => 'Updating preview content',
                    'draft_id' => $draft_id,
                    'user_id' => get_current_user_id()
                ]);
            }

            return $result !== 0;
        } catch (Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Draft Manager',
                'operation' => 'Updating preview content',
                'draft_id' => $draft_id,
                'user_id' => get_current_user_id()
            ]);
            return false;
        }
    }

    private function update_preview_title(int $draft_id, string $title): bool
    {
        try {
            $update_args = [
                'ID' => $draft_id,
                'post_title' => $title,
            ];

            $result = wp_update_post($update_args);

            if (!$result) {
                do_action('my_plugin_error', new Exception(esc_html("Failed to update post title")), [
                    'context' => 'Draft Manager',
                    'operation' => 'Updating preview title',
                    'draft_id' => $draft_id,
                    'user_id' => get_current_user_id()
                ]);
            }

            return $result !== 0;
        } catch (Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Draft Manager',
                'operation' => 'Updating preview title',
                'draft_id' => $draft_id,
                'user_id' => get_current_user_id()
            ]);
            return false;
        }
    }

    /**
     * Store Elementor JSON changes
     * 
     * @param int $draft_id ID of the draft post
     * @param array<string,mixed> $content The content to store
     * @return bool Success status
     */
    private function store_elementor_json_change(int $draft_id, array $content): bool
    {
        error_log("store_elementor_json_change typeof content: " . gettype($content));
        try {

            Miruni_Elementor_Service::update_page_data($draft_id, $content);
            return true;
        } catch (Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Draft Manager',
                'operation' => 'Storing Elementor JSON changes',
                'draft_id' => $draft_id,
                'user_id' => get_current_user_id()
            ]);
            return false;
        }
    }

    public function store_menu_item_name_change(int $draft_id, int $menu_item_id, string $new_name): bool
    {
        $success = Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_NAMES,
            $menu_item_id,
            $new_name,
            "Storing menu item name change: {$menu_item_id} - {$new_name}"
        );

        if (!$success) {
            do_action('my_plugin_error', new Exception(esc_html("Failed to store menu item name change")), [
                'context' => 'Draft Manager',
                'operation' => 'Storing menu item name change',
                'draft_id' => $draft_id,
                'menu_item_id' => $menu_item_id,
                'user_id' => get_current_user_id()
            ]);
        }

        return $success;
    }

    public function store_menu_item_parent_change(int $draft_id, int $menu_item_id, int $new_parent_id): bool
    {
        $success = Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_PARENTS,
            $menu_item_id,
            $new_parent_id,
            "Storing menu item parent change: {$menu_item_id} - {$new_parent_id}"
        );

        if (!$success) {
            do_action('my_plugin_error', new Exception(esc_html("Failed to store menu item parent change")), [
                'context' => 'Draft Manager',
                'operation' => 'Storing menu item parent change',
                'draft_id' => $draft_id,
                'menu_item_id' => $menu_item_id,
                'user_id' => get_current_user_id()
            ]);
        }

        return $success;
    }

    public function store_menu_item_url_change(int $draft_id, int $menu_item_id, string $new_url): bool
    {
        return Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_URLS,
            $menu_item_id,
            $new_url,
            "Storing menu item URL change: {$menu_item_id} - {$new_url}"
        );
    }

    public function store_menu_item_object_id_change(int $draft_id, int $menu_item_id, string $new_object_id): bool
    {

        return Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECT_IDS,
            $menu_item_id,
            $new_object_id,
            "Storing menu item object ID change: {$menu_item_id} - {$new_object_id}"
        );
    }

    public function store_menu_item_object_change(int $draft_id, int $menu_item_id, string $new_object): bool
    {

        return Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::MENU_ITEM_OBJECTS,
            $menu_item_id,
            $new_object,
            "Storing menu item object change: {$menu_item_id} - {$new_object}"
        );
    }

    /**
     * Generic helper to store post changes
     * 
     * @param int $draft_id ID of the draft post
     * @param int $post_id ID of the post being changed
     * @param string $new_value The new value to store
     * @param Miruni_Preview_Meta_Keys::* $meta_key The meta key to store changes under
     * @param string $error_context Context for error message
     * @return bool Success status
     */
    public function store_other_post_change(
        int $draft_id,
        int $post_id,
        string $new_value,
        string $meta_key,
        string $error_context
    ): bool {
        return Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            $meta_key,
            $post_id,
            $new_value,
            "Storing {$error_context} changes for post {$post_id}"
        );
    }

    public function store_other_post_title_change(int $draft_id, int $post_id, string $new_title): bool
    {
        return $this->store_other_post_change(
            $draft_id,
            $post_id,
            $new_title,
            Miruni_Preview_Meta_Keys::OTHER_POST_TITLES,
            'title'
        );
    }

    public function store_other_post_content_change(int $draft_id, int $post_id, string $new_content): bool
    {
        return $this->store_other_post_change(
            $draft_id,
            $post_id,
            $new_content,
            Miruni_Preview_Meta_Keys::OTHER_POST_CONTENT,
            'content'
        );
    }

    public function store_theme_mod_change(int $draft_id, string $mod_name, mixed $new_value): bool
    {
        return Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::THEME_MODS,
            $mod_name,
            $new_value,
            "Storing theme mod change: {$mod_name}"
        );
    }

    public function store_wp_option_change(int $draft_id, string $option_name, mixed $new_value): bool
    {
        return Miruni_Post_Meta_Utils::update_meta_array_item(
            $draft_id,
            Miruni_Preview_Meta_Keys::WP_OPTIONS,
            $option_name,
            $new_value,
            "Storing WP option change: {$option_name}"
        );
    }

    private function store_batch_id_to_draft_mapping(int $draft_id, int $batch_id): void
    {
        // store a mapping of batch_id to draft_id in a transient so that we can retrieve it later
        $mapping = get_transient('_miruni_batch_to_draft_mapping_' . $batch_id);
        if (!is_array($mapping)) {
            $mapping = [];
        }
        $mapping["draft_id"] = $draft_id;
        set_transient('_miruni_batch_to_draft_mapping_' . $batch_id, $mapping);
    }

    private function get_draft_id_from_batch_id(int $batch_id): ?int
    {
        $mapping = get_transient('_miruni_batch_to_draft_mapping_' . $batch_id);
        if (is_array($mapping) && isset($mapping["draft_id"])) {
            return $mapping["draft_id"];
        }
        return null;
    }

    private function clear_batch_id_to_draft_mapping(int $batch_id): void
    {
        delete_transient('_miruni_batch_to_draft_mapping_' . $batch_id);
    }




    /**
     * Request to edit a preview with multiple updates
     * 
     * @param int $page_id The ID of the page to create preview for
     * @param int $suggestion_batch_id The ID of the suggestion batch
     * @param list<array{id: int, fileType:  \MiruniFileType, updatedFileContent: string, fileIdentifier: string, updateSummary: string}> $updates Array of update operations to perform
     * @return array{
     *   preview_title: string,
     *   preview_page_id: int,
     *   preview_url: string,
     *   changes: MiruniChangeResult[]
     * }
     * @throws Exception When page not found or preview creation fails
     */
    public function request_edit_preview_v2(int $page_id, int $suggestion_batch_id, array $updates): array
    {
        // For Latest Posts placeholder, we don't need to check if the page exists
        if ($page_id !== Miruni_Post_ID_Placeholder::LATEST_POSTS) {
            $page = get_post($page_id);
            if (!$page instanceof WP_Post) {
                throw new Exception(esc_html('Page not found by ID: ' . $page_id));
            }
        }

        $this->theme_preview_manager->init_preview_system();

        $existing_draft_id = $this->get_draft_id_from_batch_id($suggestion_batch_id);

        if ($existing_draft_id) {
            // delete the existing draft post
            Miruni_Draft_Publisher::cleanup_draft_data($existing_draft_id);
            $this->clear_batch_id_to_draft_mapping($suggestion_batch_id);
        }

        // Create preview post first
        $draft_id = $this->create_preview_post($page_id);
        if (!$draft_id) {
            throw new Exception(esc_html('Failed to create preview post'));
        }
        $this->store_batch_id_to_draft_mapping($draft_id, $suggestion_batch_id);

        $changes = [];
        $elementor_updates = [];
        foreach ($updates as $update) {
            if ($update['fileType'] === \MiruniFileType::ELEMENTOR_JSON) {
                $elementor_updates[] = $update;
            } else {
                $_post = null;
                if ($page_id !== Miruni_Post_ID_Placeholder::LATEST_POSTS) {
                    $__post = get_post($page_id);
                    if ($__post instanceof WP_Post) {
                        $_post = $__post;
                    }
                }
                $result = $this->process_update($update, $draft_id, $_post);
                $changes[] = $result;
            }
        }



        if (!empty($elementor_updates)) {
            $elementor_changes = $this->process_elementor_json_updates($elementor_updates, $draft_id);
            $changes = array_merge($changes, $elementor_changes);
        }

        // Generate the preview URL
        $preview_url = '';
        if ($page_id === Miruni_Post_ID_Placeholder::LATEST_POSTS) {
            // For latest posts homepage, we need to force the homepage view
            $preview_url = $this->theme_preview_manager->get_preview_url(
                home_url('/')
            );
            // Add a query parameter to help identify this is a latest posts preview
            $preview_url = add_query_arg('preview_draft_id', $draft_id, $preview_url);
        } else {
            // Check if this post is the front page
            $posts_page_id = (int) get_option('page_for_posts');

            if ($page_id == $posts_page_id) {
                $path = '/?page_id=' . $draft_id; // Posts page
            } else {
                /** @var WP_Post $page */
                $path = $page->post_type === 'page'
                    ? "?page_id={$draft_id}"
                    : "?p={$draft_id}";
            }

            $preview_url = $this->theme_preview_manager->get_preview_url(
                home_url($path)
            );
        }

        // Get the title for the preview
        $preview_title = $page_id === Miruni_Post_ID_Placeholder::LATEST_POSTS
            ? get_bloginfo('name') . ' - Latest Posts Preview'
            : get_the_title($draft_id);

        return [
            'preview_title' => $preview_title,
            'preview_page_id' => $draft_id,
            'preview_url' => $preview_url,
            'changes' => $changes
        ];
    }

    /**
     * Process a single update operation
     * 
     * @param array{id: int, fileType: \MiruniFileType, updatedFileContent: string, fileIdentifier: string, updateSummary: string} $update The update operation to process
     * @param int $draft_id ID of the draft post
     * @param ?WP_Post $page Original page being edited
     * @return MiruniChangeResult
     */
    private function process_update(array $update, int $draft_id, ?WP_Post $page): array
    {
        $file_type = $update['fileType'];
        $updated_content = $update['updatedFileContent'];
        $file_identifier = $update['fileIdentifier'];
        $update_summary = $update['updateSummary'];

        $result = null;
        switch ($file_type) {
            case \MiruniFileType::POST_TITLE:
                if ($this->update_preview_title($draft_id, $updated_content)) {
                    $original_title = $page instanceof WP_Post ? $page->post_title : "";
                    $post_content = $page instanceof WP_Post ? $page->post_content : '';
                    $result = $this->create_change_entry(
                        "Current post title",
                        $update_summary,
                        $original_title,
                        $file_identifier,
                        $file_type
                    );
                    $result["post"] = [
                        "post_id" => $draft_id,
                        "post_title" => $updated_content,
                        "post_content" => $post_content
                    ];
                }
                break;

            case \MiruniFileType::POST_CONTENT:
            case \MiruniFileType::POST:
                if ($this->update_preview_content($draft_id, $updated_content)) {
                    $original_content = $page instanceof WP_Post ? $page->post_content : "";
                    $post_title = $page instanceof WP_Post ? $page->post_title : '';
                    $result = $this->create_change_entry(
                        "Current post",
                        $update_summary,
                        $original_content,
                        $file_identifier,
                        $file_type
                    );
                    $result["post"] = [
                        "post_id" => $draft_id,
                        "post_title" => $post_title,
                        "post_content" => $updated_content
                    ];
                }
                break;

            case \MiruniFileType::OTHER_POST_EXCERPT:
            case \MiruniFileType::OTHER_POST_TITLE:
            case \MiruniFileType::OTHER_POST_CONTENT:
                // Print JSON of update
                preg_match('/\d+/', $file_identifier, $matches);
                $post_id = isset($matches[0]) ? (int) $matches[0] : 0;

                if ($post_id > 0) {
                    $reference_post = get_post($post_id);

                    if ($reference_post instanceof WP_Post) {
                        $original_content = $file_type === \MiruniFileType::OTHER_POST_TITLE
                            ? $reference_post->post_title
                            : $reference_post->post_content;


                        $success = false;
                        if ($file_type === \MiruniFileType::OTHER_POST_TITLE) {
                            $success = $this->store_other_post_title_change($draft_id, $post_id, $updated_content);
                        } else if ($file_type === \MiruniFileType::OTHER_POST_CONTENT) {
                            $success = $this->store_other_post_content_change($draft_id, $post_id, $updated_content);
                        } else {
                            $success = $this->store_other_post_change($draft_id, $post_id, $updated_content, Miruni_Preview_Meta_Keys::OTHER_POST_EXCERPTS, 'excerpt');
                        }
                        if ($success) {
                            $file_name = $reference_post->post_title;

                            $result = $this->create_change_entry(
                                $file_name,
                                $update_summary,
                                $original_content,
                                $file_identifier,
                                $file_type,
                                ['referenced_post_id' => $post_id]
                            );
                            $result["post"] = [
                                "post_id" => $post_id,
                                "post_title" => $reference_post->post_title,
                                "post_content" => $reference_post->post_content
                            ];
                        }
                    }
                } else {
                }
                break;

            case \MiruniFileType::THEME_MOD:
                $this->store_theme_mod_change($draft_id, $file_identifier, $updated_content);
                $result = $this->create_change_entry(
                    'theme_mod',
                    $update_summary,
                    get_theme_mod($file_identifier, ''),
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::WP_OPTION:
                $this->store_wp_option_change($draft_id, $file_identifier, $updated_content);
                $result = $this->create_change_entry(
                    'wp_option: ' . $file_identifier,
                    $update_summary,
                    (string) get_option($file_identifier, ''),
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::MENU_ITEM_NAME:
                $this->store_menu_item_name_change($draft_id, (int) $file_identifier, $updated_content);
                $result = $this->create_change_entry(
                    'menu item name',
                    $update_summary,
                    $updated_content,
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::MENU_ITEM_PARENT:
                $this->store_menu_item_parent_change($draft_id, (int) $file_identifier, (int) $updated_content);
                $result = $this->create_change_entry(
                    'menu item parent',
                    $update_summary,
                    $updated_content,
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::MENU_ITEM_URL:
                $this->store_menu_item_url_change($draft_id, (int) $file_identifier, $updated_content);
                $result = $this->create_change_entry(
                    'menu item url',
                    $update_summary,
                    $updated_content,
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::MENU_ITEM_OBJECT_ID:
                $this->store_menu_item_object_id_change($draft_id, (int) $file_identifier, $updated_content);
                $result = $this->create_change_entry(
                    'menu item object id',
                    $update_summary,
                    $updated_content,
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::MENU_ITEM_OBJECT:
                $this->store_menu_item_object_change($draft_id, (int) $file_identifier, $updated_content);
                $result = $this->create_change_entry(
                    'menu item object',
                    $update_summary,
                    $updated_content,
                    $file_identifier,
                    $file_type
                );
                break;

            case \MiruniFileType::BLOCK_TEMPLATE:
                if (
                    Miruni_Post_Meta_Utils::update_meta_array_item(
                        $draft_id,
                        Miruni_Preview_Meta_Keys::BLOCK_TEMPLATE,
                        $file_identifier,
                        $updated_content,
                        "Storing block template change: {$file_identifier}"
                    )
                ) {
                    $result = $this->create_change_entry(
                        'block template',
                        $update_summary,
                        $updated_content,
                        $file_identifier,
                        $file_type
                    );
                }
                break;
        }
        if (!$result) {
            throw new Exception(esc_html("Failed to process update: " . $update['fileType']->value));
        }

        $result["suggestion_id"] = $update["id"];
        return $result;
    }

    /**
     * Process a single update operation
     * 
     * @param list<array{id: int, fileType:  \MiruniFileType, updatedFileContent: string, fileIdentifier: string, updateSummary: string}> $updates The update operation to process
     * @param int $draft_id ID of the draft post
     * @return MiruniChangeResult[]
      
     * */
    private function process_elementor_json_updates(array $updates, int $draft_id): array
    {


        $existing_elementor_json = Miruni_Elementor_Service::get_page_data($draft_id);

        // type of $existing_elementor_json?

        // Fix: Check if result is a string and decode it
        if (is_string($existing_elementor_json)) {
            $existing_elementor_json = json_decode($existing_elementor_json, true);
        }

        // Handle invalid or empty data
        if (!is_array($existing_elementor_json)) {
            $existing_elementor_json = [];
            do_action('my_plugin_error', new Exception(esc_html("Invalid Elementor JSON data")), [
                'context' => 'Draft Manager',
                'operation' => 'Processing Elementor JSON updates',
                'draft_id' => $draft_id,
                'user_id' => get_current_user_id()
            ]);
            return []; // Return empty changes as we can't process them
        }
        $updated_content = false;
        $changes = [];
        foreach ($updates as $update) {
            $element_id = $update['fileIdentifier'];
            $update_summary = $update['updateSummary'];
            $updated_content = $update['updatedFileContent'];
            $file_name = $element_id;
            // find the block in the existing content
            $block_index = array_search($element_id, array_column($existing_elementor_json, 'id'));
            if ($block_index === false) {
                continue;
            }
            $block = $existing_elementor_json[$block_index];
            $existing_elementor_json[$block_index] = json_decode($update['updatedFileContent'], true);
            $block_name = $block['elType'];
            $change = $this->create_change_entry(
                "elementor $block_name element ($element_id)",
                $update_summary,
                (string) json_encode($block),
                $file_name,
                \MiruniFileType::ELEMENTOR_JSON
            );
            $change["suggestion_id"] = $update["id"];
            $changes[] = $change;

        }

        if ($updated_content === false) {
            do_action('my_plugin_error', new Exception(esc_html("Error updating Elementor JSON")), [
                'context' => $existing_elementor_json,
                'operation' => "Updating Elementor JSON",
                'user_id' => get_current_user_id()
            ]);
            return [];
        }
        $this->store_elementor_json_change($draft_id, $existing_elementor_json);
        return $changes;
    }

    /**
     * Create a standardized change entry
     * 
     * @param string $file_name The name of the file or field being changed
     * @param string $changes_made Summary of changes made
     * @param string $original_content Original content before changes
     * @param string $file_identifier Identifier for the file/content being changed
     * @param  \MiruniFileType $file_type Type of content being changed
     * @param array{
     * referenced_post_id?: int
     * } $additional_fields Additional fields to include
     * @return array{
     *   file_name: string,
     *   changes_made: string,
     *   original_content: string,
     *   file_identifier: string,
     *   file_type: string,
     *   referenced_post_id?: int
     * }
     */
    private function create_change_entry(
        string $file_name,
        string $changes_made,
        string $original_content,
        string $file_identifier,
        \MiruniFileType $file_type,
        array $additional_fields = []
    ): array {
        $entry = [
            'file_name' => $file_name,
            'changes_made' => $changes_made,
            'original_content' => $original_content,
            'file_identifier' => $file_identifier,
            'file_type' => $file_type->value
        ];

        return array_merge($entry, $additional_fields);
    }


    /**
     * Summary of handle_ad_hoc_change
     * @param int $draft_id
     * @param array{id: int, fileType:  \MiruniFileType, updatedFileContent: string, fileIdentifier: string, updateSummary: string} $update
     * @return MiruniChangeResult
     */
    public function handle_ad_hoc_change(int $draft_id, array $update): array
    {
        return $this->process_update($update, $draft_id, null);
    }


}