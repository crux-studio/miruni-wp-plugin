import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HandleFilter, TruncatedText } from '@miruni/eds';
import { FilterAutocompleteMenuWithSearch } from '@miruni/eds/src/components/filter/filter-autocomplete-search.component';
import { ProjectsListQuery, SelectableAttrName, useProjectsListLazyQuery } from '@miruni/graphql';
import { IAutocompleteOption } from '@miruni/models';

interface ProjectAutocompleteMenuProps {
  teamId: number;
  handleFilter: HandleFilter<number[]>;
  selectedFilters: number[];
}

export const ProjectAutocompleteMenu: FC<ProjectAutocompleteMenuProps> = ({
  teamId,
  handleFilter,
  selectedFilters,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchProjects, { data, fetchMore }] = useProjectsListLazyQuery({
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    searchProjects({
      variables: {
        teamId,
        first: 10,
        searchTerm: searchTerm,
      },
    }).catch(window.newrelic?.noticeError);
  }, [searchProjects, searchTerm, teamId]);

  const fetchMoreProjects = useCallback(() => {
    fetchMore({
      variables: {
        teamId,
        first: 10,
        searchTerm: searchTerm,
        after: data?.projects?.pageInfo?.endCursor,
      },
      updateQuery: (previousQueryResult, options) => {
        const newProjects = options.fetchMoreResult?.projects?.nodes;
        if (!newProjects) return previousQueryResult;
        const pageInfo = options.fetchMoreResult?.projects?.pageInfo;
        const existingNodes = previousQueryResult?.projects?.nodes || [];
        const existingNodeIds = existingNodes.map((n) => n.id);
        return {
          projects: {
            nodes: [
              ...existingNodes,
              ...newProjects.filter((n) => !existingNodeIds.includes(n.id)),
            ],
            pageInfo,
            totalCount: options.fetchMoreResult?.projects?.totalCount || 0,
          },
        } as ProjectsListQuery;
      },
    }).catch(window.newrelic?.noticeError);
  }, [data?.projects?.pageInfo?.endCursor, fetchMore, searchTerm, teamId]);

  const options: IAutocompleteOption[] = useMemo(
    () =>
      data?.projects?.nodes?.map((project) => ({
        id: project.id,
        label: project?.projectName || '',
        renderLabel: <TruncatedText maxW="200px">{project.projectName}</TruncatedText>,
      })) || [],
    [data],
  );

  const selectedOptions = options.filter((option) =>
    selectedFilters?.includes(option.id as number),
  );

  return (
    <FilterAutocompleteMenuWithSearch
      clearAllLabel={t('filters.clearAll', 'Clear All')}
      attrName={SelectableAttrName.ProjectId}
      label={t('miruniTypes.projects', 'Projects')}
      handleFilterReset={() => {
        setSearchTerm('');
        handleFilter([]);
      }}
      selectedFilters={selectedOptions}
      handleFilter={handleFilter}
      options={options}
      onInputChange={setSearchTerm}
      onMenuScrollToBottom={fetchMoreProjects}
      peopleCountLabel={t('filters.people', {
        count: selectedOptions?.length,
        defaultValue: '{{count}} people',
      })}
      searchLabel={t('filters.search', 'Search')}
    />
  );
};
