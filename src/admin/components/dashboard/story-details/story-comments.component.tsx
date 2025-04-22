import { useCallback, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';

import { Avatar, Flex, Text, Button, IconButton, Tooltip } from '@chakra-ui/react';
import { Descendant } from 'slate';

import {
  TruncatedText,
  Form,
  SlateEditor,
  parseDescription,
  slateEmptyValue,
  TrashIcon,
  ConfirmationModal,
} from '@miruni/eds';
import { LinkElement, MentionElement } from '@miruni/eds/src/components/slate-editor/types';
import {
  CommentsByStoryIdDocument,
  CommentsByStoryIdQuery,
  CreateCommentMutationVariables,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useStoriesTableByIdQuery,
} from '@miruni/graphql';
import { useLocaleDateFns, useStoryComments, useWarningModal } from '@miruni/hooks';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useSearchUserMinimal } from '#/admin/hooks/use-search-user-minimal';
import { logError } from '#/admin/utils/logging';

interface StoryCommentFormValues {
  description: { children: Array<MentionElement | LinkElement | Descendant> }[];
}

interface StoryCommentsProps {
  storyId: number;
  comments: NonNullable<CommentsByStoryIdQuery['comments']>['nodes'];
  autoScroll?: boolean;
}
export const StoryComments = ({
  storyId,
}: // autoScroll = true,
StoryCommentsProps) => {
  const { user } = useMiruniUser();
  const { t, i18n } = useTranslation();
  const { isWarningModalOpen, setIsWarningModalOpen, warningModalCallback, showWarningModalIf } =
    useWarningModal();

  const { data: storiesTableData } = useStoriesTableByIdQuery({
    variables: {
      id: storyId,
    },
    skip: !storyId,
  });

  const storyTableDetails = storiesTableData?.story;

  const { comments, fetchMoreComments, loadingComments } = useStoryComments(storyId, logError);

  const [deleteComment] = useDeleteCommentMutation({
    update: (cache, { data }) => {
      if (data?.deleteComment?.comment) {
        cache.evict({ id: data?.deleteComment?.comment?.nodeId });
        cache.gc();
      }
    },
  });

  const { teamMembers, isLoading, setMemberSearchTerm } = useSearchUserMinimal(
    storyTableDetails?.teamId,
  );

  const teamUserMentionList = useMemo(
    () =>
      teamMembers
        .map((user) => {
          const { id, name } = user ?? {};
          return { id, name } as { id: number; name: string };
        })
        .filter((v) => !!v) ?? [],
    [teamMembers],
  );

  const {
    handleSubmit,
    control,
    getValues,
    reset,
    formState: { dirtyFields, isSubmitting },
  } = useForm<StoryCommentFormValues>({
    defaultValues: {
      description: slateEmptyValue,
    },
  });

  const { dateFormatDistance } = useLocaleDateFns(i18n.language);
  const [createComment] = useCreateCommentMutation();

  const commentEndRef = useRef<HTMLDivElement>(null);

  const handleSubmitComment = useCallback(
    async ({ description }: StoryCommentFormValues) => {
      if (!description) return;

      const variables: CreateCommentMutationVariables = {
        commentInput: {
          by: user?.id as number,
          commentBodyJson: description,
          storyId,
        },
      };
      await createComment({
        refetchQueries: [
          {
            query: CommentsByStoryIdDocument,
            //TODO: Fix this, we don't have quaries for this
            variables: { storyId, size: 100, offset: 0 },
          },
        ],
        variables,
        optimisticResponse: {
          createComment: {
            comment: {
              id: -1,
              nodeId: 'temp-node-id',
              commentBodyJson: description,
              createdBy: 'temp-node-id',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              updatedBy: 'temp-node-id',
              userAccountByCreatedBy: {
                id: user?.id as number,
                nodeId: 'temp-node-id',
                name: user?.name,
              },
            },
            clientMutationId: 'temp-client-mutation-id', // Add this field
          },
        },
      });

      reset();
    },
    [user, storyId, createComment, reset],
  );

  useHotkeys(
    ['meta+enter', 'ctrl+enter'],
    () => handleSubmitComment(getValues()),
    { enableOnFormTags: ['textarea'] },
    [handleSubmitComment, getValues()],
  );

  const showWarningModalDeleteComment = useCallback(
    (id: number, nodeId: string) => {
      const _deleteComment = () =>
        deleteComment({
          variables: {
            id: id,
          },
          optimisticResponse: {
            deleteComment: {
              comment: {
                id: id,
                nodeId: nodeId,
              },
            },
          },
        }).catch(window.newrelic?.noticeError);
      showWarningModalIf(true, '', _deleteComment);
    },
    [deleteComment, showWarningModalIf],
  );

  const commentsMemo = useMemo(
    () =>
      [...(comments ? comments : [])]
        ?.sort((c1, c2) => (c1.createdAt < c2.createdAt ? -1 : c1.createdAt > c2.createdAt ? 1 : 0))
        .map((c) => {
          const userName = c?.userAccountByCreatedBy?.name || undefined;
          return (
            <Flex
              key={c.nodeId}
              flexDir="column"
              _notLast={{
                borderBottom: 'solid',
                borderColor: 'black20',
                borderBottomWidth: '1px',
              }}
              pt="4px"
              pl="4px"
              pb="16px"
              width="100%"
            >
              <Flex flexDir="row" justifyContent="space-between" mb="6px">
                <Flex flexDir="row" flexGrow={1}>
                  <Avatar size="sm" name={userName} title={userName} mr="8px" />
                  <TruncatedText fontWeight="500">{userName}</TruncatedText>
                </Flex>
                <Flex
                  fontWeight="400"
                  fontSize="xs"
                  lineHeight="16px"
                  alignItems="center"
                  whiteSpace="nowrap"
                >
                  {dateFormatDistance(c.createdAt)}
                </Flex>
                {user?.userId === c.createdBy && (
                  <Flex gap={4} justify="flex-end">
                    <Tooltip
                      label={t('storyView.deleteComment', 'Delete Comment')}
                      bg="white"
                      color="black"
                      placement="left"
                      zIndex="999999999"
                    >
                      <IconButton
                        variant="ghost"
                        size="sm"
                        p={0}
                        aria-label={t('storyView.deleteComment', 'Delete Comment')}
                        icon={<TrashIcon />}
                        color="corallo90"
                        onClick={() => {
                          showWarningModalDeleteComment(c.id, c.nodeId);
                        }}
                      />
                    </Tooltip>
                  </Flex>
                )}
              </Flex>
              <Flex>
                <Text as="div" fontWeight="500" fontSize="xs" overflowWrap="anywhere">
                  <SlateEditor
                    value={(c.commentBodyJson as Descendant[]) || parseDescription(c.description)}
                    readOnly
                  />
                </Text>
              </Flex>
            </Flex>
          );
        }),
    [comments, dateFormatDistance, showWarningModalDeleteComment, t, user?.userId],
  );

  return (
    <Flex flexDir="column" m={0} flexGrow={1}>
      <Flex
        flexDir="column"
        gap="18px"
        // overflowY="auto"
        flex="0 0 auto"
        w="100%"
        mt="20px"
        pr="4px"
        maxH="calc(100vh - 200px)"
        onScroll={(e) => {
          if (e.target instanceof HTMLElement) {
            // call fetchMoreComments when the user scrolls to the bottom of the comments

            if (
              e.target.scrollTop + e.target.clientHeight >= e.target.scrollHeight - 100 &&
              !loadingComments
            ) {
              fetchMoreComments();
            }
          }
        }}
        overflow="scroll"
      >
        {comments?.length ? (
          commentsMemo
        ) : (
          <Text color="gray.700" fontSize="sm">
            {t('storyView.commentsEmpty', 'No Comments Added Yet')}
          </Text>
        )}
        {/* Ref to use to scroll to the bottom of the comments */}
        <div ref={commentEndRef} />
      </Flex>
      <Flex flex="0 0 130px">
        <Form onSubmit={handleSubmit(handleSubmitComment)} w="full" textAlign="right">
          <Controller
            name="description"
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <SlateEditor
                value={value}
                onChange={onChange}
                mentionList={teamUserMentionList}
                isMentionListLoading={isLoading}
                onCtrlEnter={handleSubmit(handleSubmitComment)}
                onSearchChange={setMemberSearchTerm}
                style={{
                  fontSize: '14px',
                  minHeight: '70px',
                  padding: '7px',
                  marginBottom: '10px',
                }}
              />
            )}
          />
          <Button
            isDisabled={!dirtyFields.description}
            isLoading={isSubmitting}
            _disabled={{ bg: 'blackAlpha.800', opacity: 0.2, cursor: 'not-allowed' }}
            variant="solid"
            type="submit"
            colorScheme="fuchsia"
            p="10px 12px"
          >
            {t('storyView.commentsSubmit', 'Submit')}
          </Button>
        </Form>
      </Flex>
      <ConfirmationModal
        primaryMessage={t(
          'storyView.deleteCommentConfirm',
          'Are you sure you want to delete this comment?',
        )}
        secondaryMessage={t(
          'storyView.deleteCommentConfirmDesc',
          "It can't be recovered once deleted.",
        )}
        primaryButtonText={t('common.confirm', 'confirm')}
        secondaryButtonText={t('common.cancel', 'cancel')}
        isOpen={isWarningModalOpen}
        onClose={() => {
          setIsWarningModalOpen(false);
        }}
        onPrimaryButton={warningModalCallback}
        onSecondaryButton={() => {
          setIsWarningModalOpen(false);
        }}
      />
    </Flex>
  );
};
