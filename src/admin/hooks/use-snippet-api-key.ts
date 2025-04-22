import { makeVar, useReactiveVar } from '@apollo/client';

const snippetApiKeyVar = makeVar<string | null>(window.miruniData.snippetApiKey || null);

export const useSnippetApiKey = () => {
  const snippetApiKey = useReactiveVar<string | null>(snippetApiKeyVar);
  const setSnippetApiKey = (apiKey: string | null) => {
    window.miruniData.snippetApiKey = apiKey ?? '';

    snippetApiKeyVar(apiKey);
  };
  return {
    snippetApiKey,
    setSnippetApiKey,
  };
};
