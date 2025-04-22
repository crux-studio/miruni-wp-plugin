import { useEffect, useMemo, useState } from 'react';

import { UserAccountFilter, useUsersMinimalLazyQuery } from '@miruni/graphql';

const DEFAULT_PAGE_SIZE = 10;

export const useSearchUserMinimal = (teamId?: number, pageSize = DEFAULT_PAGE_SIZE) => {
  const [searchTerm, setMemberSearchTerm] = useState('');
  const [searchTeamMembers, { data, loading: isLoading }] = useUsersMinimalLazyQuery({
    fetchPolicy: 'cache-first',
  });
  const teamMembers = useMemo(() => data?.userAccounts?.nodes ?? [], [data]);

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

  useEffect(() => {
    if (!searchTeamMembersFilter) return;
    searchTeamMembers({
      variables: {
        first: pageSize,
        filter: searchTeamMembersFilter,
      },
    }).catch(window.newrelic?.noticeError);
  }, [searchTeamMembers, searchTerm, teamId, searchTeamMembersFilter, pageSize]);

  return { teamMembers, isLoading, setMemberSearchTerm };
};
