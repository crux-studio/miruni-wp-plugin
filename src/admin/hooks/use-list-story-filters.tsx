import { useCallback, useEffect, useMemo, useState } from 'react';

import { ParsedUrlQuery } from 'querystring';

import { useApolloClient } from '@apollo/client';

import { IFilter } from '@miruni/eds';
import {
  DateFilter,
  FilterType,
  GetUserTableFilterDocument,
  ProjectFilter,
  SelectableAttrName,
  SelectableAttrType,
  StoriesTableQueryVariables,
  StoryFilter,
  useAllFiltersLazyQuery,
  useCreateUserTableFilterMutation,
  useGetUserTableFilterLazyQuery,
} from '@miruni/graphql';
import { toCamelCase, toPascalCase } from '@miruni/utils';

import { useMiruniUser } from './use-miruni-user';
import { useWordPressNavigation } from './use-wp-nav';

const ASSIGNEE_FILTER_NAME = 'ASSIGNEE';

const URL_PARAM_FILTER_DELIMITER = '_';

const ARRAY_FILTERS = ['tagIds'] as unknown as (keyof StoryFilter | ProjectFilter)[];
export enum DateRangeOption {
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_7_DAYS = 'LAST_7_DAYS',
  // Add more options as needed
}

export const paramsHaveChanged = (params: ParsedUrlQuery, newParams: ParsedUrlQuery) => {
  // If one of the params is an array of one element, we want to compare the first element
  const paramsKeys = Object.keys(params);
  const newParamsKeys = Object.keys(newParams);
  if (paramsKeys.length !== newParamsKeys.length) return true;
  for (const key of paramsKeys) {
    if (Array.isArray(params[key]) && params[key]?.length === 1) {
      const paramsVal = params[key]?.[0];
      if (paramsVal !== newParams[key]) return true;
    } else if (typeof params[key] === 'object' && typeof newParams[key] === 'object') {
      if (JSON.stringify(params[key]) !== JSON.stringify(newParams[key])) return true;
    } else if (params[key] !== newParams[key]) {
      return true;
    }
  }
  return false;
};

export const convertFilterToParams = (filter: StoriesTableQueryVariables['filters']) => {
  const params: { key: string; value: string[] }[] = [];
  if (!filter) return params;

  Object.entries(filter).forEach(([key, value]) => {
    // if value is object
    if (value && typeof value === 'object') {
      const existingParam = params.find((p) => p.key === key) || { key, value: [] };
      Object.entries(value).forEach(([k, v]) => {
        if (Object.values(DateRangeOption).includes(v as DateRangeOption)) {
          existingParam.value.push(v);
        } else {
          existingParam.value.push(`${k}${URL_PARAM_FILTER_DELIMITER}${JSON.stringify(v)}`);
        }
      });
      params.push(existingParam);
    } else if (value !== null && value !== undefined) {
      params.push({ key, value: [String(value)] });
    }
  });
  return params;
};

export const getFiltersFromParams = <Filter extends StoryFilter | ProjectFilter>(
  query: Record<string, string | string[]>,
) => {
  const params = Object.entries(query).map(([key, value]) => ({ key, value }));
  const filter = convertParamsToFilter<Filter>(params);

  if (Object.keys(filter).length === 0) return undefined;
  return filter;
};

export const convertDateRangeToFilter = (dateRange: DateRangeOption): DateFilter => {
  const now = new Date();
  switch (dateRange) {
    case DateRangeOption.LAST_30_DAYS:
      return {
        gte: new Date(now.setDate(now.getDate() - 30)),
        lte: new Date(),
      };
    case DateRangeOption.LAST_7_DAYS:
      return {
        gte: new Date(now.setDate(now.getDate() - 7)),
        lte: new Date(),
      };
    // Add more cases for other date range options
    default:
      throw new Error('Invalid date range option ' + dateRange);
  }
};

const convertParamsToFilter = <Filter extends StoryFilter | ProjectFilter>(
  params: { key: string; value: string | string[] | undefined }[],
) => {
  let filter: Filter = {} as Filter;
  params.forEach(({ key, value }) => {
    const _key = key as keyof Filter;

    if (!value) return;
    // Values like dates have 2 params (gte and lte) and are stored as an array
    if (Array.isArray(value)) {
      const _val = value
        .filter((v) => v !== null && v !== undefined)
        .reduce((acc, v) => {
          if (v.includes(URL_PARAM_FILTER_DELIMITER)) {
            const [k, _v] = v.split(URL_PARAM_FILTER_DELIMITER);
            const _k = k as string;
            if (_v) {
              acc[_k] = JSON.parse(_v) as DateFilter;
            }
          }
          return acc;
        }, {} as Record<string, DateFilter>);
      filter = { ...filter, [_key]: _val };
    } else if (Object.values(DateRangeOption).includes(value as DateRangeOption)) {
      filter = { ...filter, [_key]: value };
    } else if (value.includes(URL_PARAM_FILTER_DELIMITER)) {
      const [k, v] = value.split(URL_PARAM_FILTER_DELIMITER);
      if (v) {
        const _val = JSON.parse(v) as Filter[keyof Filter];
        filter[_key] = {
          [k]: _val,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
    }

    if (value === 'true') {
      filter = { ...filter, [_key]: true };
    } else if (value === 'false') {
      filter = { ...filter, [_key]: false };
    }
  });
  return filter;
};

/**
 * @description Values come in as strings, numbers or arrays
 * If the value is not an array, we return a filter with the 'eq' operator like { eq: value }
 * If the value is an array of 2 date strings, we return a filter with the 'gte' and 'lte' operator like { gte: value[0], lte: value[1] }
 * If the value is an array of strings or numbers, we return a filter with the 'in' operator like { in: value }
 */
export const convertValueToFilter = <T extends StoryFilter | ProjectFilter = StoryFilter>(
  key: keyof T,
  value: string | number | (string | number | Date)[] | undefined,
) => {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    // remove duplicates
    value = Array.from(new Set(value));
    if (value.length === 2 && value[0] instanceof Date && value[1] instanceof Date) {
      return {
        [key]: {
          gte: value[0],
          lte: value[1],
        },
      };
    } else if (ARRAY_FILTERS.includes(key as keyof StoryFilter)) {
      return {
        [key]: {
          overlaps: value.filter((v) => v !== null && v !== undefined) as
            | string[]
            | number[]
            | Date[],
        },
      };
    } else {
      return {
        [key]: {
          in: value?.filter((v) => v !== null && v !== undefined) as string[] | number[] | Date[],
        },
      };
    }
  }

  if (key === 'storyAttachmentsExist') {
    return {
      [key]: value,
    };
  }

  return { [key]: { eq: value } };
};

export const useListStoryFilters = (type: FilterType) => {
  const { getQueryParams, replaceQueryParams } = useWordPressNavigation();
  const { user, userSnippet } = useMiruniUser();
  const selectedTeamId = userSnippet?.teamId;
  const selectedWorkspaceId = userSnippet?.workspaceId;
  const [getUserTableFilter, { data: userTableFilterData, loading }] =
    useGetUserTableFilterLazyQuery({
      fetchPolicy: 'network-only',
    });

  const [searchTerm, setSearchTerm] = useState('' as string);
  const projectId = userSnippet?.projectId;
  const [createUserTableFilter] = useCreateUserTableFilterMutation({
    errorPolicy: 'ignore',
    update: (cache, { data }) => {
      if (!data?.createUserTableFilter?.userTableFilter?.filter) return;
      const newFilter = data.createUserTableFilter?.userTableFilter?.filter;
      if (!newFilter || !Object.keys(newFilter).length) return;
      cache.modify({
        fields: {
          userTableFilters: (existingFilters = []) => {
            return {
              ...existingFilters,
              nodes: [data.createUserTableFilter?.userTableFilter],
            };
          },
        },
      });
    },
  });

  const [getFilters, { data: filtersData, loading: filtersLoading }] = useAllFiltersLazyQuery({
    variables: {
      params: {
        teamId: selectedTeamId,
      },
      attrName: '*',
      teamId: selectedTeamId as number,
    },
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    if (!projectId || !type || !user?.id) return;
    getUserTableFilter({
      variables: {
        filterTypeId: projectId,
        filterType: type,
        userId: user.id,
      },
    }).catch(window.newrelic?.noticeError);
  }, [getUserTableFilter, projectId, type, user]);

  const combineFilterWithParams = useCallback(
    (filter: StoryFilter, updateRoute = true) => {
      if (loading) return;
      // To know which params to remove from the URL, we're passing in
      // null values for the filters that are not present in the new filter
      const params = convertFilterToParams(filter);

      const paramsObj = params.reduce((acc, { key, value }) => {
        if (value !== null) acc[key] = value;
        return acc;
      }, {} as Record<string, string | string[]>);

      // Remove the params that are not present in the new filter
      const updatedRouterQuery = Object.entries(getQueryParams()).reduce((acc, [key, value]) => {
        if (filter[key as keyof StoryFilter] !== null) acc[key] = value as string;
        return acc;
      }, {} as Record<string, string | string[]>);

      const query = {
        ...updatedRouterQuery,
        ...paramsObj,
      };

      // if query is the same as the current query, don't update the route
      if (!paramsHaveChanged(query, getQueryParams()) || !updateRoute) return filter;

      replaceQueryParams(query);
      return filter;
    },
    [getQueryParams, loading],
  );

  useEffect(() => {
    const filters = userTableFilterData?.userTableFilters?.nodes?.[0]?.filter;
    combineFilterWithParams(filters || {});
  }, [
    projectId,
    selectedWorkspaceId,
    type,
    combineFilterWithParams,
    userTableFilterData?.userTableFilters?.nodes,
  ]);

  // Wait for the teamId to be set before fetching the filters
  useEffect(() => {
    if (!selectedTeamId) return;
    getFilters().catch(window.newrelic?.noticeError);
  }, [selectedTeamId, getFilters]);

  const formatStoryTableFilters = (filters: Array<IFilter>): Array<IFilter> =>
    filters.map((f) => {
      const pascalCaseName = toPascalCase(f.name.toString()) as keyof typeof SelectableAttrName;
      const pascalCaseType = toPascalCase(f.type.toString()) as keyof typeof SelectableAttrType;
      const name: SelectableAttrName = SelectableAttrName[pascalCaseName];
      const type: SelectableAttrType = SelectableAttrType[pascalCaseType];

      return { ...f, name, type };
    });

  // Filters are stored but if we make a call to the API, we want to update the store with
  // the formatted filters
  const filters = useMemo(() => {
    // Add teamMembers to the options of the assignee filter
    if (!filtersData) return [];

    const selectableFilters = (filtersData?.getSelectable || []) as Array<IFilter>;
    const formattedFilters = formatStoryTableFilters(selectableFilters);
    const teamMembers = filtersData?.teamUserAccounts?.nodes || [];
    const assigneeFilter = formattedFilters.find((f) => f.name === ASSIGNEE_FILTER_NAME);
    if (!assigneeFilter) return formattedFilters;

    const assigneeFilterOptions = teamMembers.map((tm) => ({
      key: tm?.user?.id,
      val: tm?.user?.name,
    }));

    // Add assignee filter options to the assignee filter
    const filtersWithAssigneeOptions = formattedFilters.map((f) => {
      if (f.name === ASSIGNEE_FILTER_NAME) {
        return {
          ...f,
          options: assigneeFilterOptions,
        };
      }
      return f;
    });

    return filtersWithAssigneeOptions;
  }, [filtersData]);

  /**
   * @description Receives a field to filter by and a value to filter by
   * If the value is an array, it will use the 'in' operator, otherwise it will use the 'eq' operator
   * This is then used to update the URL with the new filter
   */
  const handleFilter = useCallback(
    (
      filterName: string,
      value: string | number | Array<string | number>,
      options?: {
        dontSave?: boolean;
      },
    ): StoryFilter => {
      const filterColumnName = filters?.find((f) => f.name == filterName)?.filterColumn;
      if (!filterColumnName && !['projectId'].includes(filterName)) return {};
      const filterColumn = filterColumnName
        ? (toCamelCase(filterColumnName) as keyof StoryFilter)
        : (filterName as keyof StoryFilter);

      // We might want to have more operators in the future
      // but for now, it's safe to assume that if the value is an array, we want to use the 'in' operator
      const filterValue = convertValueToFilter(filterColumn, value);

      const persistedFilters = userTableFilterData?.userTableFilters?.nodes?.[0]?.filter || {};

      const filtersFromParams = getFiltersFromParams<StoryFilter>(getQueryParams());

      const filtersObject = {
        ...persistedFilters,
        ...filtersFromParams,
        ...filterValue,
      };

      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        filtersObject[filterColumn] = null;
      }

      const filtersToSave = combineFilterWithParams(filtersObject, false);
      const filtersHaveChanged = JSON.stringify(persistedFilters) !== JSON.stringify(filtersToSave);
      if (
        filtersToSave &&
        Object.keys(filtersToSave).length &&
        projectId &&
        type &&
        user?.id &&
        userTableFilterData &&
        !loading &&
        filtersHaveChanged
      ) {
        // If we're persisting the filters, we want to save the filters to the database
        if (!options?.dontSave) {
          createUserTableFilter({
            variables: {
              input: {
                userTableFilter: {
                  filter: filtersToSave,
                  filterTypeId: projectId as number,
                  filterType: type,
                  userId: user?.id as number,
                },
              },
            },
            optimisticResponse: () => {
              return {
                createUserTableFilter: {
                  userTableFilter: {
                    id: -1,
                    nodeId: '',
                    createdAt: '',
                    updatedAt: '',
                    filter: filtersToSave,
                    filterTypeId: projectId as number,
                    filterType: type,
                    userId: user?.id as number,
                    __typename: 'UserTableFilter',
                  },
                  __typename: 'CreateUserTableFilterPayload',
                },
              };
            },
          }).catch(window.newrelic?.noticeError);
          // otherwise, we just want to update the URL
        } else {
          combineFilterWithParams(filtersToSave);
        }
      }
      return filtersObject;
    },
    [
      filters,
      userTableFilterData,
      combineFilterWithParams,
      projectId,
      type,
      user?.id,
      loading,
      createUserTableFilter,
    ],
  );

  const client = useApolloClient();

  const resetFilters = useCallback(() => {
    const filterColumns = filters.map(({ filterColumn }) => toCamelCase(filterColumn));
    const currentParams = new URLSearchParams(window.location.search);
    // replace anything in filterColumns with null
    const newParams = Object.entries(currentParams).reduce((acc, [key, value]) => {
      if (filterColumns.includes(key)) {
        acc[key] = null;
      } else {
        acc[key] = value as string;
      }
      return acc;
    }, {} as Record<string, string | string[] | null>);

    if (userTableFilterData?.userTableFilters?.nodes?.[0]?.id) {
      client.writeQuery({
        query: GetUserTableFilterDocument,
        variables: {
          filterTypeId: projectId,
          filterType: type,
          userId: user?.id,
        },
        data: {
          ...userTableFilterData,
          userTableFilters: {
            ...userTableFilterData?.userTableFilters,
            nodes: [
              {
                ...userTableFilterData?.userTableFilters?.nodes?.[0],
                filter: {},
              },
            ],
          },
        },
      });
    }
    combineFilterWithParams(newParams);
  }, [client, combineFilterWithParams, filters, projectId, type, user?.id, userTableFilterData]);

  return {
    // TODO: this will need to be reintroduced when we add filters back in
    // for now, this can be left as is to make the loading quicker
    filtersLoading: false, //filtersLoading || !filtersData,
    handleFilter,
    resetFilters,
    filters: getFiltersFromParams(getQueryParams()),
    getFilters: () => {
      return getFiltersFromParams(getQueryParams());
    },
    searchTerm,
    setSearchTerm,

    // In order to keep the parameters logic simple, isNull queries will be handled here.
    // This is a little complex but it allows us to store isNull as -1 in an array in the URL.
    // This function then takes that array and converts it to the correct filter with the OR operator
    // if necessary
    getFiltersForQuery: useCallback(() => {
      const paramFilters = getFiltersFromParams(getQueryParams());

      const basefilter: StoryFilter = searchTerm
        ? {
            or: [
              {
                description: {
                  includesInsensitive: searchTerm,
                },
              },
              {
                identifier: {
                  includesInsensitive: searchTerm,
                },
              },
            ],
          }
        : {};

      /*
       * If a filter includes an entry like {[key]:{"in": [1,2,-1]}}
       * we need to update it to {[key]:{"or":{"in": [1,2], "isNull":true}}} -1 is a special case
       * which refers to the unassigned filter
       */
      if (paramFilters) {
        const updatedFilters = Object.entries(paramFilters).reduce((acc, [key, value]) => {
          if (value && typeof value === 'object' && 'in' in value) {
            const inValues: number[] = value.in as number[];
            const includesUnassigned = inValues.includes(-1);
            if (includesUnassigned && inValues.length > 1) {
              return {
                ...acc,
                or: [
                  { [key]: { in: inValues.filter((v) => v !== -1) } },
                  { [key]: { isNull: true } },
                ],
              };
            } else if (includesUnassigned && inValues.length === 1) {
              return { ...acc, [key]: { isNull: true } };
            } else {
              return { ...acc, [key]: value };
            }
          } else if (
            typeof value === 'string' &&
            Object.values(DateRangeOption).includes(value as DateRangeOption)
          ) {
            return { ...acc, [key]: convertDateRangeToFilter(value as DateRangeOption) };
          } else {
            return { ...acc, [key]: value };
          }
        }, basefilter);
        return updatedFilters;
      }
      return basefilter;
    }, [searchTerm]),
  };
};
