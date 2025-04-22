import { FC, useEffect } from 'react';

import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';

import {
  StoryAiSuggestionsDocument,
  StoryAiSuggestionsQuery,
  useDiscardAiSuggestionMutation,
} from '@miruni/graphql';

import { captureEvent, TrackingEvent } from '#/admin/logging/posthog';
import { Change } from '#/admin/types/suggestion';

import { ChangeCard } from './components/change-card';
import { useFeedback } from './hooks/use-feedback';

export interface AiSuggestionChangesSummaryProps {
  changes: Change[];
  setSelectedSuggestion?: (id: number) => void;
  isLoading?: boolean;
  storyId: number;
  overallSummary?: string;
}

export const AiSuggestionChangesSummary: FC<AiSuggestionChangesSummaryProps> = ({
  changes,
  setSelectedSuggestion,
  isLoading = false,
  storyId,
  overallSummary,
}) => {
  const bgColor = useColorModeValue('white', 'gray.100');
  const { feedback, handleFeedback, handleCommentChange, onCommentBlur, setChanges } =
    useFeedback();
  useEffect(() => {
    if (changes) {
      setChanges(changes);
    }
  }, [changes, setChanges]);

  const [discardSuggestion] = useDiscardAiSuggestionMutation({
    optimisticResponse: (variables) => ({
      discardAiSuggestion: {
        storyAiSuggestion: {
          id: variables.suggestionId,
          nodeId: '',
          __typename: 'StoryAiSuggestion',
        },
        __typename: 'DiscardAiSuggestionPayload',
      },
    }),
    update: (cache, { data }) => {
      const suggestionId = data?.discardAiSuggestion?.storyAiSuggestion?.id;
      if (!suggestionId) return;

      // Read the current query data from the cache
      const existingData = cache.readQuery<StoryAiSuggestionsQuery>({
        query: StoryAiSuggestionsDocument,
        variables: { storyId },
      });

      if (!existingData?.storyAiSuggestionBatches) return;

      // Create updated data with the discarded suggestion filtered out
      const updatedData = {
        ...existingData,
        storyAiSuggestionBatches: {
          ...existingData.storyAiSuggestionBatches,
          nodes: existingData.storyAiSuggestionBatches.nodes.map((batch) => ({
            ...batch,
            storyAiSuggestionsBySuggestionBatchId: {
              ...batch.storyAiSuggestionsBySuggestionBatchId,
              nodes: batch.storyAiSuggestionsBySuggestionBatchId.nodes.filter(
                (suggestion) => suggestion.id !== suggestionId,
              ),
            },
          })),
        },
      };

      // Write the updated data back to the cache
      cache.writeQuery({
        query: StoryAiSuggestionsDocument,
        variables: { storyId },
        data: updatedData,
      });
    },
  });

  const handleChangeSelect = (id: number) => {
    if (setSelectedSuggestion) {
      setSelectedSuggestion(id);
    }
  };

  const handleDiscard = async (change: Change) => {
    captureEvent(TrackingEvent.DISMISSED_SUGGESTION, {
      suggestion_name: change.fileName,
      suggestionId: change.suggestionId,
    });
    await discardSuggestion({
      variables: {
        suggestionId: change.suggestionId,
      },
    });
  };

  if (isLoading) {
    return (
      <Box mb={4} p={4}>
        <Flex justify="space-between" align="center" mb={4}></Flex>
        <Box height="100px" display="flex" alignItems="center" justifyContent="center">
          <Text color="gray.500">Loading suggestions...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg={bgColor} mb={4}>
      <Box p={4}>
        <Text fontWeight={changes.length > 0 ? 'medium' : 'bold'} mb={2}>
          {changes.length > 0 ? 'Summary' : 'No changes available'}
        </Text>
        <Text color="gray.700">
          {overallSummary || 'These changes update various elements on the page.'}
        </Text>
      </Box>
      <Flex wrap="wrap" gap={4} px={4}>
        {changes.map((change) => (
          <Box
            w="30%"
            onClick={() => handleChangeSelect(change.suggestionId)}
            key={change.suggestionId}
          >
            <ChangeCard
              change={change}
              feedback={
                feedback[change.suggestionId] || {
                  isNegative: undefined,
                  showComments: false,
                  isExpanded: false,
                }
              }
              handleFeedback={handleFeedback}
              handleCommentChange={handleCommentChange}
              onCommentBlur={onCommentBlur}
              onDiscard={async (id) => {
                captureEvent(TrackingEvent.DISMISSED_SUGGESTION, {
                  suggestion_name: change.fileName,
                  suggestionId: id,
                });
                await handleDiscard(change);
              }}
            />
          </Box>
        ))}
      </Flex>
    </Box>
  );
};
