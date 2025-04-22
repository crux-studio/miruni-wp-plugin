import { FC, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { useIsLoading } from './hooks/use-is-loading';
import { useMiruniUser } from './hooks/use-miruni-user';
import { useSetSnippetCookie } from './hooks/use-set-snippet-cookie';
import { useSubscriptions } from './hooks/use-subscriptions';
import { ViewRouter } from './router';

const App: FC = () => {
  const { user, error, isLoading: userLoading } = useMiruniUser();
  const { clearLoading } = useIsLoading();
  useSubscriptions();
  useSetSnippetCookie();

  useEffect(() => {
    if (!user?.email || !window.posthog) return;
    window.posthog?.identify(user?.email, user);
  }, [user]);

  useEffect(() => {
    if (!userLoading && (user || error)) {
      const timer = setTimeout(() => {
        clearLoading();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [user, error, clearLoading]);

  const router = createBrowserRouter(
    [
      {
        // This path matches WordPress admin.php
        path: '/wp-admin/admin.php',
        element: <ViewRouter />,
      },
    ],
    {
      // This is important: tell React Router to preserve query parameters
      basename: '',
      future: {
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
      },
    },
  );

  return <RouterProvider router={router} />;
};

export default App;
