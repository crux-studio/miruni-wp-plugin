<?php

namespace Miruni\Elementor;
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Miruni_Elementor_Service
{
    /**
     * returns the _elementor_data post meta for a given post
     * @param int $post_id
     * @return mixed
     */
    public static function get_page_data(int $post_id)
    {
        $data = get_post_meta($post_id, '_elementor_data', true);
        return $data;
    }

    /**
     * updates the _elementor_data post meta for a given post
     * Always saves in JSON format
     * @param int $post_id
     * @param string|array $modified_data JSON string or PHP array
     * @return bool True on success, false on failure
     * @phpstan-ignore missingType.iterableValue
     */
    public static function update_page_data(int $post_id, string|array $modified_data): bool
    {
        try {
            error_log("update_page_data called type: " . gettype($modified_data));
            $json_to_save = null;

            if (is_string($modified_data)) {
                // Assume the string is already valid JSON prepared by the caller
                // Add a basic check just in case
                $decoded = json_decode($modified_data); // Check if it's valid JSON
                if (json_last_error() !== JSON_ERROR_NONE) {
                    // Decide how to handle: throw exception, return false, or try to save anyway?
                    // For now, let's try saving it as is, but log the error.
                    error_log("Invalid JSON string provided: " . json_last_error_msg());
                    return false;
                } else {
                    // It's a valid JSON string, save it directly.
                    $json_to_save = $decoded;
                }

                // @phpstan-ignore function.alreadyNarrowedType
            } elseif (is_array($modified_data)) {
                // If it's an array, encode it.
                wp_json_encode($modified_data, JSON_UNESCAPED_UNICODE);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    // Handle the error: log it, throw an exception, etc.
                    // For now, let's just return false.
                    return false;
                }
                $json_to_save = $modified_data;
            } else {
                return false; // Invalid input type
            }

            error_log("update_page_data json_to_save type " . gettype($json_to_save));

            // Save the potentially slashed JSON string.
            $update_result = update_post_meta($post_id, '_elementor_data', $json_to_save);

            if ($update_result === false) {
                return false;
            }
            // Elementor often needs its cache cleared after data changes
            self::delete_element_cache($post_id);
            return true;

        } catch (\Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Miruni_Elementor_Service.update_page_data',
                'operation' => "Updating post meta for post_id: $post_id",
                'user_id' => get_current_user_id()
            ]);
            return false;
        }
    }

    public static function delete_element_cache(int $post_id): void
    {
        try {
            delete_post_meta($post_id, '_elementor_element_cache');
        } catch (\Exception $e) {
            do_action('my_plugin_error', $e, [
                'context' => 'Miruni_Elementor_Service.delete_element_cache',
                'operation' => "Deleting post meta for post_id: $post_id",
                'user_id' => get_current_user_id() // Optional: add user context
            ]);
        }
    }
}