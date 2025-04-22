import { FC } from 'react';

import { Box, Flex, Skeleton, SkeletonText, Text, useColorModeValue } from '@chakra-ui/react';
import { format } from 'date-fns';

import { CalenderIcon, Person2Icon, StoryAssets } from '@miruni/eds';
import { StoryAiSuggestionsQuery } from '@miruni/graphql';

interface AiPreviewSummary {
  description: string;
  createdAt: Date;
  reporterName: string;
  captures: NonNullable<
    NonNullable<StoryAiSuggestionsQuery['storyAiSuggestionBatches']>['nodes'][0]['story']
  >['captures']['nodes'];
  isLoading?: boolean;
}

export const AiPreviewSummary: FC<AiPreviewSummary> = ({
  description,
  createdAt,
  reporterName,
  captures,
  isLoading = false,
}) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (isLoading) {
    return (
      <Flex
        borderWidth="1px"
        borderRadius="md"
        p={4}
        bg="white"
        borderColor={borderColor}
        gap={4}
        justifyContent="space-between"
        mb={4}
      >
        {/* Left side loading state */}
        <Flex direction="column" gap={3} flex="1">
          <Flex gap={6}>
            <Flex align="center" gap={2}>
              <Skeleton width="14px" height="14px" />
              <Skeleton height="14px" width="120px" />
            </Flex>
            <Flex align="center" gap={2}>
              <Skeleton width="14px" height="14px" />
              <Skeleton height="14px" width="100px" />
            </Flex>
          </Flex>
          <Box pt={2} w="100%">
            <SkeletonText mt="1" noOfLines={1} spacing="3" skeletonHeight="3" />
          </Box>
        </Flex>

        {/* Right side loading state with 2 asset boxes */}
        <Flex w="40%" justify="flex-end" gap={2} pr={6}>
          <Skeleton height="24" width="220px" borderRadius="md" />
          <Skeleton height="24" width="220px" borderRadius="md" />
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex
      borderWidth="1px"
      borderRadius="md"
      p={4}
      bg="white"
      borderColor={borderColor}
      gap={4}
      justifyContent="space-between"
      mb={4}
    >
      <Flex direction="column" gap={3} flex="1">
        <Flex gap={6}>
          <Flex align="center" gap={2}>
            <Person2Icon boxSize="14px" color="gray.500" />
            <Text fontSize="14px" color="gray.700">
              {reporterName}
            </Text>
          </Flex>
          <Flex align="center" gap={2}>
            <CalenderIcon boxSize="14px" color="gray.500" />
            <Text fontSize="14px" color="gray.700">
              {format(createdAt, 'PPP')}
            </Text>
          </Flex>
        </Flex>
        <Box pt={2}>
          <Text fontSize="14px" color="gray.700" lineHeight="1.6">
            {description}
          </Text>
        </Box>
      </Flex>
      <Flex w="40%" justify="flex-end">
        <StoryAssets
          captures={captures}
          storyAttachments={[]}
          users={[]}
          disableUpload
          hideCardDate
          hideCardName
          cardStyle={{
            h: 24,
            border: '1px solid',
            borderColor: borderColor,
            overflow: 'hidden',
          }}
        />
      </Flex>
    </Flex>
  );
};
