<?php

namespace Miruni;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


/**
 * Class Autoloader for Miruni plugin
 */
class Miruni_Autoloader
{
    /**
     * Register the autoloader
     */
    public static function register(): void
    {
        spl_autoload_register([self::class, 'autoload']);
    }

    /**
     * Autoload classes based on namespace
     */
    public static function autoload(string $class): void
    {
        // Base namespace for plugin
        $namespace = 'Miruni\\';

        // Only handle classes in our namespace
        if (strpos($class, $namespace) !== 0) {
            return;
        }

        // Remove namespace prefix
        $relative_class = substr($class, strlen($namespace));

        // Convert namespace to directory path (replace \ with /)
        $file = plugin_dir_path(__FILE__) . str_replace('\\', '/', $relative_class) . '.php';

        // If the file exists, require it
        if (file_exists($file)) {
            require_once $file;
        }
    }
}
