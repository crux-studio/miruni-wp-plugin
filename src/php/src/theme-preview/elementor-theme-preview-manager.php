<?php

namespace Miruni\ThemePreview;

use Elementor\Core\Files\CSS\Post as Post_CSS;
use Elementor\Plugin;
use Exception;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Elementor-specific theme preview manager
 * This class will only be instantiated when Elementor is active
 */
class Miruni_Elementor_Theme_Preview_Manager extends Miruni_Theme_Preview_Manager
{
    /**
     * Constructor for Elementor theme preview manager
     */
    public function __construct()
    {
        parent::__construct();

        // Add Elementor-specific hooks only if Elementor is active
        if (defined('ELEMENTOR_VERSION') || class_exists('Elementor\Plugin')) {
            // Add Elementor-specific hooks
            add_action('elementor/preview/enqueue_styles', [$this, 'enqueue_elementor_preview_styles']);
            add_filter('elementor/documents/get/post_id', [$this, 'filter_elementor_template_id']);
            add_filter('elementor/frontend/the_content', [$this, 'filter_elementor_content'], 10, 1);
            add_filter('elementor/theme/get_location_templates', [$this, 'filter_elementor_location_templates'], 10, 2);

            // Add special hook for WordPress preview
            add_action('wp_enqueue_scripts', [$this, 'ensure_elementor_styles_in_preview'], 999);
            add_filter('body_class', [$this, 'add_elementor_body_classes']);
        }
    }


    /**
     * Initialize preview system with Elementor support
     */
    public function init_preview_system(): void
    {
        parent::init_preview_system();

        // Register Elementor preview specific actions
        add_action('wp_ajax_save_elementor_template', [$this, 'save_elementor_template']);

        // Handle Elementor data
        add_filter('elementor/theme/get_templates', [$this, 'filter_elementor_templates'], 10, 2);
    }

    /**
     * Ensure Elementor styles are loaded correctly in WordPress preview
     */
    public function ensure_elementor_styles_in_preview(): void
    {
        if (!$this->validate_is_preview()) {
            return;
        }
        // Check if we're in a preview
        global $post;

        if (!$post) {
            return;
        }

        $post_id = $post->ID;

        // Check if this is an Elementor-built post
        if (class_exists('Elementor\Plugin') && \Elementor\Plugin::$instance->db->is_built_with_elementor($post_id)) {
            // Add this filter to ensure CSS is generated correctly
            add_filter('elementor/css/file/get_content', function ($css, $file) {
                // Force Elementor to regenerate the CSS content
                $file->get_post_meta_data();  // This forces a refresh of post meta
                return $css;
            }, 10, 2);

            // Load styles in correct order
            $this->load_elementor_styles_in_order($post_id);
        }

    }

    private function load_elementor_styles_in_order(int $post_id): void
    {


        if (!class_exists('Elementor\Plugin')) {
            return;
        }

        // 1. First load common CSS
        wp_enqueue_style('elementor-common');

        // 2. Then register and enqueue frontend CSS with dependency on common
        Plugin::$instance->frontend->register_styles();
        wp_enqueue_style('elementor-frontend');


        // 3. Then load global styles
        if (method_exists(Plugin::$instance->frontend, 'enqueue_global_styles')) {
            Plugin::$instance->frontend->enqueue_global_styles();
        }


        // 4. Create and generate CSS file with refreshed data
        // @phpstan-ignore class.notFound
        $css_file = Post_CSS::create($post_id);
        $css_file->update();
        $css_file->enqueue();

        // 5. Finally load widget styles
        $this->enqueue_widget_styles();

        Plugin::$instance->frontend->enqueue_scripts();
        Plugin::$instance->frontend->enqueue_styles();

    }
    /**
     * Enqueue all registered widget styles to ensure complete rendering
     */
    public function enqueue_widget_styles(): void
    {
        // Get all widget types
        if (class_exists('Elementor\Plugin')) {
            $widgets_manager = \Elementor\Plugin::$instance->widgets_manager;
            $widget_types = $widgets_manager->get_widget_types();

            // @phpstan-ignore foreach.nonIterable
            foreach ($widget_types as $widget) {
                // Get widget dependencies
                $widget->get_style_depends();
                $widget->get_script_depends();
            }
        }
    }

    /**
     * Add required Elementor body classes for proper styling
     * 
     * @param array<string> $classes Existing body classes
     * @return array<string> Modified body classes
     */
    public function add_elementor_body_classes(array $classes): array
    {
        if (!$this->validate_is_preview()) {
            return $classes;
        }
        global $post;


        if (!$post) {
            return $classes;
        }

        $post_id = $post->ID;

        // Check if this post was built with Elementor
        if (class_exists('Elementor\Plugin') && \Elementor\Plugin::$instance->db->is_built_with_elementor($post_id)) {
            // Add the Elementor body classes
            $classes[] = 'elementor-default';
            $classes[] = 'elementor-page';
            $classes[] = 'elementor-page-' . $post_id;

            // Get template type to add specific classes
            // @phpstan-ignore class.notFound
            $document = \Elementor\Plugin::$instance->documents->get($post_id);
            if ($document) {
                $classes[] = 'elementor-template-' . $document->get_template_type();
            }
        } else {
        }


        return $classes;
    }

    /**
     * Enqueue Elementor-specific styles for preview mode
     */
    public function enqueue_elementor_preview_styles(): void
    {
        if (!$this->validate_is_preview()) {
            return;
        }


        wp_enqueue_style(
            'miruni-elementor-preview',
            plugin_dir_url(__FILE__) . 'assets/css/elementor-preview.css',
            [],
            '1.0.0'
        );
    }

    /**
     * Filter Elementor content in preview mode
     * 
     * @param string $content The Elementor content
     * @return string Modified content
     */
    public function filter_elementor_content($content): string
    {
        if (!$this->validate_is_preview()) {
            return $content;
        }

        global $post;
        $post_id = $post?->ID;

        if (empty($post_id)) {
            return $content;
        }

        // Get the preview post ID
        $preview_id = $this->get_preview_id();

        if (!$preview_id) {
            return $content;
        }

        // Check for Elementor-specific content changes
        $elementor_data = get_post_meta($preview_id, '_miruni_elementor_data', true);
        if (is_array($elementor_data) && isset($elementor_data[$post_id])) {
            return $elementor_data[$post_id];
        }

        return $content;
    }

    /**
     * Save Elementor template data in preview mode
     */
    public function save_elementor_template(): void
    {
        if (!current_user_can('edit_theme_options')) {
            wp_send_json_error('Insufficient permissions');
        }

        check_ajax_referer('elementor_preview_nonce', 'nonce');

        $template_id = isset($_POST['template_id']) ? (int) $_POST['template_id'] : 0;
        $content = isset($_POST['content']) ? wp_kses_post(wp_unslash($_POST['content'])) : '';
        $preview_post_id = isset($_POST['preview_id']) ? (int) $_POST['preview_id'] : 0;

        if (!$template_id || !$content || !$preview_post_id) {
            wp_send_json_error('Missing required data');
        }

        // Store the template data in post meta for the preview
        $elementor_data = get_post_meta($preview_post_id, '_miruni_elementor_data', true) ?: [];
        $elementor_data[$template_id] = $content;
        update_post_meta($preview_post_id, '_miruni_elementor_data', $elementor_data);

        // Clear Elementor cache for this template
        if (class_exists('Elementor\Plugin')) {
            // @phpstan-ignore class.notFound
            $post_css = new Post_CSS($template_id);
            // @phpstan-ignore class.notFound
            $post_css->delete();
        }

        wp_send_json_success('Elementor template saved for preview');
    }

    /**
     * Filter Elementor template ID in preview mode
     * 
     * @param int $post_id The template post ID
     * @return int The filtered post ID
     */
    public function filter_elementor_template_id(int $post_id): int
    {
        if (!$this->validate_is_preview()) {
            return $post_id;
        }

        // Check if this template has a preview version
        $preview_id = $this->get_preview_id();

        $post = get_post($post_id);

        if (!$preview_id) {
            return $post_id;
        }

        // Check for template mapping
        $template_map = get_post_meta($preview_id, '_miruni_elementor_template_map', true);
        if (is_array($template_map) && isset($template_map[$post_id])) {
            return (int) $template_map[$post_id];
        }

        return $post_id;
    }

    /**
     * Filter Elementor templates in preview mode
     * 
     * @param array<string> $templates The templates array
     * @param array $args Template arguments
     * @return array<mixed> The filtered templates
     * @phpstan-ignore missingType.iterableValue
     */
    public function filter_elementor_templates(array $templates, array $args): array
    {
        if (!$this->validate_is_preview()) {
            return $templates;
        }

        $preview_id = $this->get_preview_id();

        if (!$preview_id) {
            return $templates;
        }

        // Get preview templates
        $preview_templates = get_post_meta($preview_id, '_miruni_elementor_templates', true);
        if (is_array($preview_templates) && !empty($preview_templates)) {
            return array_merge($templates, $preview_templates);
        }

        return $templates;
    }

    /**
     * Filter Elementor location templates in preview mode
     * 
     * @param array<string> $templates The location templates
     * @param string $location The location
     * @return array<string> The filtered templates
     */
    public function filter_elementor_location_templates(array $templates, string $location): array
    {
        if (!$this->validate_is_preview()) {
            return $templates;
        }

        $preview_id = $this->get_preview_id();

        if (!$preview_id) {
            return $templates;
        }

        // Get preview location templates
        $location_templates = get_post_meta($preview_id, '_miruni_elementor_location_templates', true);
        if (is_array($location_templates) && isset($location_templates[$location])) {
            return $location_templates[$location];
        }

        return $templates;
    }

    /**
     * Apply stored Elementor data to actual posts
     * 
     * @param int $draft_id The ID of the draft/preview post
     * @return array<string> Array of updated post IDs
     */
    public function publish_elementor_changes(int $draft_id): array
    {
        $applied_changes = [];
        $elementor_data = get_post_meta($draft_id, '_miruni_elementor_data', true);

        if (is_array($elementor_data) && !empty($elementor_data)) {
            foreach ($elementor_data as $post_id => $data) {
                // Update Elementor data
                update_post_meta($post_id, '_elementor_data', $data);

                // Regenerate CSS
                if (class_exists('Elementor\Plugin')) {
                    // @phpstan-ignore class.notFound
                    $post_css = new Post_CSS($post_id);
                    // @phpstan-ignore class.notFound
                    $post_css->update();
                }

                $applied_changes[] = $post_id;
            }

            // Clean up the meta data
            delete_post_meta($draft_id, '_miruni_elementor_data');
        }

        return $applied_changes;
    }

    /**
     * Override the maybe_use_preview_theme method to include Elementor-specific filters
     */
    public function maybe_use_preview_theme(): void
    {
        $is_preview = $this->validate_is_preview();
        if (!$is_preview) {
            return;
        }

        parent::maybe_use_preview_theme();
    }

    /**
     * Filter Elementor builder content data in preview mode
     * 
     * @param array<mixed>|string $data The builder content data
     * @param int $post_id The post ID
     * @return array<mixed> The filtered data
     */
    public function filter_elementor_builder_content(array|string $data, int $post_id): array
    {
        if (is_string($data)) {
            $data = json_decode($data, true);
        }
        // Get the preview post ID
        $preview_id = $this->get_preview_id();

        if (!$preview_id) {
            return $data;
        }

        // Check for Elementor data
        $elementor_data = get_post_meta($preview_id, '_miruni_elementor_data', true);

        if (is_array($elementor_data) && isset($elementor_data[$post_id])) {
            return $elementor_data[$post_id];
        }

        return $data;
    }

    /**
     * Filter Elementor builder HTML output in preview mode
     * 
     * @param string $content The builder HTML content
     * @param int $post_id The post ID
     * @return string The filtered content
     */
    public function filter_elementor_builder_html(string $content, int $post_id): string
    {
        // Get the preview post ID
        $preview_id = $this->get_preview_id();

        if (!$preview_id) {
            return $content;
        }


        // Check for Elementor HTML
        $elementor_html = get_post_meta($preview_id, '_miruni_elementor_builder_html', true);
        if (is_array($elementor_html) && isset($elementor_html[$post_id])) {
            return $elementor_html[$post_id];
        }

        return $content;
    }

    /**
     * Enqueue preview-specific Elementor styles
     */
    public function enqueue_preview_elementor_styles(): void
    {
        if (!$this->validate_is_preview()) {
            return;
        }

        $preview_id = $this->get_preview_id();

        if (!$preview_id) {
            return;
        }

        $this->load_elementor_styles_in_order($preview_id);

        // Check for custom CSS - load it LAST
        $custom_css = get_post_meta($preview_id, '_miruni_elementor_custom_css', true);
        if (!empty($custom_css)) {
            wp_add_inline_style('elementor-frontend', $custom_css);
        }
    }
}