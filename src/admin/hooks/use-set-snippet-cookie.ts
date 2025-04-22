import { useCallback, useEffect } from 'react';

import { getAccessToken } from '#/admin/auth/miruni-login';

import { useMiruniUser } from './use-miruni-user';

export const useSetSnippetCookie = () => {
  const { user } = useMiruniUser();
  const setSnippetCookie = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }
    fetch(window.miruniData.miruniWebappUrl + '/api/snippet/set-cookie', {
      method: 'GET',
      headers: {
        credentials: 'include',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error setting snippet cookie', error);
    });
  }, []);

  useEffect(() => {
    // if there's no user, we don't have a token to set the cookie
    if (!user) {
      return;
    }
    setSnippetCookie().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error setting snippet cookie', error);
    });
  }, [setSnippetCookie, user]);
};
