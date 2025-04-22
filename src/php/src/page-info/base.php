<?php

namespace Miruni\PageInfo;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

use Exception;
use WP_Post;
use Miruni\Miruni_Post_ID_Placeholder;

abstract class Miruni_Page_Info_Base
{
    // @phpstan-ignore missingType.iterableValue
    protected WP_Post|array $post;
    protected int|null $post_id;
    protected string|null $post_title;
    protected string|null $post_content;
    protected string|null $template_name;

    protected bool $is_home_page = false;
    /**
     * Summary of default_option_keys
     * @var array<string> Default option keys
     */
    protected array $default_option_keys = [
        "blogname",
        "blogdescription",
        "siteurl",
        "date_format",
        "time_format",
    ];

    public function __construct(WP_Post|null $post = null)
    {
        if ($post instanceof WP_Post) {
            $this->post = $post;
        } else {

            // $_post = get_post();
            // if ($_post instanceof WP_Post || is_array($_post)) {
            //     $this->post = $_post;
            // } 
        }
        $this->init_post_data();
    }

    protected function init_post_data(): void
    {
        if (!isset($this->post)) {
            $this->post_id = null;
            $this->post_title = null;
            $this->post_content = null;
            $this->is_home_page = is_home() || is_front_page();

            // Determine template for home page
            if ($this->is_home_page) {
                // Check if static front page is set
                $front_page_id = get_option('page_on_front');

                if ($front_page_id) {
                    // Static front page
                    $template_name = get_page_template_slug($front_page_id);
                    if ($template_name) {
                        $this->template_name = $template_name;
                    } else {
                        // Check if a custom template is set for the front page
                        $this->template_name = get_post_meta($front_page_id, '_wp_page_template', true);
                    }
                } else {
                    // Site is displaying latest posts, set placeholder post ID
                    $this->post_id = Miruni_Post_ID_Placeholder::LATEST_POSTS;
                    $this->post_title = get_bloginfo('name');
                    $this->post_content = '';

                    $is_block_theme = function_exists('wp_is_block_theme') && wp_is_block_theme();

                    if ($is_block_theme) {
                        // For block themes like Twenty Twenty-Four
                        if (file_exists(get_template_directory() . '/templates/front-page.html')) {
                            $this->template_name = 'templates/front-page.html';
                        } elseif (file_exists(get_template_directory() . '/templates/home.html')) {
                            $this->template_name = 'templates/home.html';
                        } elseif (file_exists(get_template_directory() . '/templates/index.html')) {
                            $this->template_name = 'templates/index.html';
                        } else {
                            // Generic template name for block themes
                            $this->template_name = 'site-editor-template';
                        }
                    } else {
                        // Traditional themes
                        if (file_exists(get_template_directory() . '/front-page.php')) {
                            $this->template_name = 'front-page.php';
                        } elseif (file_exists(get_template_directory() . '/home.php')) {
                            $this->template_name = 'home.php';
                        } else {
                            $this->template_name = 'index.php';
                        }
                    }
                }
            } else {
                $this->template_name = null;
            }
            return;
        }

        $this->post_id = $this->post instanceof WP_Post ? $this->post->ID : ($this->post['ID'] ?? null);
        $this->post_title = $this->post instanceof WP_Post ? $this->post->post_title : ($this->post['post_title'] ?? '');
        $this->post_content = $this->post instanceof WP_Post ? $this->post->post_content : ($this->post['post_content'] ?? '');
        $this->template_name = $this->post instanceof WP_Post ? get_page_template_slug($this->post->ID) : ($this->post['page_template'] ?? '');
        $this->is_home_page = is_home() || is_front_page();
    }

    /**
     * Get page information as an array
     * 
     * @return array|null Page information or null if no valid post
     * @phpstan-ignore missingType.iterableValue
     */
    abstract public function get_page_info(): ?array;



    /**
     * Get related templates for the current page
     * 
     * @return array<string> Related templates
     */
    protected function get_related_templates(): array
    {
        return \Miruni_Template_Dependency_Tracker::get_related_templates_for_current_page();
    }

    /**
     * Extract theme mod keys from templates
     * 
     * @param array<string> $templates List of templates
     * @return array<string> Theme mod keys
     */
    protected function get_theme_mod_keys(array $templates): array
    {
        $all_theme_mod_keys = [];
        foreach ($templates as $template) {
            $template_contents = \Miruni_Theme_Manager::get_template_file_contents($template);
            $theme_mod_keys = $this->extract_theme_mod_keys($template_contents);
            $all_theme_mod_keys = array_merge($all_theme_mod_keys, $theme_mod_keys);
        }

        return array_unique($all_theme_mod_keys);
    }

    /**
     * Extract theme mod keys from file content
     * 
     * @param string $file_content File content
     * @return array<string> Theme mod keys
     */
    protected function extract_theme_mod_keys($file_content): array
    {
        $theme_mod_keys = [];
        $pattern = "/get_theme_mod\(\s*['\"]([^'\"]+)['\"]/";

        preg_match_all($pattern, $file_content, $matches);

        if (!empty($matches[1])) {
            $theme_mod_keys = array_unique($matches[1]);
            sort($theme_mod_keys);
        }

        return $theme_mod_keys;
    }

    /**
     * Format content info for related posts
     * 
     * @param array<WP_Post|mixed> $related_posts Related posts
     * @return array{
     *  id: int,
     *  title: string,
     *  type: string,
     *  status: string,
     *  modified: string,
     *  categories: array<string>,
     *  content: string,
     * } Formatted content info
     */
    protected function format_content_info(array $related_posts): array
    {
        // @phpstan-ignore return.type
        return array_map(function ($item): array {
            $id = $item instanceof WP_Post ? $item->ID : ($item['ID'] ?? 0);
            $title = $item instanceof WP_Post ? $item->post_title : ($item['post_title'] ?? '');
            $type = $item instanceof WP_Post ? $item->post_type : ($item['post_type'] ?? '');
            $status = $item instanceof WP_Post ? $item->post_status : ($item['post_status'] ?? '');
            $modified = $item instanceof WP_Post ? $item->post_modified : ($item['post_modified'] ?? '');
            $content = $item instanceof WP_Post ? $item->post_content : ($item['post_content'] ?? '');

            $categories = get_the_category($id);
            $cat_names = array_map(function ($cat) {
                return $cat->name;
            }, $categories);

            $url = get_permalink($id);
            if ($url === false) {
                $url = '';
            }

            return array(
                'id' => $id,
                'title' => $title,
                'type' => $type,
                'status' => $status,
                'modified' => $modified,
                'categories' => $cat_names,
                'url' => $url,
                'content' => $content
            );
        }, $related_posts);
    }

    protected function get_wp_option(string $option_name, mixed $default = null): mixed
    {
        return get_option($option_name, $default);
    }

    /**
     * Summary of get_options
     * @return array<string, mixed> Options
     */
    protected function get_options(): array
    {
        $options = [];
        foreach ($this->default_option_keys as $key) {
            $options[$key] = $this->get_wp_option($key);
        }

        return $options;
    }


}
