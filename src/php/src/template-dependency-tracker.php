<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly
require_once plugin_dir_path(__FILE__) . 'theme-manager.php';
/**
 * Template Dependency Tracker
 * Extends Miruni_Theme_Manager to track relationships between template files
 */
class Miruni_Template_Dependency_Tracker extends Miruni_Theme_Manager
{

    /**
     * Store template dependencies (includes, parts, patterns)
     * @var array<string, array<string>> Associative array of template dependencies
     */
    private static $dependencies_cache = [];

    /**
     * Get all template files (parts/patterns) related to the current page
     *
     * @return array<string> Array of related template file paths
     */
    public static function get_related_templates_for_current_page(): array
    {
        // Get the current template file being used
        $current_template = get_page_template();

        // If we're not on a template or it's not available
        if (empty($current_template)) {
            // Try to determine based on WordPress conditionals
            $current_template = self::determine_current_template();
        }

        // Extract template name from full path
        $theme_dir = get_template_directory();
        $template_name = str_replace($theme_dir . '/', '', $current_template);

        // Get all templates related to this one (including nested dependencies)
        return self::get_template_dependencies($template_name);
    }

    /**
     * Determines the current template based on WordPress conditionals
     *
     * @return string Best guess at the current template file path
     */
    private static function determine_current_template(): string
    {
        $theme_dir = get_template_directory();

        // Check common template scenarios
        if (is_single()) {
            return $theme_dir . '/single.php';
        } elseif (is_page()) {
            return $theme_dir . '/page.php';
        } elseif (is_archive()) {
            return $theme_dir . '/archive.php';
        } elseif (is_home()) {
            return $theme_dir . '/home.php';
        } elseif (is_search()) {
            return $theme_dir . '/search.php';
        } elseif (is_404()) {
            return $theme_dir . '/404.php';
        }

        // Default to index.php if nothing else matches
        return $theme_dir . '/index.php';
    }

    /**
     * Get all templates that are included by a given template
     * This includes get_template_part(), get_header(), get_footer(), include, require, etc.
     *
     * @param string $template_name Template file name relative to theme directory
     * @param array<string> $visited_templates Optional array of already visited templates to prevent infinite recursion
     * @return array<string> Array of template file paths that are included
     */
    public static function get_template_dependencies(string $template_name, array $visited_templates = []): array
    {
        // Use cache if available
        if (isset(self::$dependencies_cache[$template_name])) {
            return self::$dependencies_cache[$template_name];
        }

        // Prevent infinite recursion
        if (in_array($template_name, $visited_templates)) {
            return [];
        }

        // Add this template to visited list
        $visited_templates[] = $template_name;

        try {
            // Get the template file contents
            $content = self::get_template_file_contents($template_name);

            // Initialize dependencies array with this template
            $dependencies = [$template_name];

            // Find all get_template_part() calls
            self::extract_template_parts($content, $dependencies, $visited_templates);

            // Find get_header() and get_footer() calls
            self::extract_header_footer($content, $dependencies, $visited_templates);

            // Find other include/require statements
            self::extract_includes_requires($content, $dependencies, $visited_templates);

            // Find block template parts
            self::extract_block_template_parts($content, $dependencies, $visited_templates);

            // Cache the result
            self::$dependencies_cache[$template_name] = array_unique($dependencies);

            return self::$dependencies_cache[$template_name];
        } catch (Exception $e) {
            error_log('Error getting template dependencies for ' . $template_name . ': ' . $e->getMessage());
            return [$template_name];
        }
    }

    /**
     * Extract template parts from content
     *
     * @param string $content Template content
     * @param array<string> &$dependencies Array to store dependencies
     * @param array<string> $visited_templates Array of already visited templates
     */
    private static function extract_template_parts(string $content, array &$dependencies, array $visited_templates): void
    {
        // Match get_template_part() calls
        $pattern = '/get_template_part\s*\(\s*[\'"]([^\'"]+)[\'"](?:\s*,\s*[\'"]([^\'"]+)[\'"])?\s*\)/';
        preg_match_all($pattern, $content, $matches);

        if (!empty($matches[1])) {
            foreach ($matches[1] as $i => $slug) {
                $name = !empty($matches[2][$i]) ? $matches[2][$i] : '';

                // Build possible filenames for the template part
                $possible_files = [
                    'template-parts/' . $slug . '-' . $name . '.php',
                    'template-parts/' . $slug . '/' . $name . '.php',
                    'parts/' . $slug . '-' . $name . '.php',
                    'parts/' . $slug . '/' . $name . '.php',
                    $slug . '-' . $name . '.php',
                    $slug . '/' . $name . '.php',
                ];

                if (empty($name)) {
                    $possible_files[] = 'template-parts/' . $slug . '.php';
                    $possible_files[] = 'parts/' . $slug . '.php';
                    $possible_files[] = $slug . '.php';
                }

                // Check each possible file
                foreach ($possible_files as $file) {
                    try {
                        if (file_exists(get_template_directory() . '/' . $file)) {
                            $dependencies[] = $file;

                            // Recursively get this template's dependencies
                            $sub_dependencies = self::get_template_dependencies($file, $visited_templates);
                            $dependencies = array_merge($dependencies, $sub_dependencies);

                            // Only process the first matching file
                            break;
                        }
                    } catch (Exception $e) {
                        continue;
                    }
                }
            }
        }
    }

    /**
     * Extract header and footer includes
     *
     * @param string $content Template content
     * @param array<string> &$dependencies Array to store dependencies
     * @param array<string> $visited_templates Array of already visited templates
     */
    private static function extract_header_footer(string $content, array &$dependencies, array $visited_templates): void
    {
        // Match get_header() calls
        if (preg_match('/get_header\s*\((?:\s*[\'"]([^\'"]+)[\'"])?\s*\)/', $content, $matches)) {
            $header_file = !empty($matches[1]) ? 'header-' . $matches[1] . '.php' : 'header.php';

            if (file_exists(get_template_directory() . '/' . $header_file)) {
                $dependencies[] = $header_file;

                // Recursively get header's dependencies
                $sub_dependencies = self::get_template_dependencies($header_file, $visited_templates);
                $dependencies = array_merge($dependencies, $sub_dependencies);
            }
        }

        // Match get_footer() calls
        if (preg_match('/get_footer\s*\((?:\s*[\'"]([^\'"]+)[\'"])?\s*\)/', $content, $matches)) {
            $footer_file = !empty($matches[1]) ? 'footer-' . $matches[1] . '.php' : 'footer.php';

            if (file_exists(get_template_directory() . '/' . $footer_file)) {
                $dependencies[] = $footer_file;

                // Recursively get footer's dependencies
                $sub_dependencies = self::get_template_dependencies($footer_file, $visited_templates);
                $dependencies = array_merge($dependencies, $sub_dependencies);
            }
        }
    }

    /**
     * Extract include and require statements
     *
     * @param string $content Template content
     * @param array<string> &$dependencies Array to store dependencies
     * @param array<string> $visited_templates Array of already visited templates
     */
    private static function extract_includes_requires(string $content, array &$dependencies, array $visited_templates): void
    {
        // Match include and require statements
        $pattern = '/(include|require|include_once|require_once)\s*\(\s*(?:get_template_directory\(\)\s*\.\s*)?[\'"]([^\'"]+)[\'"](?:\s*\.\s*[\'"]([^\'"]+)[\'"])?\s*\)/';
        preg_match_all($pattern, $content, $matches);

        if (!empty($matches[2])) {
            foreach ($matches[2] as $i => $path) {
                // Handle paths that might have been split across concatenations
                if (isset($matches[3][$i]) && !empty($matches[3][$i])) {
                    $path .= $matches[3][$i];
                }

                // Clean up the path to get the relative path from theme directory
                $path = (preg_replace('/^\//', '', $path) ?? $path);

                if (file_exists(get_template_directory() . '/' . $path)) {
                    $dependencies[] = $path;

                    // Recursively get included file's dependencies
                    $sub_dependencies = self::get_template_dependencies($path, $visited_templates);
                    $dependencies = array_merge($dependencies, $sub_dependencies);
                }
            }
        }
    }

    /**
     * Extract block template parts
     *
     * @param string $content Template content
     * @param array<string> &$dependencies Array to store dependencies
     * @param array<string> $visited_templates Array of already visited templates
     */
    private static function extract_block_template_parts(string $content, array &$dependencies, array $visited_templates): void
    {
        // Check for block template part references
        $pattern = '/<!-- wp:template-part\s+\{[^}]*"slug":"([^"]+)"[^}]*\} -->/';
        preg_match_all($pattern, $content, $matches);

        if (!empty($matches[1])) {
            foreach ($matches[1] as $slug) {
                // Try to find the corresponding template part
                $possible_files = [
                    'parts/' . $slug . '.html',
                    'template-parts/' . $slug . '.html',
                    'block-templates/parts/' . $slug . '.html',
                    'patterns/' . $slug . '.php',
                    'block-patterns/' . $slug . '.php'
                ];

                foreach ($possible_files as $file) {
                    if (file_exists(get_template_directory() . '/' . $file)) {
                        $dependencies[] = $file;

                        // Recursively get this template's dependencies
                        $sub_dependencies = self::get_template_dependencies($file, $visited_templates);
                        $dependencies = array_merge($dependencies, $sub_dependencies);

                        // Only process the first matching file
                        break;
                    }
                }
            }
        }
    }

    /**
     * Get all theme mod keys used in templates related to the current page
     *
     * @return array<string> Array of theme mod keys
     */
    public static function get_theme_mods_for_current_page(): array
    {
        $related_templates = self::get_related_templates_for_current_page();
        $theme_mods = [];

        foreach ($related_templates as $template) {
            try {
                $content = self::get_template_file_contents($template);
                $template_theme_mods = self::extract_theme_mod_keys($content);
                $theme_mods = array_merge($theme_mods, $template_theme_mods);
            } catch (Exception $e) {
                error_log('Error extracting theme mods from ' . $template . ': ' . $e->getMessage());
                continue;
            }
        }

        return array_unique($theme_mods);
    }

    /**
     * Extract theme mod keys from template content
     *
     * @param string $content Template content
     * @return array<string> Array of theme mod keys
     */
    public static function extract_theme_mod_keys(string $content): array
    {
        $theme_mod_keys = [];

        // Regular expression to match get_theme_mod calls
        $pattern = "/get_theme_mod\(\s*['\"]([^'\"]+)['\"]/";

        // Find all matches
        preg_match_all($pattern, $content, $matches);

        if (!empty($matches[1])) {
            // Remove duplicates
            $theme_mod_keys = array_unique($matches[1]);
        }

        return $theme_mod_keys;
    }

    /**
     * Debug function to show template hierarchy
     * 
     * @param bool $include_theme_mods Whether to include theme mods in the output
     * @return array<string, mixed> Template hierarchy with optional theme mods
     */
    public static function debug_template_hierarchy(bool $include_theme_mods = false): array
    {
        $related_templates = self::get_related_templates_for_current_page();
        $result = [
            'main_template' => self::determine_current_template(),
            'related_templates' => $related_templates,
            'total_templates' => count($related_templates)
        ];

        if ($include_theme_mods) {
            $theme_mods = self::get_theme_mods_for_current_page();
            $result['theme_mods'] = $theme_mods;
            $result['total_theme_mods'] = count($theme_mods);
        }

        return $result;
    }
}