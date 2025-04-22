<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Miruni_Theme_Manager
{

    /**
     * Get all template files from the current theme
     *
     * @return array<string> Array of template file paths relative to the theme directory
     */
    public static function get_template_files(): array
    {
        $template_files = [];
        $theme_dir = get_template_directory();

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($theme_dir)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $relative_path = str_replace($theme_dir . '/', '', $file->getPathname());
                $template_files[] = $relative_path;
            }
        }

        return $template_files;
    }

    public static function get_template_file_contents(string $file_name): string
    {
        try {
            // Check if file_name is an absolute path
            if (strpos($file_name, '/') === 0 || preg_match('~^[A-Z]:[\\\\/]~i', $file_name)) {
                // It's an absolute path, use it directly
                $file_path = $file_name;
            } else {
                // It's a relative path, join with theme directory properly
                $theme_dir = get_template_directory();
                $file_path = rtrim($theme_dir, '/') . '/' . ltrim($file_name, '/');
            }

            $contents = file_get_contents($file_path);
            if ($contents === false) {
                return "";
            }
            return $contents;
        } catch (Exception $e) {
            // Handle the exception as needed
            return "";
        }

    }




}