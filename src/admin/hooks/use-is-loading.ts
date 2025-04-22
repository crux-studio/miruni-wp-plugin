import { useCallback } from 'react';

import { makeVar, useReactiveVar } from '@apollo/client';

export interface LoadingState {
  isLoading: boolean;
  loadingMessage: string;
}

const loadingVar = makeVar<LoadingState>({
  isLoading: false,
  loadingMessage: '',
});

export const useIsLoading = () => {
  const loadingState = useReactiveVar<LoadingState>(loadingVar);

  const setLoading = useCallback((message: string) => {
    console.trace('setLoading', message);
    loadingVar({
      isLoading: true,
      loadingMessage: message,
    });
  }, []);

  const clearLoading = useCallback(() => {
    loadingVar({
      isLoading: false,
      loadingMessage: '',
    });
  }, []);

  return {
    isLoading: loadingState.isLoading,
    loadingMessage: `${loadingState.loadingMessage || 'Loading'}`,
    setLoading,
    clearLoading,
  };
};
