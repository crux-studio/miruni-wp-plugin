import { useCallback, useEffect, useMemo } from 'react';

import { makeVar, useApolloClient, useReactiveVar } from '@apollo/client';

import {
  useWordpressLoginLazyQuery,
  WordpressLoginQuery,
} from '@miruni/graphql/src/generated/graphql';

import { WPClient } from '#/admin/services/wp-client';

import { useIsLoading } from './use-is-loading';

export type UserWorkspace = NonNullable<
  NonNullable<WordpressLoginQuery['wordpressLogin']>['workspaces']
>['nodes'][number] & {
  teamId: number;
};

const miruniUserDataVar = makeVar<WordpressLoginQuery | null>(
  window.miruniData.wordpressLogin?.response?.data || null,
);

export const useMiruniUser = () => {
  const apolloClient = useApolloClient();
  const { clearLoading } = useIsLoading();
  const miruniUserData = useReactiveVar(miruniUserDataVar);

  const setMiruniUserData = useCallback(
    (newData: WordpressLoginQuery | null) => {
      miruniUserDataVar(newData);
    },
    [miruniUserDataVar],
  );

  const [refetch, { loading: miruniUserLoading, error: miruniUserError }] =
    useWordpressLoginLazyQuery({
      variables: {
        input: {
          wordpressDomain: window.location.origin,
          snippetSecretKey: window.miruniData.snippetSecretKey,
          snippetKey: window.miruniData.snippetApiKey,
        },
      },

      notifyOnNetworkStatusChange: true,
      onError: (error) => {
        clearLoading();
        // eslint-disable-next-line no-console
        console.error('Error fetching user data', error);
      },
    });

  const userWorkspaces = useMemo(() => {
    return (
      miruniUserData?.wordpressLogin?.workspaces?.nodes.map((w) => ({
        ...w,
        teamId: w?.teams?.nodes?.[0]?.id || 0,
      })) || []
    );
  }, [miruniUserData]);

  const clearMiruniUser = useCallback(() => {
    apolloClient.cache.modify({
      fields: {
        getCurrentUser: () => null,
      },
    });
    setMiruniUserData(null);
  }, [apolloClient]);

  const refetchMiruniUser = useCallback(async () => {
    apolloClient.cache.evict({
      fieldName: 'wordpressLogin',
      broadcast: true,
    });
    const refetchedUser = await refetch();
    setMiruniUserData(refetchedUser.data ? refetchedUser.data : null);
    clearLoading();

    apolloClient.cache.gc();
    return refetchedUser;
  }, [apolloClient, refetch, clearLoading]);

  useEffect(() => {
    const newApiKey = miruniUserData?.wordpressLogin?.snippet?.key;
    const snippetSecretKey = miruniUserData?.wordpressLogin?.snippet?.secretKey;
    if (newApiKey && newApiKey !== window.miruniData.snippetApiKey && snippetSecretKey) {
      void WPClient.saveApiKeyInWordpress(newApiKey, snippetSecretKey);
    }
  }, [miruniUserData]);

  const workspace = useMemo(
    () =>
      miruniUserData?.wordpressLogin?.workspaces?.nodes?.find(
        (w) => w.id === miruniUserData.wordpressLogin?.snippet?.workspaceId,
      ) ?? null,
    [miruniUserData],
  );

  const paymentStatus = useMemo(() => {
    return workspace?.subscriptionStatus ?? null;
  }, [workspace]);

  return {
    user: miruniUserData?.wordpressLogin?.userAccount,
    error: miruniUserError,
    isLoading: miruniUserLoading,
    userWorkspaces,
    userNotFound: !miruniUserData?.wordpressLogin,
    refetchMiruniUser,
    clearMiruniUser,
    userSnippet: miruniUserData?.wordpressLogin?.snippet,
    plan: workspace?.activePlan,
    remainingSmartEdits: workspace?.remainingSmartEditAllowanceThisPeriod || 0,
    paymentStatus,
    workspace,
  };
};
