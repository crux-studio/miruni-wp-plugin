<?php

namespace Miruni\PageInfo;

use Miruni\Elementor\Miruni_Elementor_Service;
use Miruni\Elementor\Miruni_Elementor_Widget_Manager;
use Miruni\Miruni_Post_ID_Placeholder;

class Miruni_Elementor_Page_Info extends Miruni_Page_Info_Base
{
    /**
     * Get page information for Elementor pages
     * 
     * @return array{
     *  post_id: int,
     *  post_title: string,
     *  content: string,
     *  theme_mods: \stdClass,
     *  related_templates: array<int, mixed>,
     *  elementor_data: mixed,
     *  is_home_page: bool
     * }|null Page information or null if no valid post
     */
    public function get_page_info(): ?array
    {
        // Check for either a regular post ID or the latest posts placeholder
        if (
            (!$this->post_id) ||
            !$this->post_title
        ) {
            return null;
        }

        $related_templates = $this->get_related_templates();

        // Get theme mods
        $all_theme_mod_keys = $this->get_theme_mod_keys($related_templates);
        $theme_mods = new \stdClass();
        foreach ($all_theme_mod_keys as $key) {
            $theme_mods->$key = get_theme_mod($key);
        }

        // Include Elementor-specific data
        $elementor_data = null;
        $widgets = [];
        $widget_names = [];

        // Only try to get Elementor data for actual posts, not our placeholder
        if ($this->post_id !== Miruni_Post_ID_Placeholder::LATEST_POSTS) {
            $elementor_data = Miruni_Elementor_Service::get_page_data($this->post_id);
            $widgets = Miruni_Elementor_Widget_Manager::get_widgets_from_elementor_data($elementor_data);
            $widget_names = array_map(function ($widget) {
                $_widget = Miruni_Elementor_Widget_Manager::get_widget_by_name($widget["widget_name"]);
                return $_widget ? Miruni_Elementor_Widget_Manager::get_widget_class($_widget) : null;
            }, $widgets);
        }

        $options = $this->get_options();

        return array(
            'post_id' => $this->post_id,
            'post_title' => $this->post_title,
            'is_home_page' => $this->is_home_page,
            'is_latest_posts' => $this->post_id === Miruni_Post_ID_Placeholder::LATEST_POSTS,
            'content' => $this->post_content ?? "",
            'theme_mods' => $theme_mods,
            'related_templates' => $related_templates,
            'elementor_data' => $elementor_data,
            'elementor_widgets' => $widget_names,
            "widgets" => $widgets,
            "options" => $options
        );
    }
}
