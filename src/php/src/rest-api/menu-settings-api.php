<?php

namespace Miruni\RestApi;


use WP_Error;
use WP_REST_Response;



// Initialize the global variable
global $wp_query_parameters;
if (!isset($wp_query_parameters)) {
    $wp_query_parameters = [];
}

class Miruni_Menu_Settings_API extends Miruni_BaseAPI
{
    // Add a static flag to track when we're in capture mode

    public static string $namespace = 'miruni/v1';
    public static string $route = '/menu_settings/';

    public static function get_rest_url(int $page_id): string
    {
        return self::_get_rest_url(['page_id' => $page_id]);
    }

    public static function setup(): void
    {

        // Register REST API endpoint
        add_action('rest_api_init', function () {
            error_log("registering rest api endpoint");
            // Original endpoint
            register_rest_route(self::$namespace, self::$route, [
                'methods' => 'GET',
                'callback' => [__CLASS__, 'get_menus_data'],
                'permission_callback' => [__CLASS__, 'snippet_secret_required_permission_callback'],
                'args' => [
                    'page_id' => [
                        'required' => false,
                        'sanitize_callback' => 'absint',
                    ],
                    'path' => [
                        'required' => false,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ]);
        });
    }
    /**
     * Capture and return all menus on the site with their items in JSON format
     * @param \WP_REST_Request<array<mixed>> $request
     * @return WP_Error|WP_REST_Response
     */
    public static function get_menus_data(\WP_REST_Request $request): WP_Error|WP_REST_Response
    {
        // Get all menu locations
        $locations = get_nav_menu_locations();

        // Get all registered menus
        $all_menus = wp_get_nav_menus();

        if (empty($all_menus)) {
            return new WP_Error('no_menus', 'No menus found', ['status' => 404]);
        }

        $menus_data = [];

        // Process each menu
        foreach ($all_menus as $menu) {
            // Get menu items
            $menu_items_raw = wp_get_nav_menu_items($menu->term_id);
            $menu_items = [];

            if ($menu_items_raw) {
                foreach ($menu_items_raw as $item) {
                    // Fetch required meta data for each item
                    $item->_menu_item_type = get_post_meta($item->ID, '_menu_item_type', true);
                    $item->_menu_item_menu_item_parent = get_post_meta($item->ID, '_menu_item_menu_item_parent', true);
                    $item->_menu_item_object_id = get_post_meta($item->ID, '_menu_item_object_id', true);
                    $item->_menu_item_object = get_post_meta($item->ID, '_menu_item_object', true);
                    $item->_menu_item_target = get_post_meta($item->ID, '_menu_item_target', true);
                    $item->_menu_item_classes = get_post_meta($item->ID, '_menu_item_classes', true);
                    $item->_menu_item_xfn = get_post_meta($item->ID, '_menu_item_xfn', true);
                    $item->_menu_item_url = get_post_meta($item->ID, '_menu_item_url', true);
                    $menu_items[] = $item;
                }
            }


            // Find locations that use this menu
            $menu_locations = [];
            foreach ($locations as $location => $menu_id) {
                if ($menu_id === $menu->term_id) {
                    $menu_locations[] = $location;
                }
            }

            // Build menu data structure
            $menus_data[] = [
                'id' => $menu->term_id,
                'name' => $menu->name,
                'slug' => $menu->slug,
                'locations' => $menu_locations,
                'items' => $menu_items // Use the processed items with meta data
            ];
        }

        return new WP_REST_Response($menus_data, 200);
    }


}
