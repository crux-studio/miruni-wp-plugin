<?php

namespace Miruni\RestApi;
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

use WP_Error;
use WP_REST_Response;
use WP_Query;
use WP_Post;
use Miruni\Miruni_Post_ID_Placeholder;

// Initialize the global variable
global $wp_query_parameters;
if (!isset($wp_query_parameters)) {
    $wp_query_parameters = [];
}

class Miruni_Referenced_Posts_API extends Miruni_BaseAPI
{
    // Add a static flag to track when we're in capture mode
    private static bool $is_capturing = false;

    public static string $namespace = 'miruni/v1';
    public static string $route = '/page-queries/';

    public static function get_rest_url(int $page_id): string
    {
        return self::_get_rest_url(['page_id' => $page_id]);
    }

    public static function setup(): void
    {
        // Hook to capture query parameters
        add_action('pre_get_posts', [__CLASS__, 'capture_wp_query_parameters']);
        add_filter('the_posts', [__CLASS__, 'capture_the_posts'], 10, 2);
        add_filter('found_posts', [__CLASS__, 'capture_found_posts'], 10, 2);

        // Restore template hooks - these are critical for capturing template data
        add_filter('get_post_metadata', [__CLASS__, 'capture_template_metadata'], 10, 4);
        add_filter('template_include', [__CLASS__, 'capture_template_include'], 99);

        // Register REST API endpoint
        add_action('rest_api_init', function () {
            // Original endpoint
            register_rest_route(self::$namespace, self::$route, [
                'methods' => 'GET',
                'callback' => [__CLASS__, 'get_page_queries'],
                'permission_callback' => [__CLASS__, 'snippet_secret_required_permission_callback'], // Using the public access method from BaseAPI
                'args' => [
                    'page_id' => [
                        'required' => false,
                        'sanitize_callback' => [__CLASS__, 'sanitize_page_id'],
                    ],
                    'path' => [
                        'required' => false,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ]);
        });

        // Hook into template loading to capture block templates
        add_filter('get_block_template', [__CLASS__, 'capture_block_template'], 10, 3);
        add_filter('get_block_templates', [__CLASS__, 'capture_block_templates'], 10, 3);

        // Add these new hooks for patterns
        add_filter('get_block_patterns', [__CLASS__, 'capture_block_patterns'], 10, 1);
        add_filter('get_block_pattern', [__CLASS__, 'capture_block_pattern'], 10, 2);



    }

    /**
     * Custom sanitize function for page_id parameter
     * 
     * @param mixed $value The parameter value
     * @param \WP_REST_Request<array<mixed>> $request The request object
     * @param string $param The parameter name
     * @return int Sanitized integer value
     */
    public static function sanitize_page_id($value, $request, $param): int
    {
        return intval($value);
    }

    /**
     * Capture template metadata when it's being fetched
     * 
     * @param mixed $value The existing value
     * @param int $object_id Object ID
     * @param string $meta_key Meta key
     * @param bool $single Whether to return a single value
     * @return mixed Original value
     */
    public static function capture_template_metadata($value, $object_id, $meta_key, $single)
    {
        // Only capture when we're in capturing mode
        if (!self::$is_capturing) {
            return $value;
        }

        // We're interested in template metadata
        if ($meta_key === '_wp_page_template' || $meta_key === '_wp_template_slug') {
            // Let the original function run and capture the result
            $template = null;
            remove_filter('get_post_metadata', [__CLASS__, 'capture_template_metadata'], 10);
            $template = get_post_meta($object_id, $meta_key, $single);
            add_filter('get_post_metadata', [__CLASS__, 'capture_template_metadata'], 10, 4);

            if ($template) {
                global $wp_template_data;
                if (!isset($wp_template_data)) {
                    $wp_template_data = [];
                }
                $wp_template_data[$meta_key] = $template;
                $wp_template_data['object_id'] = $object_id;

            }
        }

        return $value;
    }

    /**
     * Capture template file being used
     * 
     * @param string $template Template file path
     * @return string Original template file path
     */
    public static function capture_template_include($template)
    {
        // Only capture when we're in capturing mode
        if (self::$is_capturing) {
            global $wp_template_data;
            if (!isset($wp_template_data)) {
                $wp_template_data = [];
            }
            $wp_template_data['template_file'] = $template;
            $wp_template_data['template_name'] = basename($template);

            // If possible, capture template type
            $template_parts = explode('/', $template);
            $filename = end($template_parts);

            if (strpos($filename, 'single-') === 0) {
                $wp_template_data['template_type'] = 'single';
            } elseif (strpos($filename, 'page-') === 0) {
                $wp_template_data['template_type'] = 'page';
            } elseif ($filename === 'single.php') {
                $wp_template_data['template_type'] = 'single';
            } elseif ($filename === 'page.php') {
                $wp_template_data['template_type'] = 'page';
            } elseif ($filename === 'index.php') {
                $wp_template_data['template_type'] = 'index';
            }
        }

        return $template;
    }

    /**
     * Capture block patterns as they're being fetched
     * 
     * @param array<mixed> $patterns The block patterns
     * @return array<mixed> Original patterns
     */
    public static function capture_block_patterns($patterns): array
    {
        // Only capture when we're in capturing mode
        // @phpstan-ignore function.alreadyNarrowedType
        if (self::$is_capturing && is_array($patterns)) {
            global $wp_captured_patterns;
            if (!isset($wp_captured_patterns)) {
                $wp_captured_patterns = [];
            }

            foreach ($patterns as $pattern) {
                if (isset($pattern['name'])) {
                    $wp_captured_patterns[$pattern['name']] = $pattern;
                }
            }
        }

        return $patterns;
    }

    /**
     * Capture individual block pattern
     * 
     * @param array<mixed>|null $pattern The block pattern
     * @param string $pattern_name Pattern name
     * @return array<mixed>|null Original pattern
     */
    public static function capture_block_pattern($pattern, $pattern_name): ?array
    {
        // Only capture when we're in capturing mode
        if (self::$is_capturing && is_array($pattern)) {
            global $wp_captured_patterns;
            if (!isset($wp_captured_patterns)) {
                $wp_captured_patterns = [];
            }

            $wp_captured_patterns[$pattern_name] = $pattern;
        }

        return $pattern;
    }

    /**
     * Capture block template data
     * 
     * @param \WP_Block_Template|null $block_template Block template object.
     * @param string $id Template unique identifier.
     * @param string $template_type Template type.
     * @return \WP_Block_Template|null Original block template.
     */
    public static function capture_block_template($block_template, $id, $template_type)
    {
        // Only capture when we're in capturing mode
        if (self::$is_capturing && $block_template) {
            global $wp_template_data;
            if (!isset($wp_template_data)) {
                $wp_template_data = [];
            }
            $wp_template_data['block_template'] = [
                'id' => $block_template->id,
                'slug' => $block_template->slug,
                'title' => $block_template->title,
                'content' => $block_template->content,
                'template_type' => $template_type,
            ];

        }

        // Also call the implementation for capturing templates
        return self::capture_block_template_implementation($block_template, $id);
    }

    /**
     * Summary of capture_the_posts
     * @param array<WP_Post> $posts
     * @param mixed $query
     * @return mixed
     */
    public static function capture_the_posts(array $posts, $query): mixed
    {
        if (self::$is_capturing && !is_admin() && $query instanceof WP_Query) {
            self::capture_wp_query_parameters($query);
        }
        return $posts;
    }


    /**
     * Summary of capture_found_posts
     * @param mixed $found_posts
     * @param mixed $query
     * @return mixed
     */
    public static function capture_found_posts(mixed $found_posts, $query): mixed
    {
        if (self::$is_capturing && !is_admin() && $query instanceof WP_Query) {
            self::capture_wp_query_parameters($query);
        }
        return $found_posts;
    }

    /**
     * Capture and return all unique posts from all queries for a specific page
     * @param \WP_REST_Request<array<mixed>> $request
     * @return WP_Error|WP_REST_Response
     */
    public static function get_page_queries(\WP_REST_Request $request): WP_Error|WP_REST_Response
    {
        global $wp_query_parameters;
        global $wp_template_data;
        global $wp_captured_templates;
        global $wp_captured_patterns;

        $wp_query_parameters = []; // Reset the array
        $wp_template_data = []; // Reset template data
        $wp_captured_templates = []; // Reset captured templates
        $wp_captured_patterns = []; // Reset captured patterns

        // Enable capturing mode
        self::$is_capturing = true;

        // Force WordPress to load block templates
        // This ensures templates get loaded during simulation
        add_filter('use_block_editor_for_post', '__return_true');
        add_theme_support('block-templates');

        // Get page to simulate loading
        $page_id = $request->get_param('page_id');

        if (!$page_id) {
            return new WP_Error('invalid_request', 'You must provide a page ID', ['status' => 400]);
        }

        // force $page_id to be a number
        $page_id = (int) $page_id;

        // Disable all caching for this request
        define('DONOTCACHEPAGE', true);
        define('DONOTCACHEOBJECT', true);
        define('DONOTCACHEDB', true);
        wp_using_ext_object_cache(false);
        wp_cache_flush();

        // Special handling for Latest Posts homepage
        if ($page_id === Miruni_Post_ID_Placeholder::LATEST_POSTS) {

            // Setup WordPress environment to simulate homepage with latest posts
            global $wp_query;

            // Save original query
            $original_query = $wp_query;

            // Setup environment to simulate latest posts homepage
            $wp_query->is_home = true;
            $wp_query->is_front_page = true;

            // Temporarily force "Your latest posts" mode even if a static front page is set
            add_filter('pre_option_show_on_front', function () {
                return 'posts';
            });

            // Force WordPress to load template for homepage
            add_filter('pre_option_page_on_front', function () {
                return '0'; // No static front page
            });

            // Explicitly trigger template loading for block themes
            if (wp_is_block_theme()) {
                // Get template hierarchy for home/latest posts
                $template_hierarchy = array();

                // For latest posts, WordPress follows a specific hierarchy
                $template_hierarchy[] = 'home';
                $template_hierarchy[] = 'index';

                // If a custom template is set for the posts page in reading settings
                $posts_page_id = get_option('page_for_posts');
                if ($posts_page_id) {
                    // Get template slug if set
                    $template_slug = get_page_template_slug($posts_page_id);
                    if ($template_slug) {
                        array_unshift($template_hierarchy, $template_slug);
                    }

                    // Add page-specific templates
                    $post = get_post($posts_page_id);
                    if ($post && $post instanceof WP_Post) {
                        array_unshift($template_hierarchy, 'page-' . $post->post_name);
                        array_unshift($template_hierarchy, 'page-' . $post->ID);
                    }
                }

                // Force load templates based on hierarchy
                $templates = get_block_templates(array('slug__in' => $template_hierarchy));


                // Try to load the first available template in the hierarchy
                $template = null;
                foreach ($template_hierarchy as $template_slug) {
                    $loaded_template = get_block_template(get_stylesheet() . '//' . $template_slug);
                    if ($loaded_template) {
                        $template = $loaded_template;

                        break;
                    }
                }
            }

            // Explicitly trigger template loading for block themes
            if (wp_is_block_theme()) {
                // Force load templates before rendering
                $templates = get_block_templates(['slug__in' => ['index', 'home']]);

                // Explicitly get the home template which should trigger our filter
                $home_template = get_block_template(get_stylesheet() . '//home');
                if ($home_template) {

                }
            }

            // Simulate rendering the homepage
            ob_start();

            if (wp_is_block_theme() && function_exists('get_block_template')) {
                // For block themes
                $template = get_block_template(get_stylesheet() . '//home');

                if ($template) {
                    // First parse the template content into blocks
                    $parsed_blocks = parse_blocks($template->content);
                    // Process the blocks to find template parts
                    self::process_template_blocks($parsed_blocks);
                    echo wp_kses_post(do_blocks($template->content));
                } else {
                    // Try index template as fallback
                    $template = get_block_template(get_stylesheet() . '//index');
                    if ($template) {
                        echo wp_kses_post(do_blocks($template->content));
                    }
                }
            } else {
                // For classic themes, load the home template
                locate_template(['home.php', 'index.php'], true);
            }
            ob_end_clean();

            // Restore original query
            $wp_query = $original_query;

            // Remove our temporary filter
            remove_filter('pre_option_show_on_front', '__return_true');
            remove_filter('pre_option_page_on_front', '__return_true');
        } else {
            // Standard post handling for regular pages
            $post = get_post($page_id);
            if (!$post) {
                return new WP_Error('not_found', 'Page not found', ['status' => 404]);
            }

            // Set up the global $post and run setup_postdata()
            global $post;
            $post = get_post($page_id);
            setup_postdata($page_id);

            // THIS IS THE CRITICAL PART:
            // For Elementor pages, render the content which will execute all widgets
            if (class_exists('\Elementor\Plugin')) {
                $elementor = \Elementor\Plugin::instance();

                // This triggers the actual rendering that will execute widget queries
                ob_start();
                echo wp_kses_post($elementor->frontend->get_builder_content($page_id, true));
                ob_end_clean();
            }

            // For block themes, try to load templates
            if (wp_is_block_theme()) {
                if (function_exists('get_block_template')) {
                    $template_types = ['index', 'single', 'page', 'home'];
                    foreach ($template_types as $type) {
                        $template = get_block_template(get_stylesheet() . '//' . $type);
                        if ($template) {
                        }
                    }
                }
            }

            // Simulate template loading for this page
            $template = get_page_template();
            if (file_exists($template)) {
                // Load the template but capture the output buffer
                ob_start();
                include $template;
                ob_end_clean(); // Discard the HTML output
            }

            // Another approach: let WordPress render the template
            ob_start();
            load_template($template);
            ob_end_clean();

            wp_reset_postdata();
        }

        // Disable capturing mode when done
        self::$is_capturing = false;

        // Collect all unique posts
        $all_posts = [];
        $block_related_types = ['wp_template', 'wp_template_part', 'wp_block', 'wp_navigation'];

        // Process regular query data and look for wp_template posts
        // @phpstan-ignore foreach.emptyArray
        foreach ($wp_query_parameters as $query) {
            if (!empty($query['wp_query_instance']) && $query['wp_query_instance'] instanceof WP_Query) {
                $q = $query['wp_query_instance'];

                // Debug query types
                if (!empty($q->query_vars['post_type'])) {
                }

                // @phpstan-ignore booleanAnd.rightAlwaysTrue
                if (!empty($q->posts) && is_array($q->posts)) {
                    foreach ($q->posts as $post) {
                        if ($post instanceof WP_Post && $page_id !== $post->ID) {
                            // Skip block-related post types for the posts array
                            if (in_array($post->post_type, $block_related_types)) {
                                // If this is a template-related post, add it to templates
                                global $wp_captured_templates;
                                if (!isset($wp_captured_templates)) {
                                    $wp_captured_templates = [];
                                }

                                // Only add if not already captured by other methods
                                if (!isset($wp_captured_templates[$post->ID])) {
                                    $wp_captured_templates[$post->ID] = [
                                        'id' => $post->post_name,
                                        'slug' => $post->post_name,
                                        'title' => $post->post_title,
                                        'content' => $post->post_content,
                                        'type' => $post->post_type,
                                        'source' => 'query',
                                        'post_id' => $post->ID
                                    ];
                                }

                                continue; // Skip adding to posts array
                            }

                            // Store the whole post object in the array, using ID as key to avoid duplicates
                            $all_posts[$post->ID] = $post;
                        }
                    }
                }
            }
        }

        // Return the array of unique posts with debugging info
        $response_data = [
            'posts' => $all_posts,
            'templates' => [],
            'patterns' => [],
        ];

        // Add block templates to the response - but only those that were actually used
        if (function_exists('get_block_templates')) {
            global $wp_captured_templates;

            // If we didn't capture any templates during page load, that's useful information too
            if (empty($wp_captured_templates)) {
                $response_data['templates_info'] = 'No templates were captured during page load';
            } else {
                foreach ($wp_captured_templates as $template_data) {
                    $response_data['templates'][] = $template_data;
                }
            }

            // Include current template information if available
            // @phpstan-ignore empty.variable
            if (!empty($wp_template_data)) {
                $response_data['current_template'] = $wp_template_data;
            }
        }

        return new WP_REST_Response($response_data, 200);
    }

    /**
     * Enhanced capture function to store more details
     */
    public static function capture_wp_query_parameters(WP_Query $query): void
    {
        // Only proceed if we're in capturing mode
        if (!self::$is_capturing) {
            return;
        }

        global $wp_query_parameters;

        // Skip admin queries
        if (is_admin()) {
            return;
        }

        // Special logging for template queries
        if (
            isset($query->query_vars['post_type']) &&
            (is_array($query->query_vars['post_type']) && in_array('wp_template', $query->query_vars['post_type']) ||
                $query->query_vars['post_type'] === 'wp_template')
        ) {
        }

        // Get the query variables
        $query_vars = $query->query_vars;

        // Add query ID or index for reference
        $query_id = count($wp_query_parameters) + 1;

        // Store query parameters with some metadata
        $wp_query_parameters[] = [
            'query_id' => $query_id,
            'query_vars' => $query_vars,
            'is_main_query' => $query->is_main_query(),
            'post_type' => $query_vars['post_type'] ?? 'any',
            'posts_per_page' => $query_vars['posts_per_page'] ?? get_option('posts_per_page'),
            'timestamp' => microtime(true),
            'wp_query_instance' => $query, // Store reference to the full query object
        ];
    }
    /**
     * Capture individual block template as it's loaded
     * 
     * Note: This is an updated version of the method defined earlier
     * @param \WP_Block_Template|null $template Block template object.
     * @param string $id Template unique identifier.
     * @return \WP_Block_Template|null Original block template.
     */
    private static function capture_block_template_implementation($template, $id): ?\WP_Block_Template
    {
        // Only capture when we're in capturing mode
        if (self::$is_capturing && $template) {
            global $wp_captured_templates;
            if (!isset($wp_captured_templates)) {
                $wp_captured_templates = [];
            }

            // Store the template with context about how it was loaded
            $wp_captured_templates[$id] = [
                'id' => $template->id,
                'slug' => $template->slug,
                'title' => $template->title,
                'content' => $template->content,
                'type' => $template->type,
                'is_custom' => $template->is_custom,
                'author' => $template->author,
                'theme' => $template->theme,
                'post_types' => $template->post_types,
                'area' => $template->area ?? null,
                'source' => $template->source
            ];
        }

        return $template;
    }


    /**
     * Process blocks to find and load template parts
     * 
     * @param array<mixed> $blocks Array of parsed blocks
     * @return void
     */
    private static function process_template_blocks(array $blocks): void
    {
        foreach ($blocks as $block) {
            // Check if this is a template part block
            if ($block['blockName'] === 'core/template-part') {
                if (!empty($block['attrs']['slug']) && !empty($block['attrs']['theme'])) {
                    // Try to get the template part
                    $template_part = get_block_template(
                        $block['attrs']['theme'] . '//' . $block['attrs']['slug'],
                        'wp_template_part'
                    );

                    if ($template_part) {
                        // Process the template part's content to trigger queries
                        do_blocks($template_part->content);

                        // Also recursively process any nested template parts
                        $nested_blocks = parse_blocks($template_part->content);
                        self::process_template_blocks($nested_blocks);
                    }
                }
            }

            // Process inner blocks recursively
            if (!empty($block['innerBlocks'])) {
                self::process_template_blocks($block['innerBlocks']);
            }
        }
    }

    /**
     * Capture multiple templates as they're queried
     * @param array<\WP_Block_Template>|null $templates Array of block templates.
     * @param \WP_Query $query The WP_Query instance.
     * @param string $template_type The type of template being queried.
     * @return array<\WP_Block_Template> |null The original array of block templates.
     */
    public static function capture_block_templates($templates, $query, $template_type): array|null
    {
        // Only capture when we're in capturing mode
        if (self::$is_capturing && $templates) {
            global $wp_captured_templates;
            if (!isset($wp_captured_templates)) {
                $wp_captured_templates = [];
            }

            foreach ($templates as $template) {
                $wp_captured_templates[$template->id] = [
                    'id' => $template->id,
                    'slug' => $template->slug,
                    'title' => $template->title,
                    'content' => $template->content,
                    'type' => $template->type,
                    'is_custom' => $template->is_custom,
                    'author' => $template->author,
                    'theme' => $template->theme,
                    'post_types' => $template->post_types,
                    'area' => $template->area ?? null,
                    'source' => $template->source,
                    'query_context' => [
                        'time' => microtime(true),
                        'template_type' => $template_type,
                        'backtrace' => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 3)
                    ]
                ];
            }
        }

        return $templates;
    }

}
