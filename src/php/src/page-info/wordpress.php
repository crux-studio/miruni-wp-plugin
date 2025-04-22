<?php

namespace Miruni\PageInfo;

use Miruni\Miruni_Post_ID_Placeholder;

class Miruni_WordPress_Page_Info extends Miruni_Page_Info_Base
{
    /**
     * Get page information for vanilla WordPress
     * 
     * @return array<mixed>|null Page information or null if no valid post
     */
    public function get_page_info(): ?array
    {
        // Check for either a regular post ID or the latest posts placeholder
        if (!$this->post_id) {
            return null;
        }

        $related_templates = $this->get_related_templates();
        $options = $this->get_options();

        $all_theme_mod_keys = $this->get_theme_mod_keys($related_templates);
        $theme_mods = new \stdClass();
        foreach ($all_theme_mod_keys as $key) {
            $theme_mods->$key = get_theme_mod($key);
        }

        return array(
            'post_id' => $this->post_id,
            'post_title' => $this->post_title,
            'content' => $this->post_content,
            'theme_mods' => $theme_mods,
            'related_templates' => $related_templates,
            'options' => $options,
            'is_home_page' => $this->is_home_page,
            'is_latest_posts' => $this->post_id === Miruni_Post_ID_Placeholder::LATEST_POSTS,
        );
    }
}
