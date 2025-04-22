import { getAccessToken } from '#/admin/auth/miruni-login';

export class MiruniRestClient {
  static BASE_URL = window.miruniData.miruniApiUrl;
  private static async getToken(): Promise<string> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No token found');
    }
    return token;
  }

  private static async makeRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = new URL(endpoint, MiruniRestClient.BASE_URL);
    const token = await MiruniRestClient.getToken();
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.json();
  }

  public static async getReferencedPosts(fileContents: string) {
    const endpoint = '/rest/wp/get-referenced-posts';
    const body = {
      template_contents: fileContents,
    };
    return MiruniRestClient.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
