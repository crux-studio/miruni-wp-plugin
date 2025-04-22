<?php

namespace Miruni;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


/**
 * File Loader for Miruni plugin
 */
class Miruni_File_Loader
{
    private static ?Miruni_File_Loader $instance = null;
    /** @var array<string,bool> */
    private array $loaded_files = [];
    /** @var array<string, array{
     *  path: string,
     *  dependencies: array<string>
     * }> */
    private array $dependencies = [];

    /**
     * Get singleton instance
     */
    public static function get_instance(): Miruni_File_Loader
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Register file with dependencies
     * @param string $name Name of the file
     * @param string $path Path to the file
     * @param array<string> $dependencies List of dependencies
     */
    public function register(string $name, string $path, array $dependencies = []): void
    {
        $this->dependencies[$name] = [
            'path' => $path,
            'dependencies' => $dependencies
        ];
    }

    /**
     * Load a specific file and its dependencies
     */
    public function load(string $name): bool
    {
        // Already loaded
        if (isset($this->loaded_files[$name])) {
            return true;
        }

        // File doesn't exist
        if (!isset($this->dependencies[$name])) {
            return false;
        }

        // Load dependencies first
        foreach ($this->dependencies[$name]['dependencies'] as $dependency) {
            $this->load($dependency);
        }

        // Load the file
        $path = plugin_dir_path(__FILE__) . $this->dependencies[$name]['path'];
        if (file_exists($path)) {
            require_once $path;
            $this->loaded_files[$name] = true;
            return true;
        }

        return false;
    }

    /**
     * Load all files in a directory
     */
    public function load_directory(string $dir_path, bool $recursive = false): void
    {
        $dir = plugin_dir_path(__FILE__) . $dir_path;
        if (!is_dir($dir)) {
            return;
        }

        $files = scandir($dir);
        if (!$files) {
            return;
        }
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }

            $full_path = $dir . '/' . $file;
            if (is_dir($full_path) && $recursive) {
                $this->load_directory($dir_path . '/' . $file, true);
            } else if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
                require_once $full_path;
            }
        }
    }

    /**
     * Load all registered files with dependencies resolved
     */
    public function load_all(): void
    {
        foreach (array_keys($this->dependencies) as $name) {
            $this->load($name);
        }
    }
}
