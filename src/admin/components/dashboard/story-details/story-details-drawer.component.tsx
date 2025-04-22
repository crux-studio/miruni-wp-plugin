import { MutableRefObject, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Flex, Text, useDisclosure } from '@chakra-ui/react';

import {
  Drawer,
  CloseIcon,
  StoryDetailsHeader,
  StoryDetailsHeaderToolkitPortalProvider,
  TrashIcon,
  ConfirmationModal,
} from '@miruni/eds';
import {
  useDeleteStoryMutation,
  Story,
  useStoriesTableByIdQuery,
  useStoryDetailsBodyByIdQuery,
} from '@miruni/graphql';
import { useIsStoryOrProjectDeleted } from '@miruni/hooks';
import { Params } from '@miruni/models';

import { ReviewSuggestionButton } from '#/admin/components/shared/review-suggestion-button';
import { useGenerateShareLink } from '#/admin/hooks/use-generate-share-link';
import { useWordPressNavigation } from '#/admin/hooks/use-wp-nav';

import { StoryDetails } from './story-details.component';

interface IStoryDetailsDrawerProps {
  isOpenStoryDetails: boolean;
  onCloseStoryDetails: () => void;
  projectId: number;

  storyId: number;
  tableRef?: MutableRefObject<HTMLTableElement | null>;
}

export const StoryDetailsDrawer = ({
  isOpenStoryDetails,
  onCloseStoryDetails,
  projectId,
  storyId,
  tableRef,
}: IStoryDetailsDrawerProps) => {
  const { t } = useTranslation();
  const drawerStoryRef = useRef(null);
  const { data: storiesTableData } = useStoriesTableByIdQuery({
    variables: {
      id: storyId,
    },
    skip: !storyId,
  });
  const story = storiesTableData?.story;
  const { data: storyDetailsBodyData } = useStoryDetailsBodyByIdQuery({
    variables: {
      id: storyId,
    },
    skip: !storyId,
  });
  const storyBody = storyDetailsBodyData?.story;

  const { isMarkedDeleted, loading: isMarkedDeletedLoading } = useIsStoryOrProjectDeleted(
    storyId,
    projectId,
  );

  const { removeQueryParams } = useWordPressNavigation();

  const removeStoryIdQueryParam = useCallback(() => {
    removeQueryParams([Params.STORY_ID]);
  }, [removeQueryParams]);

  const closeDrawer = useCallback(() => {
    onCloseStoryDetails();
    removeStoryIdQueryParam();
  }, [onCloseStoryDetails, removeStoryIdQueryParam]);

  const onOutsideClick = useCallback(
    (e: MouseEvent) => {
      const parents = e.composedPath() as HTMLElement[];
      if (
        parents.every(
          (item) => item !== tableRef?.current && !['A', 'BUTTON'].includes(item.tagName),
        )
      ) {
        onCloseStoryDetails();
      }
    },
    [onCloseStoryDetails, tableRef],
  );

  const generateShareLink = useGenerateShareLink();

  const [deleteStory] = useDeleteStoryMutation();
  const { isOpen: isOpenConfirmation, onOpen, onClose: onCloseConfirmation } = useDisclosure();
  const onDeleteStory = useCallback(async () => {
    if (!story) return;
    await deleteStory({
      variables: {
        id: story.id,
      },
      update: (cache, { data }) => {
        const deletedStoryId = data?.updateStory?.story?.id;

        if (deletedStoryId) {
          cache.modify({
            fields: {
              stories: (existingStories = {}) => {
                const updatedStories = Object.values(existingStories).filter(
                  (storyRef) => deletedStoryId !== (storyRef as Story).id,
                );

                return updatedStories;
              },
            },
          });
        }
      },
    });

    onCloseConfirmation();
    closeDrawer();
  }, [story, deleteStory, onCloseConfirmation, closeDrawer]);

  const handleDelete = useCallback(() => {
    onOpen();
  }, [onOpen]);

  const hasSuggestions =
    storyDetailsBodyData?.story?.storyAiSuggestionBatches?.totalCount &&
    storyDetailsBodyData?.story?.storyAiSuggestionBatches?.totalCount > 0;

  return (
    <StoryDetailsHeaderToolkitPortalProvider>
      <Drawer
        onClose={closeDrawer}
        onEsc={closeDrawer}
        variant="clickableRow"
        isLoading={isMarkedDeletedLoading}
        isOpen={isOpenStoryDetails}
        drawerRef={drawerStoryRef}
        onOutsideClick={onOutsideClick}
        styleHeader={{ padding: '0' }}
        header={
          isMarkedDeleted ? (
            <Flex flexDir="row" justifyContent={'right'} py={4} px={6}>
              <CloseIcon cursor="pointer" onClick={closeDrawer} />
            </Flex>
          ) : (
            <>
              <StoryDetailsHeader
                identifier={story?.identifier}
                category={story?.category}
                urlPath={storyBody?.urlPath}
                onClose={closeDrawer}
                generateShareLink={() =>
                  generateShareLink({
                    storyId: storyId,
                    projectId: projectId,
                    teamId: story?.teamId as number,
                    workspaceId: story?.workspaceId as number,
                  })
                }
                menu={[
                  {
                    icon: <TrashIcon boxSize="14px" />,
                    label: t('storyView.deleteStory', 'Delete story'),
                    onClick: handleDelete,
                    styles: { color: 'corallo100' },
                  },
                ]}
                additionalActions={
                  hasSuggestions ? (
                    <Flex justifyContent="center" alignItems="center" px={4} gap={2}>
                      <Text fontWeight="500" fontSize="12px" lineHeight="18px" color="black90">
                        ⚡️ Smart Edit
                      </Text>
                      <ReviewSuggestionButton
                        storyId={storyId}
                        fontSize="12px"
                        fontWeight="normal"
                      />
                    </Flex>
                  ) : null
                }
              />
              <ConfirmationModal
                primaryMessage={t(
                  'storyView.deleteConfirm',
                  'Are you sure you want to delete this story?',
                )}
                secondaryMessage={t(
                  'storyView.deleteConfirmInfo',
                  `This story can't be recovered once deleted.`,
                )}
                primaryButtonText={t('storyView.delete', 'Delete')}
                secondaryButtonText={t('storyView.cancel', 'Cancel')}
                isOpen={isOpenConfirmation}
                onClose={onCloseConfirmation}
                onPrimaryButton={onDeleteStory}
                onSecondaryButton={onCloseConfirmation}
              />
            </>
          )
        }
        content={
          isMarkedDeleted ? (
            <Flex justify="center" alignItems="center" flexGrow="1">
              <Text>{t('storyView.isDeleted', 'This story has been deleted.')}</Text>
            </Flex>
          ) : (
            <StoryDetails storyId={storyId} />
          )
        }
        styleFooter={{ padding: '0' }}
      />
    </StoryDetailsHeaderToolkitPortalProvider>
  );
};
