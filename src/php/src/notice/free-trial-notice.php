<?php

namespace Miruni\Notice;
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly
/**
 * Display trial notice in the WordPress admin
 */
function miruni_display_trial_notice(): void
{
    // Only show on Miruni plugin pages
    $screen = get_current_screen();
    if (!$screen || strpos($screen->id, 'miruni') === false) {
        return;
    }

    $trial_info = [
        'is_trial' => get_option('miruni_is_trial', false),
        'trial_end_date' => get_option('miruni_trial_end_date', null),
        'days_remaining' => get_option('miruni_days_remaining', 0),
    ];

    if ($trial_info['is_trial'] && !empty($trial_info['trial_end_date'])) {
        $end_date = date_i18n(get_option('date_format'), strtotime($trial_info['trial_end_date']));
        $days = max(0, $trial_info['days_remaining']);

        echo '<div class="notice notice-info is-dismissible">';
        echo '<p><strong>Miruni Free Trial</strong> - Your trial ends on ' . esc_html($end_date);

        if ($days <= 7) {
            echo ' <span style="color: #d63638;">(' . esc_html($days) . ' days remaining)</span>';
        } else {
            echo ' (' . esc_html($days) . ' days remaining)';
        }

        echo '</p>'; // Close the paragraph tag that was missing
        echo '</div>';
    }
}
// Fix: Use fully qualified function name with namespace
add_action('admin_notices', 'Miruni\\Notice\\miruni_display_trial_notice');