import { FC } from 'react';

import {
  Box,
  Button,
  Flex,
  ListItem,
  Text,
  UnorderedList,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

import { StoryAiSuggestionsQuery } from '@miruni/graphql';

export type SuggestionBatch = NonNullable<
  StoryAiSuggestionsQuery['storyAiSuggestionBatches']
>['nodes'][0];

interface AIPreviewSuggestionBatchViewProps {
  suggestionBatches: SuggestionBatch[];
  onTryAgain: () => void;
  onSelectSuggestionBatch: (suggestionId: number) => void;
  selectedSuggestionBatchId?: number | null;
}

export const AIPreviewSuggestionBatchView: FC<AIPreviewSuggestionBatchViewProps> = ({
  suggestionBatches,
  onTryAgain,
  onSelectSuggestionBatch,
  selectedSuggestionBatchId,
}) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');

  return (
    <VStack spacing={6} align="stretch" width="100%" py={2}>
      {suggestionBatches.map((suggestionBatch) => {
        const createdAtString = new Date(suggestionBatch.createdAt).toLocaleString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        });

        return (
          <Box
            key={suggestionBatch.id}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            p={2}
            cursor="pointer"
            onClick={() => {
              onSelectSuggestionBatch(suggestionBatch.id);
            }}
            bg={selectedSuggestionBatchId === suggestionBatch.id ? selectedBg : 'white'}
            _hover={{ bg: selectedSuggestionBatchId === suggestionBatch.id ? selectedBg : hoverBg }}
          >
            <Flex direction="column" gap={2}>
              <Text fontSize="sm" color="gray.500">
                {createdAtString}
              </Text>
              <Text fontSize="sm" fontWeight="500">
                {suggestionBatch.changeSummary || 'No summary available'}
              </Text>
              <UnorderedList spacing={2} styleType="none" ml={0}>
                {suggestionBatch.storyAiSuggestionsBySuggestionBatchId.nodes.map((suggestion) => (
                  <ListItem key={suggestion.id} fontSize="sm">
                    <Text as="span" fontWeight="bold">
                      {suggestion.fileIdentifier + ' - '}
                    </Text>
                    <Text as="span" color="gray.600">
                      {suggestion.updateSummary}
                    </Text>
                  </ListItem>
                ))}
              </UnorderedList>
            </Flex>
          </Box>
        );
      })}
      <Button
        onClick={onTryAgain}
        colorScheme="blue"
        size="md"
        width="fit-content"
        alignSelf="center"
      >
        Try Again
      </Button>
    </VStack>
  );
};
