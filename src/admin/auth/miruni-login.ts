import { createAuth0Client } from '@auth0/auth0-spa-js';

import { LoginSuccessPopupEventPayload, PopupEvent } from '@miruni/models';
import { debounce } from '@miruni/utils';

import { logError } from '#/admin/utils/logging';

const MIRUNUI_TOKEN_CACHE_KEY = 'miruni_token_cache';

const state = {
  value: '',
  generate: function () {
    this.value = Math.random().toString(36).substring(2);
    return this.value;
  },
  validate: function (receivedState: string) {
    if (receivedState !== this.value) {
      throw new Error('Invalid state');
    }
  },
  clear: function () {
    this.value = '';
  },
};

const getAuth0Client = () => {
  return createAuth0Client({
    domain: window.miruniData.auth0.domain,
    clientId: window.miruniData.auth0.clientId,
  });
};

const openAuthPopup = (url: string, callback?: () => void, onPrematureClose?: () => void) => {
  return new Promise<void>((resolve, reject) => {
    const popup = window.open(url, 'Login', 'width=400,height=600,scrollbars=yes');
    let loginSuccessReceived = false;

    if (!popup) {
      reject(new Error('Popup blocked'));
      return;
    }

    // Listen for messages from the popup
    const messageHandler = async (event: MessageEvent) => {
      if (event.data.type === PopupEvent.LOGIN_SUCCESS) {
        loginSuccessReceived = true;
        const data: LoginSuccessPopupEventPayload = event.data;
        state.validate(data.state);
        await fetch(window.miruniData.ajaxUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            action: 'exchange_auth0_token',
            nonce: window.miruniData.nonce,
            code: data.code,
            state: data.state,
          }),
        }).catch((error) => {
          logError(error as Error);
        });
        state.clear();
        cleanup();
        if (callback) callback();
        resolve();
      }
    };

    // Cleanup function
    const cleanup = debounce(
      () => {
        window.removeEventListener('message', messageHandler);
        if (!popup.closed) popup.close();
      },
      1000,
      true,
    );

    // Handle popup closing
    const pollTimer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollTimer);
          cleanup();
          if (!loginSuccessReceived && onPrematureClose) {
            onPrematureClose();
          }
          resolve();
          state.clear();
        }
      } catch (error) {
        // If we can't access popup.closed due to COOP
        clearInterval(pollTimer);
        cleanup();
        resolve();
        state.clear();
      }
    }, 1500);
    window.addEventListener('message', messageHandler);
  });
};

const getPkceChallenge = async (state: string): Promise<string> => {
  const response = await fetch(window.miruniData.ajaxUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'get_pkce_challenge',
      nonce: window.miruniData.nonce,
      state,
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.data);
  }

  return result.data.challenge;
};

export const loginWithMiruni = async (
  callback?: () => void,
  additonalParams?: Record<string, string>,
  onPrematureClose?: () => void,
) => {
  if (!window.miruniData.auth0) {
    throw new Error('Auth0 configuration not found');
  }

  const { audience, clientId, domain, redirectUri } = window.miruniData.auth0;
  const currentState = state.generate();
  const codeChallenge = await getPkceChallenge(currentState);

  const searchParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    state: currentState,
    audience,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...additonalParams,
  });

  const url = new URL(`https://${domain}/authorize`);
  url.search = searchParams.toString();

  return openAuthPopup(url.toString(), callback, onPrematureClose);
};

export const clearStoredMiruniCredentials = async (): Promise<void> => {
  localStorage.removeItem(MIRUNUI_TOKEN_CACHE_KEY);
  try {
    const response = await fetch(window.miruniData.ajaxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'miruni_logout',
        nonce: window.miruniData.nonce,
      }),
    });

    if (!response.ok) {
      throw new Error('Logout request failed');
    }
  } catch (error) {
    logError(error as Error);
  }
};

// Update existing signoutFromMiruni function to use the new clearStoredMiruniCredentials
export const signoutFromMiruni = async () => {
  await clearStoredMiruniCredentials();
  const client = await getAuth0Client();
  await client.logout({
    openUrl: (url: string) => {
      // open popup for 1 second to trigger logout
      const popup = window.open(url, 'Logout', 'width=400,height=600,scrollbars=yes');
      setTimeout(() => {
        if (popup && !popup.closed) {
          popup.close();
        }
      }, 1000);
    },
  });
};

interface TokenCache {
  access_token: string;
  expires_at: number;
}

let refreshPromise: Promise<string | null> | null = null;

const refreshToken = async () => {
  try {
    const response = await fetch(window.miruniData.ajaxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'get_auth_token_status',
        nonce: window.miruniData.nonce,
      }),
    });
    const result = await response.json();
    if (!result.success) {
      // throw new Error(result.data);
      return;
    }
    localStorage.setItem(
      MIRUNUI_TOKEN_CACHE_KEY,
      JSON.stringify({
        access_token: result.data.access_token,
        expires_at: result.data.expires_at,
      }),
    );

    return result.data.access_token;
  } catch (error) {
    logError(error as Error);
    throw error; // Propagate the error
  }
  return null;
};

export const getAccessToken = async (): Promise<string | null> => {
  // Check localStorage first
  const cached = localStorage.getItem(MIRUNUI_TOKEN_CACHE_KEY);
  let accessToken: string | null = null;
  let expiresSoon = true;
  let hasExpired = false;

  if (cached) {
    const tokenCache: TokenCache = JSON.parse(cached);
    const now = Date.now() / 1000;

    if (tokenCache.expires_at > now + 60) {
      expiresSoon = false;
      accessToken = tokenCache.access_token;
    } else if (tokenCache.expires_at < now) {
      hasExpired = true;
    }
  }

  // If we need an immediate refresh
  if (hasExpired || (expiresSoon && !accessToken)) {
    // If a refresh is already in progress, wait for it
    if (refreshPromise) {
      return refreshPromise;
    }
    // Start a new refresh
    refreshPromise = refreshToken();
    try {
      accessToken = await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  } else if (expiresSoon) {
    // If no refresh is in progress, start one in the background
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
        refreshPromise = null;
      });
    }
  }

  return accessToken;
};
