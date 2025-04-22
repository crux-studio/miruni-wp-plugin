<?php

namespace Miruni\PageInfo;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Miruni_Page_Info_Factory
{
    /**
     * Create and return the appropriate page info implementation
     * 
     * @param mixed $post Post object or null to use current post
     * @return Miruni_Page_Info_Base Page info implementation
     */
    public static function create($post = null)
    {
        // If no post provided, try to determine the correct post
        if ($post === null) {
            // Handle front page specifically
            if (is_front_page()) {
                $front_page_id = (int) get_option('page_on_front');
                if ($front_page_id > 0) {
                    $post = get_post($front_page_id);
                }
            } else {
                // Normal case - use the global post
                $post = get_post();
            }
        }

        if (self::is_elementor_page($post)) {
            return new Miruni_Elementor_Page_Info($post);
        }

        return new Miruni_WordPress_Page_Info($post);
    }
    /**
     * Check if the post is an Elementor page
     * 
     * @param mixed $post Post object
     * @return bool True if it's an Elementor page
     */
    protected static function is_elementor_page($post): bool
    {
        if (!$post) {
            return false;
        }

        $post_id = $post instanceof \WP_Post ? $post->ID : ($post['ID'] ?? null);

        if (!$post_id) {
            return false;
        }

        // Check if Elementor is active and if this is an Elementor-edited page
        if (class_exists('\Elementor\Plugin')) {
            // @phpstan-ignore class.notFound
            $document = \Elementor\Plugin::$instance->documents->get($post_id);
            if ($document) {
                return $document->is_built_with_elementor();
            }
        }

        // Fallback: check for Elementor-specific meta
        return !empty(get_post_meta($post_id, '_elementor_data', true));
    }
}
