// eslint-disable-next-line @typescript-eslint/no-unused-vars, import/order
import _agent from '#/admin/logging/newrelic';
import React from 'react';
import './styles/custom.css';

import { ApolloLink, ApolloProvider, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { createRoot } from 'react-dom/client';

import { OverlaysProvider } from '@miruni/eds';
import { ScopedChakraProvider } from '@miruni/eds/src/components/scoped-chakra-provider/scoped-chakra-provider';
import { createTransactionLink, initializeApollo } from '@miruni/graphql/src/apollo-client';

import { clearStoredMiruniCredentials, getAccessToken } from './auth/miruni-login';
import App from './main-app';
import { logError } from './utils/logging';

if (!_agent) {
  // eslint-disable-next-line no-console
  console.warn('New Relic agent not found');
}

// Initialize PostHog tracking
const initializePostHog = (key: string) => {
  if (!key) {
    console.log('PostHog key not found');
    return;
  }
  const script = document.createElement('script');
  script.innerHTML = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetGroupPropertiesForFlags resetPersonPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${key}', {api_host: 'https://us.i.posthog.com'})
  `;
  document.head.appendChild(script);
};

// Call the function to add PostHog script
initializePostHog(window.miruniData.posthogId);

// WP variables passed in using wp_localize_script

const container = document.getElementById('miruni-admin-root');

if (container) {
  // add shadowRoot to container
  const root = createRoot(container);
  const apiUrl = window.miruniData.miruniApiUrl;

  const preventUnauthenticatedLink = new ApolloLink((operation, forward) => {
    const context = operation.getContext();
    const token = context.headers?.authorization;

    if (!token) {
      // Return an observable that immediately errors
      return new Observable((observer) => {
        observer.error(new Error('No authentication token - request blocked'));
        observer.complete();
      });
    }

    // Continue the request chain
    return forward(operation);
  });
  const transactionLink = createTransactionLink('wordpress');
  const authLink = setContext(async (_, { headers }) => {
    const token =
      (await getAccessToken().catch((err) => {
        logError(err);
      })) || '';
    if (!token) {
      return headers;
    }
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    };
  });

  const wsUri = new URL(apiUrl.replace('http', 'ws').replace('app.', 'api.'));
  wsUri.pathname = '/graphql';
  const client = initializeApollo(
    {},
    {
      extraLinks: [authLink, preventUnauthenticatedLink, transactionLink],
      endpoint: '/graphql',
      apiUrl,
      isExtension: false,
      ws: {
        uri: wsUri.toString(),
        connectionParams: async () => {
          const token = await getAccessToken();
          return {
            token: token || '',
          };
        },
      },
      credentials: 'omit',
      onError: async (error) => {
        if (
          error.networkError &&
          'response' in error.networkError &&
          error.networkError?.response.status === 401
        ) {
          await clearStoredMiruniCredentials();
          // Optionally reload the page or redirect to login
          window.location?.reload();
        }
      },
    },
  );

  root.render(
    <React.StrictMode>
      <ScopedChakraProvider container={container} app="wp" cssPath={window.miruniData.cssUrl}>
        <ApolloProvider client={client}>
          <OverlaysProvider>
            <div
              className="wp-admin-container"
              style={{
                paddingRight: '20px',
              }}
            >
              <App />
            </div>
          </OverlaysProvider>
        </ApolloProvider>
      </ScopedChakraProvider>
    </React.StrictMode>,
  );
}
