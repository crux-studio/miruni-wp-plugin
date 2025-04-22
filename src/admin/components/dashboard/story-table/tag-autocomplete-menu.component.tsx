import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HandleFilter } from '@miruni/eds';
import { FilterAutocompleteMenuWithSearch } from '@miruni/eds/src/components/filter/filter-autocomplete-search.component';
import { SelectableAttrName, TeamMembersQuery, useTagsLazyQuery } from '@miruni/graphql';
import { IAutocompleteOption } from '@miruni/models';

interface TagAutocompleteMenuProps {
  teamId: number;
  handleFilter: HandleFilter<number[]>;
  selectedFilters: number[];
}

export const TagAutocompleteMenu: FC<TagAutocompleteMenuProps> = ({
  teamId,
  handleFilter,
  selectedFilters,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTeamMembers, { data, fetchMore }] = useTagsLazyQuery({
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    searchTeamMembers({
      variables: {
        teamId,
        search: searchTerm,
      },
    }).catch(window.newrelic?.noticeError);
  }, [searchTeamMembers, searchTerm, teamId]);

  const fetchMoreTeamMembers = useCallback(() => {
    fetchMore({
      variables: {
        teamId,
        first: 10,
        searchTerm: searchTerm,
        after: data?.tags?.pageInfo?.endCursor,
      },
      updateQuery: (previousQueryResult, options) => {
        const newTags = options.fetchMoreResult?.tags?.nodes;
        if (!newTags) return previousQueryResult;
        const pageInfo = options.fetchMoreResult?.tags?.pageInfo;
        const existingNodes = previousQueryResult?.tags?.nodes || [];
        const existingNodeIds = new Set(existingNodes.map((n) => n.id));
        return {
          tags: {
            nodes: [...existingNodes, ...newTags.filter((n) => !existingNodeIds.has(n.id))],
            pageInfo,
          },
        } as TeamMembersQuery;
      },
    }).catch(window.newrelic?.noticeError);
  }, [data?.tags?.pageInfo?.endCursor, fetchMore, searchTerm, teamId]);

  const options: IAutocompleteOption[] = useMemo(() => {
    const tagOptions =
      data?.tags?.nodes.map((tag) => {
        const label = tag.title || '';
        return {
          id: tag?.id as number,
          label,
        };
      }) || ([] as IAutocompleteOption[]);

    return tagOptions;
  }, [data?.tags?.nodes]);

  const selectedOptions = options.filter((option) =>
    selectedFilters?.includes(option.id as number),
  );

  return (
    <FilterAutocompleteMenuWithSearch
      clearAllLabel={t('filters.clearAll', 'Clear All')}
      attrName={SelectableAttrName.TagIds}
      label={t('common.tag.name', 'Tag')}
      handleFilterReset={() => {
        setSearchTerm('');
        handleFilter([]);
      }}
      selectedFilters={selectedOptions}
      handleFilter={handleFilter}
      options={options}
      onInputChange={setSearchTerm}
      onMenuScrollToBottom={fetchMoreTeamMembers}
      peopleCountLabel={t('filters.people', {
        count: selectedOptions?.length,
        defaultValue: '{{count}} people',
      })}
      searchLabel={t('filters.search', 'Search')}
    />
  );
};
