<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Miruni_DB_Table_Manager
{
    private const TABLE_SETTINGS = 'miruni_settings';

    private static function get_prefixed_table_name(string $table_name): string
    {
        global $wpdb;

        if (!$wpdb) {
            throw new Exception('$wpdb is not defined');
        }

        return $wpdb->prefix . $table_name;
    }

    public static function get_settings_table(): string
    {
        return self::get_prefixed_table_name(self::TABLE_SETTINGS);
    }
}