import { useCallback } from 'react';

import { useApolloClient } from '@apollo/client';

import { StoryAiSuggestionsDocument, StoryAiSuggestionsQuery } from '@miruni/graphql';

import { Suggestion } from '#/admin/types/suggestion';

export const useUpdateSuggestion = (storyId?: number) => {
  const apolloClient = useApolloClient();

  const updateSuggestions = useCallback(
    (updates: { suggestionId: number; newFileContents: string }[]) => {
      if (!storyId) {
        throw new Error('Story ID is required');
      }
      const existingData = apolloClient.cache.readQuery<StoryAiSuggestionsQuery>({
        query: StoryAiSuggestionsDocument,
        variables: { storyId },
      });

      if (!existingData?.storyAiSuggestionBatches) {
        throw new Error('No existing data found');
      }

      const updatedSuggestions: Suggestion[] = [];

      const updatedData = {
        ...existingData,
        storyAiSuggestionBatches: {
          ...existingData.storyAiSuggestionBatches,
          nodes: existingData.storyAiSuggestionBatches.nodes.map((batch) => ({
            ...batch,
            storyAiSuggestionsBySuggestionBatchId: {
              ...batch.storyAiSuggestionsBySuggestionBatchId,
              nodes: batch.storyAiSuggestionsBySuggestionBatchId.nodes.map((suggestion) => {
                const { suggestionId, newFileContents } = updates.find(
                  (update) => update.suggestionId === suggestion.id,
                ) || { suggestionId: null, newFileContents: null };

                if (suggestion.id !== suggestionId) {
                  return suggestion;
                }

                const updatedSuggestion = {
                  ...suggestion,
                  updatedFileContent: newFileContents,
                };
                updatedSuggestions.push(updatedSuggestion);
                return updatedSuggestion;
              }),
            },
          })),
        },
      };

      apolloClient.cache.writeQuery({
        query: StoryAiSuggestionsDocument,
        variables: { storyId },
        data: updatedData,
      });
      return updatedSuggestions;
    },
    [apolloClient, storyId],
  );

  return { updateSuggestions };
};
