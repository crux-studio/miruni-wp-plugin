<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly
require_once plugin_dir_path(__FILE__) . 'env.php';

/**
 * NewRelic Server-Side Error Reporting for WordPress plugin
 */
class Miruni_NewRelic
{
    /**
     * Initialize error reporting
     */
    public static function init(): void
    {
        // Register the error handler
        add_action('my_plugin_error', [self::class, 'notice_error'], 10, 2);
    }

    /**
     * Send an error to NewRelic
     * 
     * This is super ugly but it mimics the request that is
     *
     * @param Exception $exception The exception to report
     * @param array $customAttributes Custom attributes to include with the error
     * @phpstan-ignore missingType.iterableValue
     */
    public static function notice_error($exception, $customAttributes = []): void
    {


        $browser_key = get_env_var('NEW_RELIC_LICENSE_KEY');
        $app_id = get_env_var('NR_APP_ID');

        if (!$browser_key || !$app_id) {

            return;
        }
        $request_uri = isset($_SERVER['REQUEST_URI']) ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI'])) : '/wp-admin';

        $referrer = "https://" . (isset($_SERVER['HTTP_HOST']) ? sanitize_text_field($_SERVER['HTTP_HOST']) : 'wordpress-app') . $request_uri;

        $error_data = [
            "err" => [
                [
                    "params" => [
                        "stackHash" => 0,
                        "exceptionClass" => get_class($exception),
                        "request_uri" => $request_uri,
                        "message" => $exception->getMessage(),
                        "stack_trace" => get_class($exception) . ": " . $exception->getMessage(),
                        "releaseIds" => "{}",
                        "pageview" => 1,
                        "firstOccurrenceTimestamp" => round(microtime(true) * 1000)
                    ],
                    "custom" => [
                        "isWorker" => true,
                        "application.version" => get_bloginfo('version'),
                        "reason" => "WordPress PHP Exception",
                        "source" => "WordPress PHP Plugin",
                        "message" => json_encode([
                            "type" => "WORDPRESS_ERROR",
                            "payload" => [
                                "url" => $referrer,
                                "errorDetails" => $exception->getMessage()
                            ]
                        ])
                    ],
                    "metrics" => [
                        "count" => 1,
                        "time" => [
                            "t" => round(microtime(true) * 1000) % 1000000
                        ]
                    ]
                ]
            ]
        ];

        // Add stack trace if available
        // @phpstan-ignore function.alreadyNarrowedType
        if (method_exists($exception, 'getTraceAsString')) {
            $error_data["err"][0]["params"]["stack_trace"] = $exception->getTraceAsString();
        }

        // Add custom attributes to the custom section
        foreach ($customAttributes as $key => $value) {
            $error_data["err"][0]["custom"][sanitize_key($key)] = sanitize_text_field($value);
        }



        // Construct BAM endpoint URL with all required parameters
        $url = "https://bam.nr-data.net/jserrors/1/" . $browser_key . "?" .
            "a=" . $app_id . "&" .
            "sa=1&" .
            "v=1.249.0&" .
            "t=" . urlencode("WordPress PHP Error") . "&" .
            "rst=" . round(microtime(true) * 1000) % 1000000 . "&" .
            "ck=0&" .
            "s=0&" .
            "ref=" . urlencode($referrer);



        $body = json_encode($error_data);
        if ($body === false) {

            return;
        }

        $args = [
            'body' => $body,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'timeout' => 5,
            'blocking' => false  // Non-blocking for better performance
        ];

        wp_remote_post($url, $args);
    }

}


// Initialize
add_action('plugins_loaded', ['Miruni_NewRelic', 'init']);