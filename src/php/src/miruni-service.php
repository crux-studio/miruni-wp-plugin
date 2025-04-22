<?php



defined('ABSPATH') or die('No direct script access allowed');

class Miruni_Service
{
    private string $api_endpoint;

    public function __construct()
    {
        $this->api_endpoint = get_miruni_api_url();
    }

    /**
     * Makes an authenticated request to the Miruni API
     * @param string $path The API path (e.g., '/rest/user/create')
     * @param array<string,mixed> $data The request body data
     * @param string $method HTTP method (GET, POST, etc.)
     * @return array<string,mixed>|null Response data or null on failure
     * @throws Exception If the request fails
     */
    public function make_request(string $path, array $data = [], string $method = 'POST'): ?array
    {
        $token_result = get_current_access_token();

        if (!$token_result['token']) {
            throw new Exception('No valid access token: ' . esc_html($token_result['reason']));
        }

        $url = rtrim($this->api_endpoint, '/') . '/' . ltrim($path, '/');


        $args = [
            'method' => $method,
            'timeout' => 1800,
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $token_result['token']
            ],
        ];

        if (!empty($data)) {
            $body = json_encode($data);
            if ($body === false) {
                throw new Exception('Failed to encode request data as JSON');
            }
            $args['body'] = $body;
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            throw new Exception('API request failed: ' . esc_html($response->get_error_message()));
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $decoded_body = json_decode($body, true);

        if ($response_code !== 200) {
            throw new Exception(
                'API request failed with status ' . esc_html((string) $response_code) . ': ' .
                esc_html($decoded_body['error'] ?? 'Unknown error')
            );
        }

        return $decoded_body;
    }

    public function suggest_edit(string $input_text): string
    {
        $response = $this->make_request('/ai/suggest-edit', [
            'inputText' => $input_text
        ]);

        if (!$response) {
            throw new Exception('Failed to create edit suggestion');
        }

        return $response['content']['document'];
    }

    /**
     * Gets a signed URL for file upload
     * @param string $extension File extension (e.g., 'php', 'css')
     * @param string|null $filename Optional filename
     * @return string The signed URL
     * @throws Exception If the request fails
     */
    public function get_signed_url(string $extension, ?string $filename = null): string
    {
        $query = ['extension' => $extension];
        if ($filename !== null) {
            $query['filename'] = $filename;
        }

        $path = '/rest/wp/signed-url?' . http_build_query($query);
        $response = $this->make_request($path, [], 'GET');


        if (!$response || !isset($response['url'])) {
            throw new Exception('Failed to get signed URL');
        }

        return $response['url'];
    }


    /**
     * Makes a GraphQL mutation call to the API
     * 
     * @param string $mutation The GraphQL mutation string
     * @param array<string,mixed> $variables Variables for the mutation
     * @return array<string,mixed>|null Response data or null on failure
     * @throws Exception If the request fails
     */
    public function make_graphql_query(string $mutation, array $variables = []): ?array
    {
        $data = [
            'query' => $mutation,
            'variables' => $variables
        ];

        return $this->make_request('/graphql', $data);
    }

    /**
     * Makes a WordPress login request using GraphQL
     * 
     * @param string $wordpressDomain The WordPress domain
     * @param bool|null $skipCreation Whether to skip creation
     * @param string|null $snippetKey The snippet key
     * @param string|null $snippetSecretKey The snippet secret key
     * @return array{
     * data?:array{
     *     wordpressLogin?: array{
     *         userAccount?: array{
     *             id: int,
     *             nodeId: string,
     *             name: string,
     *             fullName: string,
     *             email: string,
     *             userId: string
     *         },
     *         workspaces?: array{
     *             totalCount: int,
     *             nodes?: null|array<array{
     *                 id: int,
     *                 nodeId: string,
     *                 workspaceName: string,
     *                 subscriptionStatus: string,
     *                 activePlan?: array{
     *                     id: int,
     *                     nodeId: string,
     *                     label: string,
     *                     monthlySmartEdits: int
     *                 },
     *                 remainingSmartEditAllowanceThisPeriod: int,
     *                 teams: array{
     *                     nodes: array<array{
     *                         id: int,
     *                         nodeId: string
     *                     }>
     *                 }
     *             }>
     *         },
     *         snippet?: array{
     *             id: int,
     *             nodeId: string,
     *             key: string,
     *             teamId: int,
     *             name: string,
     *             projectId: int,
     *             workspaceId: int,
     *             secretKey: string,
     *             project: array{
     *                 id: int,
     *                 nodeId: string,
     *                 projectName: string
     *             }
     *         },
     *         __typename: string
     *     }
     * }
     * }|null Response data or null on failure
     * @throws Exception If the request fails
     */
    public function wordpress_login(
        string $wordpressDomain,
        ?bool $skipCreation = null,
        ?string $snippetKey = null,
        ?string $snippetSecretKey = null
    ): ?array {
        $mutation = '
            query WordpressLogin($input: WordpressLoginInput!) {
              wordpressLogin(input: $input) {
                userAccount {
                  id
                  nodeId
                  name
                  fullName
                  email
                  userId
                }
                workspaces {
                  totalCount
                  nodes {
                    id
                    nodeId
                    workspaceName
                    code
                    subscriptionStatus
                    activePlan {
                      id
                      nodeId
                      label
                      monthlySmartEdits
                    }
                    remainingSmartEditAllowanceThisPeriod
                    teams(first: 1) {
                      nodes {
                        id
                        nodeId
                      }
                    }
                  }
                }
                snippet {
                  id
                  nodeId
                  key
                  teamId
                  name
                  projectId
                  teamId
                  workspaceId
                  secretKey
                  project {
                    id
                    nodeId
                    projectName
                  }
                }
                __typename
              }
            }
        ';

        $input = ['wordpressDomain' => $wordpressDomain];

        if ($skipCreation !== null) {
            $input['skipCreation'] = $skipCreation;
        }

        if ($snippetKey !== null) {
            $input['snippetKey'] = $snippetKey;
        }

        if ($snippetSecretKey !== null) {
            $input['snippetSecretKey'] = $snippetSecretKey;
        }

        $variables = ['input' => $input];

        return $this->make_graphql_query($mutation, $variables);
    }

    /**
     * Gets the payment subscriptions for a workspace
     * 
     * @param int $workspace_id The ID of the workspace
     * @return array<array{id: string|int, nodeId: string, freeTrialEnds: string|null, plan: array{id: string|int, nodeId: string, label: string}}> Payment subscriptions data or empty array on failure
     * @throws Exception If the request fails
     */
    public function get_workspace_payment_subscriptions($workspace_id): array
    {
        $query = '
        query WorkspaceSubscription($workspaceId: Int!) {
        paymentSubscriptions(filter:  {
            workspacePaymentSubscriptions:  {
                some: {
                            workspaceId: {
                                eq:$workspaceId
                            }
                        }
            }
            active:  {
                eq: true
            }
        }){
            nodes {
            id
            nodeId
            freeTrialEnds
            plan {
                id
                nodeId
                label
            }
            }
        }
        }';

        $variables = ['workspaceId' => (int) $workspace_id];

        $response = $this->make_graphql_query($query, $variables);

        if (!$response || !isset($response['data']['paymentSubscriptions']['nodes'])) {
            return [];
        }

        return $response['data']['paymentSubscriptions']['nodes'];
    }

    /**
     * Gets referenced posts from template content
     * 
     * @param string $template_content The content of the template file
     * @return array<array{args: array<string, mixed>|null}> Referenced posts data or empty array on failure
     * @throws Exception If the request fails
     */
    public function get_referenced_posts(
        string $template_content
    ): array {
        /**  @var array<array{args: array<string, mixed>|null}> $response */
        $response = $this->make_request('/rest/wp/get-referenced-posts', [
            'template_contents' => $template_content
        ]);

        return $response;
    }
}
