<?php

namespace Miruni\RestApi;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Base API class to be extended by specific API endpoints
 */
abstract class Miruni_BaseAPI
{
    /**
     * API namespace
     */
    protected static string $namespace = 'miruni/v1';

    /**
     * API route base
     */
    protected static string $route = '/';

    /**
     * Setup the API routes
     */
    abstract public static function setup(): void;

    /**
     * Permission callback for endpoints that require authentication
     * 
     * @param WP_REST_Request $request The request object
     * @return bool|WP_Error True if permission granted, WP_Error otherwise
     * @phpstan-ignore missingType.generics
     */
    public static function snippet_secret_required_permission_callback(WP_REST_Request $request): bool|WP_Error
    {
        error_log("Miruni: Permission callback called");
        // Check for authentication - can be customized based on needs
        $snippet_secret = miruni_get_snippet_secret_key();
        // get "snippet_secret param
        $request_secret = $request->get_param('snippet_secret');
        if ($snippet_secret !== $request_secret) {
            return new WP_Error(
                'rest_forbidden'
            );
        }

        return true;
    }

    /**
     * Permission callback that allows public access
     * 
     * @return bool Always returns true
     */
    public static function public_permission_callback(): bool
    {
        return true;
    }

    /**
     * Helper method to create a success response
     * 
     * @param mixed $data Response data
     * @param int $status HTTP status code
     * @return WP_REST_Response
     */
    protected static function success_response($data, int $status = 200): WP_REST_Response
    {
        return new WP_REST_Response([
            'success' => true,
            'data' => $data
        ], $status);
    }

    /**
     * Helper method to create an error response
     * 
     * @param string $code Error code
     * @param string $message Error message
     * @param int $status HTTP status code
     * @return WP_Error
     */
    protected static function error_response(string $code, string $message, int $status = 400): WP_Error
    {
        return new WP_Error($code, $message, ['status' => $status]);
    }

    /**
     * Get the full REST API URL for a specific endpoint
     * 
     * @param array<string,int|string> $params Optional query parameters
     * @return string The complete REST API URL
     */
    protected static function _get_rest_url(array $params = []): string
    {
        $url = rest_url(static::$namespace . static::$route);

        if (!empty($params)) {
            $url = add_query_arg($params, $url);
        }

        return $url;
    }
}
