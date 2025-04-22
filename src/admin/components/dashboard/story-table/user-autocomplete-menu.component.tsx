import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar, HStack, Text } from '@chakra-ui/react';

import { HandleFilter, TruncatedText } from '@miruni/eds';
import { FilterAutocompleteMenuWithSearch } from '@miruni/eds/src/components/filter/filter-autocomplete-search.component';
import {
  SelectableAttrName,
  TeamMembersQuery,
  UserAccountFilter,
  useUsersMinimalLazyQuery,
} from '@miruni/graphql';
import { IAutocompleteOption } from '@miruni/models';

const DEFAULT_PAGE_SIZE = 10;

interface UserAutocompleteMenuProps {
  teamId: number;
  handleFilter: HandleFilter<number[]>;
  selectedFilters: number[];
  includeUnassigned?: boolean;
  label: string;
  attrName: SelectableAttrName;
}

export const UserAutocompleteMenu: FC<UserAutocompleteMenuProps> = ({
  teamId,
  handleFilter,
  selectedFilters,
  includeUnassigned,
  label,
  attrName,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTeamMembers, { data, fetchMore }] = useUsersMinimalLazyQuery({
    fetchPolicy: 'cache-first',
  });
  const [searchSelectedTeamMembers, { data: selectedTeamMembers }] = useUsersMinimalLazyQuery({
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    const selectedFilterIdsNotInData = selectedFilters?.filter(
      (filter) => !data?.userAccounts?.nodes?.some((node) => node.id === filter),
    );

    if (selectedFilterIdsNotInData?.length) {
      searchSelectedTeamMembers({
        variables: {
          first: selectedFilterIdsNotInData.length,
          filter: {
            id: {
              in: selectedFilterIdsNotInData,
            },
          },
        },
      }).catch(window.newrelic?.noticeError);
    }
  }, [data, fetchMore, searchSelectedTeamMembers, selectedFilters, teamId]);

  const searchTeamMembersFilter: UserAccountFilter = useMemo(() => {
    let userOrFilters: NonNullable<UserAccountFilter>['or'] = [
      { fullName: { includesInsensitive: searchTerm } },
      { email: { includesInsensitive: searchTerm } },
    ];
    // No point in searching by name if there's an @
    if (searchTerm.includes('@')) {
      userOrFilters = userOrFilters.filter((filter) => filter.email);
      // No point in searching by email if there's a space
    } else if (searchTerm.includes(' ')) {
      userOrFilters = userOrFilters.filter((filter) => filter.fullName);
    }

    return {
      or: userOrFilters,
      teamUserAccountsByUserId: {
        some: {
          teamId: {
            eq: teamId,
          },
        },
      },
    };
  }, [searchTerm, teamId]);

  const pageSize = useMemo(
    () => DEFAULT_PAGE_SIZE + (selectedFilters?.length || 0),
    [selectedFilters],
  );

  useEffect(() => {
    if (!searchTeamMembersFilter) return;
    searchTeamMembers({
      variables: {
        first: pageSize,
        filter: searchTeamMembersFilter,
      },
    }).catch(window.newrelic?.noticeError);
  }, [searchTeamMembers, searchTerm, teamId, searchTeamMembersFilter, pageSize]);

  const fetchMoreTeamMembers = useCallback(() => {
    fetchMore({
      variables: {
        teamId,
        first: pageSize,
        filters: searchTeamMembersFilter,
        after: data?.userAccounts?.pageInfo?.endCursor,
      },
      updateQuery: (previousQueryResult, options) => {
        const newTeamMembers = options.fetchMoreResult?.userAccounts?.nodes;
        if (!newTeamMembers) return previousQueryResult;
        const pageInfo = options.fetchMoreResult?.userAccounts?.pageInfo;
        const existingNodes = previousQueryResult?.userAccounts?.nodes || [];
        const existingNodeIds = new Set(existingNodes.map((n) => n.id));
        return {
          userAccounts: {
            nodes: [...existingNodes, ...newTeamMembers.filter((n) => !existingNodeIds.has(n.id))],
            pageInfo,
            totalCount: options.fetchMoreResult?.userAccounts?.totalCount || 0,
          },
        } as TeamMembersQuery;
      },
    }).catch(window.newrelic?.noticeError);
  }, [
    fetchMore,
    teamId,
    pageSize,
    searchTeamMembersFilter,
    data?.userAccounts?.pageInfo?.endCursor,
  ]);

  const options: IAutocompleteOption[] = useMemo(() => {
    const users = [
      ...(data?.userAccounts?.nodes || []),
      ...(selectedTeamMembers?.userAccounts?.nodes.filter(
        (u) => !data?.userAccounts?.nodes?.some((node) => node.id === u.id),
      ) || []),
    ];
    const userOptions =
      users.map((user) => {
        const label = user?.name || user?.email || '';
        return {
          id: user?.id as number,
          label,
          icon: <Avatar key={label} name={label} title={label} size="14" />,
          renderLabel: (
            <HStack gap="4px">
              <Avatar name={label} title={label} size="14" />
              <TruncatedText maxW="200px">{label}</TruncatedText>
              {/* <Spacer />
                <Text as="span" fontSize="10px" lineHeight="14px" color="black60">
                  {/* TODO: replace hardcoded value *\/}
                  {t('', { count: 5, defaultValue: '{{count}} stories' })}
                </Text> */}
            </HStack>
          ),
        };
      }) || ([] as IAutocompleteOption[]);

    if (!includeUnassigned) {
      return userOptions;
    }

    return [
      {
        id: -1,
        label: t('common.unassigned', 'Unassigned'),
        icon: (
          <Avatar
            key="Unassigned"
            name={t('common.unassigned', 'Unassigned')}
            title={t('common.unassigned', 'Unassigned')}
            size="14"
          />
        ),
        renderLabel: (
          <HStack gap="4px">
            <Avatar
              name={t('common.unassigned', 'Unassigned')}
              title={t('common.unassigned', 'Unassigned')}
              size="14"
            />
            <Text as="span" whiteSpace="nowrap">
              {t('common.unassigned', 'Unassigned')}
            </Text>
            {/* <Spacer />
            <Text as="span" fontSize="10px" lineHeight="14px" color="black60">
              {/* TODO: replace hardcoded value *\/}
              {t('', { count: 5, defaultValue: '{{count}} stories' })}
            </Text> */}
          </HStack>
        ),
      },
      ...userOptions,
    ];
  }, [data?.userAccounts?.nodes, includeUnassigned, selectedTeamMembers?.userAccounts?.nodes, t]);

  const selectedOptions = options.filter((option) =>
    selectedFilters?.includes(option.id as number),
  );

  return (
    <FilterAutocompleteMenuWithSearch
      label={label}
      attrName={attrName}
      handleFilterReset={() => {
        setSearchTerm('');
        handleFilter([]);
      }}
      selectedFilters={selectedOptions}
      handleFilter={handleFilter}
      options={options}
      onInputChange={setSearchTerm}
      onMenuScrollToBottom={fetchMoreTeamMembers}
      autoFilter={false}
      clearAllLabel={t('filters.clearAll', 'Clear All')}
      peopleCountLabel={t('filters.people', {
        count: selectedOptions?.length,
        defaultValue: '{{count}} people',
      })}
      searchLabel={t('filters.search', 'Search')}
    />
  );
};
