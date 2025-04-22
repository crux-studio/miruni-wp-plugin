<?php
// filepath: /Users/davidcook/clients/crux/miruni/apps/wordpress/src/php/src/miruni-update-utils.php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

/**
 * Enum for Miruni update file types.
 */
enum MiruniFileType: string
{
    case THEME = 'theme';
    case POST_TITLE = 'post_title';
    case POST = 'post';
    case POST_CONTENT = 'post_content';
    case OTHER_POST_TITLE = 'other_post_title';
    case OTHER_POST_CONTENT = 'other_post_content';
    case OTHER_POST_EXCERPT = 'other_post_excerpt';
    case THEME_MOD = 'theme_mod';
    case ELEMENTOR_JSON = 'elementor_json';
    case MENU_ITEM_NAME = 'menu_item_name';
    case MENU_ITEM_PARENT = 'menu_item_parent';
    case MENU_ITEM_URL = 'menu_item_url';
    case MENU_ITEM_OBJECT_ID = 'menu_item_object_id';
    case MENU_ITEM_OBJECT = 'menu_item_object';
    case BLOCK_TEMPLATE = 'block_template';
    case WP_OPTION = 'wp_option'; // Added WP_OPTION based on usage in draft-manager
}

/**
 * Decodes, validates, and sanitizes an array of update objects from a JSON string.
 *
 * Note: The 'updatedFileContent' field is NOT sanitized here as it requires
 * context-specific sanitization (e.g., wp_kses_post, sanitize_text_field)
 * based on the 'fileType'. This should be handled where the content is used.
 *
 * @param string|null $json_string The raw JSON string from the request.
 * @return list<array{
 *   id: int,
 *   fileType: MiruniFileType,
 *   updatedFileContent: string,
 *   fileIdentifier: string,
 *   updateSummary: string
 * }> The sanitized array of update objects.
 * @phpstan-return list<array{id: int, fileType: MiruniFileType, updatedFileContent: string, fileIdentifier: string, updateSummary: string}>
 * @throws Exception If JSON is invalid, not an array, or items have incorrect structure/types.
 */
function miruni_sanitize_update_json(?string $json_string): array
{
    if ($json_string === null) {
        throw new Exception('Updates data is missing.');
    }

    // 1. Unslash (WordPress often adds slashes)
    $raw_updates = wp_unslash($json_string);

    // 2. Decode
    $updates = json_decode($raw_updates, true);

    // if updates is not a list, make it a list
    if (!array_is_list($updates)) {
        $updates = [$updates];
    }
    // 3. Validate JSON decoding
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON provided for updates. Error: ' . json_last_error_msg());
    }

    // 4. Validate it's an array
    // @phpstan-ignore function.alreadyNarrowedType
    if (!is_array($updates)) {
        throw new Exception('Updates must be a valid JSON array - received type: ' . gettype($updates));
    }

    $sanitized_updates = [];
    foreach ($updates as $index => $update) {
        // 5. Validate each item is an array
        if (!is_array($update)) {
            throw new Exception("Invalid update item at index {$index}: Expected array, got " . gettype($update));
        }

        // 6. Validate required keys exist (basic check)
        $required_keys = ['id', 'fileType', 'updatedFileContent', 'fileIdentifier', 'updateSummary'];
        foreach ($required_keys as $key) {
            if (!array_key_exists($key, $update)) {
                throw new Exception("Invalid update item at index {$index}: Missing required key '{$key}'");
            }
        }

        // 7. Sanitize individual fields (except updatedFileContent)
        $fileTypeValue = sanitize_key($update['fileType']);
        $fileTypeEnum = MiruniFileType::tryFrom($fileTypeValue);

        if ($fileTypeEnum === null) {
            throw new Exception("Invalid update item at index {$index}: Invalid fileType '{$fileTypeValue}'");
        }

        $sanitized_update = [
            'id' => absint($update['id']),
            'fileType' => $fileTypeEnum,
            'updatedFileContent' => $update['updatedFileContent'], // Pass through raw - sanitize later!
            'fileIdentifier' => sanitize_text_field($update['fileIdentifier']),
            'updateSummary' => sanitize_text_field($update['updateSummary']),
        ];

        // No need for the in_array check anymore, tryFrom handles it

        $sanitized_updates[] = $sanitized_update;
    }

    return $sanitized_updates;
}
