import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { NetworkStatus } from '@apollo/client';
import { Container, VStack, Text, useDisclosure, Flex, Button } from '@chakra-ui/react';

import { TRowClick, useStoryTableSort } from '@miruni/eds';
import { FilterType, useStoriesTableWithAiLazyQuery } from '@miruni/graphql';
import { useTeamFilters } from '@miruni/hooks';
import { Params } from '@miruni/models';

import { StoryDetailsDrawer } from '#/admin/components/dashboard/story-details/story-details-drawer.component';
import { GET_SITE_FEEDBACK_BUTTON_ID } from '#/admin/constants/ids';
import { useInviteUserModal } from '#/admin/hooks/use-invite-collaborator-modal';
import { useListStoryFilters } from '#/admin/hooks/use-list-story-filters';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation } from '#/admin/hooks/use-wp-nav';
import { logError } from '#/admin/utils/logging';

import { StoryTableHeader } from './story-table-header';
import { StoryTable, TableStory } from './story-table.component';

const DEFAULT_TABLE_SIZE = 25;
let abortController = new AbortController();

export const DashboardStoryView = () => {
  const { getQueryParams, updateQueryParams } = useWordPressNavigation();
  let storyId: string | string[] | undefined = getQueryParams()?.[Params.STORY_ID];

  const [searchTerm, setSearchTerm] = useState<string>('');
  const { userSnippet } = useMiruniUser();
  const { teamFilters } = useTeamFilters(userSnippet?.teamId, logError);
  const { openInviteUserModal } = useInviteUserModal();
  const {
    isOpen: isOpenStoryDetails,
    onOpen: onOpenStoryDetails,
    onClose: onCloseStoryDetails,
  } = useDisclosure({
    id: 'story-details-drawer',
    defaultIsOpen: !!storyId,
  });
  if (Array.isArray(storyId)) storyId = storyId[0];

  const { filtersLoading, handleFilter, getFilters, getFiltersForQuery, resetFilters } =
    useListStoryFilters(FilterType.Project);

  const [fetchStories, { data, loading, fetchMore, networkStatus }] =
    useStoriesTableWithAiLazyQuery({
      fetchPolicy: 'cache-first',
      // onCompleted: onReady,
    });

  const stories = data?.stories?.nodes;

  const tableRef = useRef(null);
  const { onSort, sortBy } = useStoryTableSort();

  const combinedFilters = useMemo(() => {
    let filters = getFiltersForQuery();
    if (filtersLoading) return;
    if (searchTerm) {
      filters = {
        ...filters,
        or: [
          { identifier: { includesInsensitive: searchTerm } },
          { description: { includesInsensitive: searchTerm } },
        ],
      };
    }
    const projectId = userSnippet?.projectId;
    if (!projectId) return filters;
    return { ...filters, projectId: { eq: projectId } };
  }, [getFiltersForQuery, filtersLoading, searchTerm, userSnippet?.projectId]);

  useEffect(() => {
    if (!storyId) return;
    onOpenStoryDetails();
  }, [onOpenStoryDetails, storyId]);

  useEffect(() => {
    const projectId = userSnippet?.projectId;
    if (!projectId) return;

    const existingFilterProjectId = combinedFilters?.projectId;
    if (existingFilterProjectId?.eq === projectId) return;
    handleFilter('projectId', projectId, { dontSave: true });
  }, [combinedFilters?.projectId, getFilters, handleFilter, userSnippet?.projectId]);

  useEffect(() => {
    if (filtersLoading || !combinedFilters || Object.keys(combinedFilters).length === 0) {
      return;
    }

    // Only abort the previous fetch if we already have data for the table
    data && abortController.abort('Abort previous fetchStories query');

    const fetchData = async () => {
      try {
        abortController = new AbortController();

        await fetchStories({
          variables: {
            filters: combinedFilters,
            orderBy: sortBy.length > 0 ? sortBy : undefined,
            first: DEFAULT_TABLE_SIZE,
            offset: 0,
          },
          context: { fetchOptions: { signal: abortController.signal } },
        });
      } catch (error) {
        window.newrelic?.noticeError(error as Error);
      }
    };

    fetchData().catch(window.newrelic?.noticeError);
  }, [fetchStories, combinedFilters, filtersLoading, sortBy, data]);

  const isFetchingMore = useCallback(
    () => loading && networkStatus === NetworkStatus.fetchMore,
    [loading, networkStatus],
  );

  const onRowClick: TRowClick<TableStory> = useCallback(
    (row) => {
      const currentParams = getQueryParams();
      currentParams[Params.STORY_ID] = row.original.id.toString();
      updateQueryParams(currentParams);
    },
    [updateQueryParams, getQueryParams],
  );

  const loadMoreStories = useCallback(async () => {
    if (!stories?.length || loading || stories?.length === data?.stories?.totalCount) return;
    const filters = getFiltersForQuery();

    const variables = {
      filters: filters,
      orderBy: sortBy.length > 0 ? sortBy : undefined,
      first: DEFAULT_TABLE_SIZE,
      offset: stories?.length,
    };

    fetchMore({
      variables,
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        const existingNodes = prev.stories?.nodes || [];
        const newNodes = fetchMoreResult.stories?.nodes || [];
        const existingNodeIds = existingNodes.map((n) => n.id);
        const newNodesFiltered = newNodes.filter((n) => !existingNodeIds.includes(n.id));
        return {
          stories: {
            ...prev.stories,
            nodes: [...existingNodes, ...newNodesFiltered],
            totalCount: fetchMoreResult.stories?.totalCount || 0,
          },
        };
      },
    }).catch(window.newrelic?.noticeError);
  }, [loading, stories?.length, data?.stories?.totalCount, getFiltersForQuery, sortBy, fetchMore]);

  return (
    <VStack>
      <Container maxW="full">
        <Flex mb={2} flexShrink="0" alignItems="center" justifyContent="space-between">
          <Text fontSize="xl">{userSnippet?.project?.projectName}</Text>
          <Button
            variant="solid"
            rounded="full"
            color="white"
            bg="black"
            onClick={openInviteUserModal}
            id={GET_SITE_FEEDBACK_BUTTON_ID}
          >
            Get site feedback
          </Button>
        </Flex>
        <StoryTableHeader
          headerText="Edit Requests"
          setSearchTerm={setSearchTerm}
          handleFilter={handleFilter}
          // No need to show the project filter in wordpress since we only have one project
          filters={teamFilters.filter((f) => f.name !== 'PROJECT_ID')}
          getFilters={getFilters}
          resetFilters={resetFilters}
        />
      </Container>
      <Container maxW="full">
        <StoryTable
          stories={data?.stories?.nodes || []}
          onRowClick={onRowClick}
          onFetchMore={loadMoreStories}
          isFetchingMore={isFetchingMore()}
          isLoading={
            (loading && networkStatus !== NetworkStatus.fetchMore) ||
            networkStatus !== NetworkStatus.ready
          }
          onSort={onSort}
          tableRef={tableRef}
          searchTerm={searchTerm}
        />
      </Container>
      {storyId !== undefined && userSnippet && (
        <StoryDetailsDrawer
          isOpenStoryDetails={isOpenStoryDetails}
          onCloseStoryDetails={onCloseStoryDetails}
          projectId={userSnippet?.projectId}
          storyId={parseInt(storyId)}
          tableRef={tableRef}
        />
      )}
    </VStack>
  );
};
