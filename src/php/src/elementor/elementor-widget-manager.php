<?php

namespace Miruni\Elementor;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Miruni_Elementor_Widget_Manager
{
    public static function get_widget_by_name(string $widget_name): ?\Elementor\Widget_Base
    {
        $widgets_manager = \Elementor\Plugin::instance()->widgets_manager;
        $widget = $widgets_manager->get_widget_types($widget_name);

        if ($widget && is_object($widget)) {
            return $widget;
        }

        return null;
    }

    /**
     * @return \ReflectionClass<\Elementor\Widget_Base>|null
     */
    public static function get_widget_parent(\Elementor\Widget_Base $widget): ?\ReflectionClass
    {
        $reflection = new \ReflectionClass($widget);
        $parent = $reflection->getParentClass();
        if ($parent) {
            return $parent;
        }

        return null;
    }

    public static function get_widget_class(\Elementor\Widget_Base $widget): ?string
    {
        // Get the class name of the widget
        $class_name = get_class($widget);
        if ($class_name) {
            return $class_name;
        }

        return null;
    }

    public static function get_widget_file_contents(\Elementor\Widget_Base $widget): ?string
    {
        $reflection = new \ReflectionClass($widget);
        $file_name = $reflection->getFileName();

        if ($file_name) {
            $file_content = file_get_contents($file_name);
            if ($file_content) {
                return $file_content;
            }
        }

        return null;
    }

    /**
     * Get the widgets used in an Elementor data structure
     * @param array<mixed>|string $elementor_data
     * @return array<int, array{widget_name: string, widget_class: string}>
     */
    public static function get_widgets_from_elementor_data(string|array $elementor_data): array
    {
        $widgets = [];

        // If we have a string, try to decode it as JSON
        if (is_string($elementor_data)) {
            $decoded_data = json_decode($elementor_data, true);
            if (!is_array($decoded_data)) {
                // Log error or handle the case when json_decode fails or doesn't return an array
                return $widgets;
            }
            $elementor_data = $decoded_data;
        }

        // Ensure we have an array at this point
        // @phpstan-ignore function.alreadyNarrowedType
        if (!is_array($elementor_data)) {
            return $widgets;
        }

        // Pass the data to our recursive function
        self::find_widgets_recursive($elementor_data, $widgets);

        return $widgets;
    }

    /**
     * Recursively searches for widgets in the Elementor data structure
     * 
     * @param array<mixed> $elements The elements to search through
     * @param array{widget_name: string, widget_class: string}[] $widgets Reference to the widgets collection
     * @param-out array{widget_name: string, widget_class: string}[] $widgets Updated widgets collection
     * 
     */
    private static function find_widgets_recursive(array $elements, array &$widgets): void
    {
        // @phpstan-ignore function.alreadyNarrowedType
        if (!is_array($elements)) {
            return;
        }

        // If it's a sequential array, process each element
        if (isset($elements[0])) {
            foreach ($elements as $element) {
                self::find_widgets_recursive($element, $widgets);
            }
            return;
        }

        // Check if this is a widget
        if (isset($elements['elType']) && $elements['elType'] === 'widget' && isset($elements['widgetType'])) {
            $widget_name = (string) $elements['widgetType'];
            $widget = self::get_widget_by_name($widget_name);
            if (!$widget) {
                return;
            }
            $widget_class = self::get_widget_class($widget);
            $file_content = self::get_widget_file_contents($widget);

            if ($widget_class) {
                $widgets[] = [
                    'widget_name' => $widget_name,
                    'widget_class' => $widget_class,
                    'file_content' => $file_content
                ];
            }
        }

        // Process child elements if they exist
        if (isset($elements['elements']) && is_array($elements['elements'])) {
            foreach ($elements['elements'] as $child_element) {
                self::find_widgets_recursive($child_element, $widgets);
            }
        }
    }
}
