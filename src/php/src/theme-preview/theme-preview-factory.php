<?php

namespace Miruni\ThemePreview;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Factory class for creating theme preview managers based on the active plugins/theme
 */
class Miruni_Theme_Preview_Factory
{
    /**
     * Create and return the appropriate theme preview manager
     * 
     * @return Miruni_Theme_Preview_Manager The theme preview manager instance
     */
    public static function create(): Miruni_Theme_Preview_Manager
    {

        // Check if Elementor is active and the post uses Elementor
        if (self::is_elementor_active() && self::is_elementor_post()) {
            return new Miruni_Elementor_Theme_Preview_Manager();
        }

        // Add additional checks for other page builders here
        // For example: Beaver Builder, Divi, etc.

        // Default to the standard theme preview manager
        return new Miruni_Theme_Preview_Manager();
    }

    /**
     * Check if Elementor is active
     * 
     * @return bool True if Elementor is active
     */
    private static function is_elementor_active(): bool
    {

        return defined('ELEMENTOR_VERSION') || class_exists('Elementor\Plugin');
    }

    /**
     * Check if the current post was built with Elementor
     * 
     * @return bool True if the post has Elementor edit mode set to 'builder'
     */
    private static function is_elementor_post(): bool
    {
        $post_id = get_the_ID();


        if (!$post_id) {
            return false;
        }

        $edit_mode = get_post_meta($post_id, '_elementor_edit_mode', true);
        return $edit_mode === 'builder';
    }

    public static function maybe_use_preview_theme(): void
    {
        $preview_manager = self::create();
        $preview_manager->maybe_use_preview_theme();
    }

    public static function register_maybe_use_preview_theme(): void
    {
        add_action('wp', array(self::class, 'maybe_use_preview_theme'));
    }

    /**
     * Initialize the preview system
     */
    public static function init_preview_system(): void
    {
        $preview_manager = self::create();
        $preview_manager->init_preview_system();
    }

    /**
     * Register the initialization action
     */
    public static function register_init_preview_system(): void
    {
        add_action('init', array(self::class, 'init_preview_system'));
    }
}
