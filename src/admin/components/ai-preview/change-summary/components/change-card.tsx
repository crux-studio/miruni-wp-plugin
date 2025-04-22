import { FC } from 'react';

import {
  Box,
  Card,
  CardBody,
  Flex,
  Text,
  CardFooter,
  Tooltip,
  IconButton,
  VStack,
} from '@chakra-ui/react';

import { ThumbsDownIcon, ThumbsUpIcon, TrashIcon } from '@miruni/eds';

import { getFileName } from '#/admin/components/ai-preview/change-summary/utils/file-name';
import { Change, UpdateRequiredType } from '#/admin/types/suggestion';

import { ChangeFeedback } from './change-feedback';

export interface ChangeCardProps {
  change: Change;
  feedback: {
    isNegative: boolean | undefined;
    showComments: boolean;
    comment?: string;
    isExpanded: boolean;
  };
  handleFeedback: (id: number, isNegative: boolean, e: React.MouseEvent) => void;
  handleCommentChange: (id: number, comment: string) => void;
  onCommentBlur: (id: number) => void;
  onDiscard: (id: number) => void;
}

const affectsOtherPages = (changeType: string) => {
  const SITE_WIDE_FILES = [
    UpdateRequiredType.THEME_MOD,
    UpdateRequiredType.MENU_ITEM_NAME,
    UpdateRequiredType.WP_OPTION,
  ] as string[];
  return SITE_WIDE_FILES.includes(changeType);
};

export const ChangeCard: FC<ChangeCardProps> = ({
  change,
  feedback,
  handleFeedback,
  handleCommentChange,
  onCommentBlur,
  onDiscard,
}) => {
  return (
    <Card variant="outline" bg="#F7FAFC" _hover={{ bg: '#EDF2F7' }} cursor="pointer">
      <CardBody py={3} px={4}>
        <Flex align="center" gap={1} overflow="hidden">
          <VStack align="flex-start" overflow="hidden" gap={2}>
            <Text
              fontWeight="semibold"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {getFileName(change).title}
            </Text>
            {getFileName(change).subtitle && (
              <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {getFileName(change).subtitle}
              </Text>
            )}
            <Box>
              <Text color="gray.600" whiteSpace="pre-wrap" mb={3}>
                {change.changesMade}
              </Text>
            </Box>
            {affectsOtherPages(change.fileType || '') && (
              <Text fontSize="sm" color="#B61C25">
                This change may affect other pages
              </Text>
            )}
          </VStack>
        </Flex>

        {(feedback.showComments || feedback.isNegative) && (
          <ChangeFeedback
            change={change}
            onCommentBlur={onCommentBlur}
            handleCommentChange={handleCommentChange}
          />
        )}
      </CardBody>
      <CardFooter>
        <Flex gap={2} justifyContent="flex-end" w="full">
          <Tooltip label="Rate this suggestion">
            <IconButton
              aria-label="Thumbs up"
              icon={<ThumbsUpIcon width={12} />}
              size="sm"
              colorScheme={feedback.isNegative === false ? 'green' : 'gray'}
              variant={feedback.isNegative === false ? 'solid' : 'outline'}
              onClick={(e) => handleFeedback(change.suggestionId, false, e)}
              flexShrink={0}
            />
          </Tooltip>
          <Tooltip label="Rate this suggestion">
            <IconButton
              aria-label="Thumbs down"
              icon={<ThumbsDownIcon width={12} />}
              size="sm"
              colorScheme={feedback.isNegative === true ? 'red' : 'gray'}
              variant={feedback.isNegative === true ? 'solid' : 'outline'}
              onClick={(e) => handleFeedback(change.suggestionId, true, e)}
              flexShrink={0}
            />
          </Tooltip>
          <Tooltip label="Discard this suggestion">
            <IconButton
              aria-label="Discard"
              icon={<TrashIcon width={12} />}
              size="sm"
              color="#B61C25"
              borderColor="#B61C25"
              variant={'outline'}
              onClick={() => onDiscard(change.suggestionId)}
              flexShrink={0}
            />
          </Tooltip>
        </Flex>
      </CardFooter>
    </Card>
  );
};
