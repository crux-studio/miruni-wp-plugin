/// <reference types="react" />
import { WordpressLoginQueryResult } from '@miruni/graphql/src/generated/graphql';

declare global {
  interface Window {
    // TODO: set up newrelic so that this actually works
    newrelic?: typeof import('newrelic');
    posthog?: typeof import('posthog-js').posthog;

    miruniData: {
      posthogId: string;
      cssUrl: string;
      miruniApiUrl: string;
      miruniWebappUrl: string;
      snippetApiKey: string;
      snippetSecretKey: string;
      stripePublicKey: string;
      ajaxUrl: string;
      adminUrl: string;
      nonce: string;
      siteDomain: string;
      currentUser: {
        id: number;
        username: string;
        email: string;
        displayName: string;
        roles: string[];
      };
      auth0: {
        domain: string;
        clientId: string;
        audience: string;
        redirectUri: string;
      };
      wordpressLogin: {
        error: object;
        response: WordpressLoginQueryResult;
      };
    };
  }
}

export {};
