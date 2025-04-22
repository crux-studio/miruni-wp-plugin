import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useApolloClient } from '@apollo/client';
import { Avatar, Flex, Text, Box, Center, Tooltip, Spinner } from '@chakra-ui/react';
import { createColumnHelper, SortingState } from '@tanstack/react-table';

import {
  OnTableColumnSort,
  TableComponent,
  TRowClick,
  Assignee,
  IAssigneeEntry,
  columnHeaderData,
  PriorityPin,
  StoryTableTagComponent,
  StoryDescription,
  ColorMiruniLogo,
  StoryCategoryIcon,
  DynamicBoldText,
  highlightText,
  CheckIcon,
} from '@miruni/eds';
import {
  MyStoriesCountDocument,
  useProjectMembersLazyQuery,
  useMultipleUserAccountsByIdsQuery,
  StoriesTableWithAiQuery,
} from '@miruni/graphql';
import {
  useLocaleDateFns,
  useTeamPriorities,
  useTeamStatuses,
  useTeamStoryTypes,
  useUpdateStory,
} from '@miruni/hooks';
import { Params } from '@miruni/models';

import { ReviewSuggestionButton } from '#/admin/components/shared/review-suggestion-button';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';
import { logError } from '#/admin/utils/logging';

export type TableStory = NonNullable<StoriesTableWithAiQuery['stories']>['nodes'][0];
const TABLE_MARGIN_BOTTOM = '16px';

interface IStoryTableProps {
  stories: Array<TableStory>;
  onRowClick: TRowClick<TableStory>;
  onFetchMore: () => void;
  isFetchingMore?: boolean;
  isLoading?: boolean;
  onSort?: OnTableColumnSort;
  tableRef?: MutableRefObject<HTMLTableElement | null>;
  searchTerm: string;
}

const columnHelper = createColumnHelper<TableStory>();

export const StoryTable = ({
  stories,
  onRowClick,
  onFetchMore,
  isFetchingMore,
  isLoading,
  onSort,
  tableRef,
  searchTerm,
}: IStoryTableProps) => {
  const { t, i18n } = useTranslation();
  const { user, workspace } = useMiruniUser();
  const apolloClient = useApolloClient();
  const { dateFormatDistanceOrDate, dateFormatDistance } = useLocaleDateFns(i18n.language);
  const { updateStory } = useUpdateStory();
  // const { getPotentialAssignees } = useProjectDetails();
  const { userSnippet } = useMiruniUser();

  const contRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { goToView } = useWordPressNavigation();
  const { teamStatuses } = useTeamStatuses(userSnippet?.teamId, logError);
  const { teamStoryTypes } = useTeamStoryTypes(userSnippet?.teamId, logError);
  const { teamPriorities } = useTeamPriorities(userSnippet?.teamId, logError);

  const reporterIds = useMemo(
    () =>
      Array.from(
        new Set(
          stories?.map((s) => s.reporterId as number).filter((id) => id && id !== user?.id) || [],
        ),
      ),
    [stories, user],
  );

  const { data: reportersUserData } = useMultipleUserAccountsByIdsQuery({
    variables: {
      ids: reporterIds,
    },
    skip: !reporterIds.filter(Boolean).length,
  });

  const [getProjectMembers, { data: projectMemberData }] = useProjectMembersLazyQuery();

  useEffect(() => {
    if (!userSnippet?.projectId) return;
    getProjectMembers({
      variables: {
        projectId: userSnippet?.projectId,
      },
    }).catch(logError);
  }, [userSnippet?.projectId, getProjectMembers, projectMemberData]);

  const getPotentialAssignees = useCallback(async () => {
    const projectMembers =
      projectMemberData?.projectUserAccounts?.nodes.flatMap((m) => m.user) || [];
    return (
      projectMembers.reduce<IAssigneeEntry[]>((acc, m) => {
        if (m) {
          acc.push({
            id: m.id,
            name: m.name || m.email || '',
          });
        }
        return acc;
      }, []) || []
    );
  }, [projectMemberData?.projectUserAccounts?.nodes]);

  const getUserById = useCallback(
    (userId: number) => {
      if (userId === user?.id) {
        return {
          id: user?.id,
          name: user?.name || '',
        };
      }
      const users = reportersUserData?.userAccounts?.users || [];
      const reporter = users.find((u) => u.id === userId);
      return {
        id: reporter?.id || -1,
        name: reporter?.name || '',
      };
    },
    [reportersUserData?.userAccounts?.users, user],
  );

  const onTagSwitchClick = useCallback(
    async (
      data: {
        id: number;
        label: string;
      },
      columnName: string,
      story: TableStory,
    ) => {
      const priorityId = columnName === columnHeaderData.priorityId.name && data.id;
      const storyTypeId = columnName === columnHeaderData.storyTypeId.name && data.id;
      const statusId = columnName === columnHeaderData.statusId.name && data.id;

      const input = {
        ...(priorityId && { priorityId }),
        ...(storyTypeId && { storyTypeId }),
        ...(statusId && { statusId }),
      };

      await updateStory({
        variables: {
          id: story.id,
          input,
        },
      });
    },
    [updateStory],
  );

  const onAssigneeChange = useCallback(
    async (storyId: number, assignee: IAssigneeEntry) => {
      const originalAssignee = stories.find((s) => s.id === storyId)?.assignedUserId;
      const myAssignedStoriesChanged = originalAssignee === user?.id || assignee?.id === user?.id;

      await updateStory({
        variables: {
          id: storyId,
          input: {
            assignedUserId: assignee?.id && assignee.id !== -1 ? assignee.id : null,
          },
        },
      }).catch(window.newrelic?.noticeError);
      if (myAssignedStoriesChanged) {
        apolloClient
          .refetchQueries({
            include: [MyStoriesCountDocument],
          })
          .catch(window.newrelic?.noticeError);
      }
    },
    [apolloClient, stories, updateStory, user?.id],
  );

  const { dateFormat } = useLocaleDateFns(i18n.language);

  const handleAssigneeChange = useCallback(
    (storyId: number) => {
      return async (user: IAssigneeEntry) => {
        await onAssigneeChange(storyId, user);
      };
    },
    [onAssigneeChange],
  );

  const columns = useMemo(() => {
    return [
      columnHelper.accessor(columnHeaderData.description.name as keyof TableStory, {
        id: columnHeaderData.description.order,
        cell: (info) => {
          // const isSampleFeedback = info.row.original.description === 'Sample feedback';
          return (
            <Flex>
              <Flex as="span" align="center" justify="center" flexShrink="0">
                <Flex
                  as="span"
                  direction="row"
                  align="center"
                  p={0.5}
                  px={2}
                  gap={1}
                  bg="gray.100"
                  borderRadius="full"
                  justify={'center'}
                  maxW="min-content"
                >
                  <StoryCategoryIcon category={info.row.original.category} boxSize={'12px'} />
                  <Flex
                    as="span"
                    fontWeight="medium"
                    fontSize="12px"
                    lineHeight="14px"
                    color="gray.500"
                  >
                    <DynamicBoldText
                      text={
                        (searchTerm
                          ? highlightText(info.row.original.identifier || '', searchTerm)
                          : info.row.original.identifier) || ''
                      }
                      regex={/{{{(.*?)}}}/}
                      boldProps={{
                        backgroundColor: 'azure.100',
                      }}
                      useBraces={true}
                    />
                  </Flex>
                </Flex>
              </Flex>
              <Box as="span" flexGrow="1" pos="relative" overflow="hidden">
                <Flex as="span" alignItems="start" pl={2}>
                  <StoryDescription description={info.getValue()} searchTerm={searchTerm} />
                </Flex>
              </Box>
            </Flex>
          );
        },
        header: t('common.summary', 'Summary'),
      }),
      columnHelper.accessor(columnHeaderData.reporterId.name as keyof TableStory, {
        cell: (info) => {
          const storyDescription = info.row.original.description || '';
          if (storyDescription === 'Sample feedback') {
            return (
              <Flex justifyContent="center" alignItems="center">
                <ColorMiruniLogo h={6} w={6} />
              </Flex>
            );
          }
          const user = getUserById(info.getValue());
          return (
            <Flex justifyContent="center" alignItems="center">
              <Avatar name={user?.name || ''} title={user?.name || ''} size={'sm'} />
            </Flex>
          );
        },
        header: t('storyView.reporter', 'Reporter'),
        id: columnHeaderData.reporterId.order,
      }),
      columnHelper.accessor(columnHeaderData.statusId.name as keyof TableStory, {
        cell: (info) => {
          const status = teamStatuses.find((s) => s.id === info.getValue());
          return (
            <Flex w="full" justifyContent="center">
              <StoryTableTagComponent
                story={info?.row?.original}
                cellInfo={status?.label || ''}
                onTagSwitchClick={onTagSwitchClick}
                columnName={columnHeaderData.statusId.name}
                teamPriorities={teamPriorities}
                teamStatuses={teamStatuses}
                teamStoryTypes={teamStoryTypes}
              />
            </Flex>
          );
        },
        header: t('storyView.status', 'Status'),
        id: columnHeaderData.statusId.order,
      }),
      columnHelper.accessor(columnHeaderData.assignedUser.name as keyof TableStory, {
        cell: (info) => {
          const assignee = getUserById(info.getValue());
          return (
            <Flex justifyContent="center" alignItems="center" gap={6} py={2}>
              <PriorityPin
                priorityId={info.row.original.priorityId}
                onPriorityChange={(priorityId) => {
                  updateStory({
                    variables: {
                      id: info.row.original.id,
                      input: {
                        priorityId,
                      },
                    },
                  }).catch(window.newrelic?.noticeError);
                }}
                teamPriorities={teamPriorities}
              />
              <Assignee
                assignee={{
                  id: assignee?.id || -1,
                  name: assignee?.name || '',
                }}
                avatarProps={{
                  size: 'sm',
                  h: '1',
                  w: '1',
                }}
                popoverPlacement="left"
                projectId={info.row.original.projectId}
                onAssigneeChange={handleAssigneeChange(info.row.original.id)}
                getPotentialAssignees={getPotentialAssignees}
                unassignedLabel={t('common.unassigned', 'Unassigned')}
                searchPlaceholder={t('common.search', 'Search')}
              />
            </Flex>
          );
        },
        header: t('common.assignee', 'Assignee'),
        id: columnHeaderData.assignedUser.order,
      }),
      columnHelper.accessor(columnHeaderData.createdAt.name as keyof TableStory, {
        cell: (info) => (
          <Flex justifyContent="center">
            <Text fontSize="14px">{dateFormatDistanceOrDate(info.getValue())}</Text>
          </Flex>
        ),
        header: t('storyView.created', 'Created'),
        id: columnHeaderData.createdAt.order,
      }),
      columnHelper.accessor(columnHeaderData.updatedAt.name as keyof TableStory, {
        cell: (info) => (
          <Flex justifyContent="center">
            <Text fontSize="14px">{dateFormatDistance(info.getValue())}</Text>
          </Flex>
        ),
        header: columnHeaderData.updatedAt.name.replace(/([A-Z])/g, ' $1'),
        id: columnHeaderData.updatedAt.order,
      }),
      columnHelper.display({
        id: 'ai',
        cell: (info) => {
          const fiveMinutesAgo = new Date();
          fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
          const createdAt = new Date(info.row.original.createdAt);
          const pendingAiSuggestion = createdAt > fiveMinutesAgo;

          const suggestionAvailable = !!info.row.original.storyAiSuggestionBatches?.totalCount;
          const suggestionApplied =
            info.row.original.storyAiSuggestionBatches?.nodes?.some((batch) => batch?.appliedAt) ??
            false;

          const workspaceHasSmartEditAllowance = !!workspace?.remainingSmartEditAllowanceThisPeriod;
          if (pendingAiSuggestion && !suggestionAvailable && workspaceHasSmartEditAllowance)
            return (
              <Flex justifyContent="center" w="full" h="min-content">
                <Spinner size="sm" color="fuchsia.900" />
              </Flex>
            );
          if (!suggestionAvailable) return null;
          if (suggestionApplied)
            return (
              <Flex justifyContent="center" w="full">
                <Tooltip label="Suggestion applied">
                  <CheckIcon
                    color="malachite100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToView(ViewName.AI_PREVIEW, {
                        [Params.STORY_ID]: String(info.row.original.id),
                      });
                    }}
                  />
                </Tooltip>
              </Flex>
            );
          return (
            <Flex justifyContent="center" w="full">
              <ReviewSuggestionButton storyId={info.row.original.id} />
            </Flex>
          );
        },
        header: '⚡️ Smart Edit',
      }),
    ];
  }, [
    t,
    searchTerm,
    getUserById,
    teamStatuses,
    onTagSwitchClick,
    teamPriorities,
    teamStoryTypes,
    handleAssigneeChange,
    getPotentialAssignees,
    updateStory,
    dateFormatDistanceOrDate,
    dateFormatDistance,
    dateFormat,
  ]);

  const renderIfEmpty = () =>
    !isLoading && (
      <Center as="span" p="24px" flexDir="column" gap="8px" fontSize="14px" color="black70">
        <Text as="span" fontWeight="700">
          {t('storyView.startAddingStories', '💬 Start adding stories')}
        </Text>
      </Center>
    );

  return (
    <Flex
      ref={contRef}
      pos="relative"
      flexGrow="1"
      mb={TABLE_MARGIN_BOTTOM}
      id="story-table-outer"
      minH="85vh"
    >
      {isLoading && !stories && <Spinner pos="absolute" inset="0" />}
      <Box pos="absolute" inset="0">
        <TableComponent
          tableProps={{ ref: tableRef, layout: 'fixed', minW: '1024px' }}
          h="100%"
          minH="85vh"
          data={stories}
          columns={columns}
          columnHeaderData={columnHeaderData}
          estimateSize={40}
          onRowClick={onRowClick}
          onFetchMore={onFetchMore}
          isFetchingMore={isFetchingMore}
          onSort={onSort}
          sorting={sorting}
          setSorting={setSorting}
          thProps={{ bg: 'white', textAlign: 'center', w: '120px', zIndex: 10 }}
          tdProps={{ py: 1, px: 1 }}
          renderIfEmpty={renderIfEmpty}
        />
      </Box>
    </Flex>
  );
};
