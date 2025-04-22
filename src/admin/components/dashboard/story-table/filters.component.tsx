import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  StackProps,
  Text,
} from '@chakra-ui/react';

import { DESKTOP_BREAKPOINT, AddIcon, ChevronRightIcon, IFilter, FilterDate } from '@miruni/eds';
import { DateFilter, SelectableAttrName, SelectableAttrType, StoryFilter } from '@miruni/graphql';
import { toCamelCase } from '@miruni/utils';

import { FilterMenu } from './filter-menu.component';
import { ProjectAutocompleteMenu } from './project-autocomplete-menu.component';
import { TagAutocompleteMenu } from './tag-autocomplete-menu.component';
import { HandleFilter, HandleFilterByName } from './types';
import { UserAutocompleteMenu } from './user-autocomplete-menu.component';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

const DEFAULT_FILTERS: SelectableAttrName[] = [
  SelectableAttrName.Status,
  SelectableAttrName.Assignee,
  SelectableAttrName.Reporter,
];

export enum DateRangeOption {
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_7_DAYS = 'LAST_7_DAYS',
  // Add more options as needed
}

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

const getAutocompleteFilterValue = (
  selectedFilters: StoryFilter[keyof StoryFilter] | undefined,
) => {
  if (!selectedFilters) return;
  if (typeof selectedFilters !== 'object') return;
  if ('in' in selectedFilters) return selectedFilters.in;
  if ('eq' in selectedFilters) return [selectedFilters.eq];
  if ('overlaps' in selectedFilters) return selectedFilters.overlaps;
};

const getCalendarFilterValue = (selectedFilters: StoryFilter[keyof StoryFilter] | undefined) => {
  if (!selectedFilters) return;
  let filterValue = selectedFilters as string[];

  if (Array.isArray(selectedFilters) && selectedFilters.length === 2) {
    // Nothing
  } else if (
    typeof selectedFilters === 'object' &&
    'gte' in selectedFilters &&
    'lte' in selectedFilters
  ) {
    const gte =
      typeof selectedFilters.gte === 'string'
        ? selectedFilters.gte.slice(0, 10)
        : selectedFilters.gte instanceof Date
        ? selectedFilters.gte.toISOString().slice(0, 10)
        : '';

    const lte =
      typeof selectedFilters.lte === 'string'
        ? selectedFilters.lte.slice(0, 10)
        : selectedFilters.lte instanceof Date
        ? selectedFilters.lte.toISOString().slice(0, 10)
        : '';
    filterValue = [gte, lte].filter(Boolean) as string[];
  } else if (
    typeof selectedFilters === 'string' &&
    Object.values(DateRangeOption).includes(selectedFilters as DateRangeOption)
  ) {
    const dateRange = convertDateRangeToFilter(selectedFilters);
    filterValue = [
      (dateRange.gte as Date).toISOString().split('T')[0],
      (dateRange.lte as Date).toISOString().split('T')[0],
    ];
  }
  return filterValue;
};

const getFilterMenuValue = (
  selectedFilters: StoryFilter[keyof StoryFilter] | undefined,
): unknown[] | null | undefined => {
  if (!Array.isArray(selectedFilters))
    return [selectedFilters].filter((v) => v !== undefined && v !== null) as string[];
  if (selectedFilters && typeof selectedFilters === 'object' && 'in' in selectedFilters) {
    return selectedFilters.in as unknown[];
  } else if (selectedFilters && typeof selectedFilters === 'object' && 'eq' in selectedFilters) {
    return [selectedFilters.eq];
  } else if (
    selectedFilters &&
    typeof selectedFilters === 'object' &&
    'overlaps' in selectedFilters
  ) {
    return selectedFilters.overlaps as unknown[];
  }
  return null;
};

export interface IFiltersProps<V> extends StackProps {
  handleFilter: HandleFilterByName<V>;
  teamFilters: IFilter[];
  getFilters?: () => StoryFilter | undefined;
  resetFilters?: () => void;
}

export const StoryFilters = <FV,>({
  handleFilter,
  teamFilters,
  getFilters,
  resetFilters,
  ...rest
}: IFiltersProps<FV>) => {
  const { t } = useTranslation();
  const { userSnippet } = useMiruniUser();
  const selectedTeamId = userSnippet?.teamId;
  // The filters which are visible to the user (not in the add filters dropdown).
  // We show the first 3 filters by default. When the user adds a filter, we add it to this list.
  const [addedFilters, setAddedFilters] = useState(teamFilters.slice(0, 3));

  // Create a set of IDs to make it easier to check if a filter exists in the addedFilters
  const addedFilterIds = useMemo(() => {
    return new Set(addedFilters.map((filter) => filter.id));
  }, [addedFilters]);

  // Available filters show up in the "add filters" dropdown
  // By definitinon, these are all filters which do not exist in the addedFilters
  const availableFilters = useMemo(() => {
    return teamFilters.filter((filter) => !addedFilterIds.has(filter.id));
  }, [teamFilters, addedFilterIds]);

  const setFilter = useCallback<(filterName: string) => HandleFilter<FV>>(
    (filterName: string) => async (value: FV | FV[]) => {
      handleFilter(filterName, value);
    },
    [handleFilter],
  );

  const handleFilterAddition = useCallback((filter: IFilter) => {
    // add filter to addedFilters from availableFilters
    setAddedFilters((addedFilters) => [...addedFilters, filter]);
  }, []);

  const getFilter = useCallback(
    (filter: IFilter) => {
      const filters = getFilters?.();
      const filterKey = toCamelCase(filter.filterColumn) as keyof StoryFilter;
      const selectedFilters = filters && filterKey in filters ? filters[filterKey] : null;

      if (filter.type === SelectableAttrType.Autocomplete) {
        const filterValue = getAutocompleteFilterValue(selectedFilters);

        if (filter.name === SelectableAttrName.ProjectId.toUpperCase()) {
          return (
            <ProjectAutocompleteMenu
              teamId={selectedTeamId as number}
              handleFilter={
                setFilter(SelectableAttrName.ProjectId.toUpperCase()) as HandleFilter<number[]>
              }
              selectedFilters={filterValue as number[]}
            />
          );
        }

        if (
          [
            SelectableAttrName.Assignee.toUpperCase(),
            SelectableAttrName.Reporter.toUpperCase(),
          ].includes(filter.name)
        ) {
          const label =
            filter.name === SelectableAttrName.Assignee.toUpperCase()
              ? t('common.assignee', 'Assignee')
              : t('common.reporter', 'Reporter');
          return (
            <UserAutocompleteMenu
              teamId={selectedTeamId as number}
              handleFilter={setFilter(filter.name) as HandleFilter<number[]>}
              selectedFilters={filterValue as number[]}
              label={label}
              attrName={
                filter.name === SelectableAttrName.Assignee.toUpperCase()
                  ? SelectableAttrName.Assignee
                  : SelectableAttrName.Reporter
              }
              includeUnassigned={filter.name === SelectableAttrName.Assignee.toUpperCase()}
            />
          );
        }

        if (filter.name === SelectableAttrName.TagIds.toUpperCase()) {
          return (
            <TagAutocompleteMenu
              teamId={selectedTeamId as number}
              handleFilter={
                setFilter(SelectableAttrName.TagIds.toUpperCase()) as HandleFilter<number[]>
              }
              selectedFilters={filterValue as number[]}
            />
          );
        }
      } else if (filter.type === SelectableAttrType.Calendar) {
        const filterValue = getCalendarFilterValue(selectedFilters);

        return (
          <FilterDate
            dateToLabel={t('filters.dateTo', 'to')}
            handleFilter={setFilter(filter.name) as unknown as HandleFilter<Date | DateRangeOption>}
            filter={filter}
            selectedFilters={filterValue}
          />
        );
      }

      const filterValue = getFilterMenuValue(selectedFilters);

      return (
        <FilterMenu
          handleFilter={setFilter(filter.name)}
          filter={filter}
          multiSelect={filter?.name === 'HAS_ATTACHMENTS' ? false : true}
          selectedFilters={
            filterValue?.flatMap((f) => {
              if (f && typeof f === 'object') {
                if ('eq' in f) {
                  return String(f.eq);
                }
                if ('in' in f) {
                  return (f.in as number[]).map((v) => String(v));
                }
              }
              return String(f);
            }) || []
          }
        />
      );
    },
    [getFilters, selectedTeamId, setFilter, t],
  );

  useEffect(() => {
    const firstThreeFilters = addedFilters?.length
      ? [...addedFilters]
      : teamFilters.filter((f) => DEFAULT_FILTERS.includes(f.name));
    const filters = getFilters?.();
    // check to see if there are any selected filters that are not in the first three filters
    // if so, add them to the addedFilters
    for (const filter of teamFilters) {
      const filterKey = toCamelCase(filter.filterColumn) as keyof StoryFilter;

      if (filters && filterKey in filters && !firstThreeFilters.find((f) => f.id === filter.id)) {
        firstThreeFilters.push(filter);
      }
    }
    // only update if the addedFilters have changed
    const addedFilterNames = addedFilters.map((filter) => filter.name).sort();
    const newFilterNames = firstThreeFilters.map((filter) => filter.name).sort();
    if (addedFilterNames.join() !== newFilterNames.join()) {
      setAddedFilters(firstThreeFilters);
    }
  }, [teamFilters, getFilters, addedFilters]);

  const displayAddedFilters = useMemo(() => {
    return addedFilters.map((addedFilter) => (
      <Fragment key={addedFilter.id}>{getFilter(addedFilter)}</Fragment>
    ));
  }, [addedFilters, getFilter]);

  const displayAvailableFilters = useMemo(() => {
    return availableFilters.length > 0 ? (
      availableFilters.map((availableFilter) => (
        <MenuItem
          key={availableFilter.id}
          onClick={() => handleFilterAddition(availableFilter)}
          isDisabled={availableFilter.disabled}
          fontSize="14px"
          gap="16px"
        >
          {availableFilter.label}
          <ChevronRightIcon boxSize="12px" />
        </MenuItem>
      ))
    ) : (
      <MenuItem>{t('filters.noFilters', 'No filters available')}</MenuItem>
    );
  }, [availableFilters, handleFilterAddition, t]);

  return (
    <HStack
      justifyContent={{ base: 'center', [DESKTOP_BREAKPOINT]: 'flex-start' }}
      mb="spacingS"
      gap="8px"
      {...rest}
    >
      <HStack flexWrap="wrap" gap="8px">
        {displayAddedFilters}
        {availableFilters.length > 0 && (
          <Menu placement="bottom-start">
            <MenuButton
              leftIcon={<AddIcon w="10px" h="10px" />}
              as={Button}
              variant="ghost"
              h="24px"
              fontSize="14px"
              _hover={{ bg: 'black20' }}
            >
              {t('filters.add', 'Add Filter')}
            </MenuButton>
            <MenuList borderRadius="4px" p="4px" minW="max-content" overflow="hidden">
              <Text p="8px" fontSize="10px" fontWeight="500" color="black70" lineHeight="14px">
                {t('filters.selectFilter', 'Select filter')}
              </Text>
              {displayAvailableFilters}
            </MenuList>
          </Menu>
        )}
      </HStack>
      <Spacer minW="8px" />
      <Button
        variant="ghost"
        fontSize="14px"
        lineHeight="1"
        fontWeight="500"
        p="4px 8px"
        h="auto"
        _hover={{ bg: 'black20' }}
        onClick={resetFilters}
      >
        {t('filters.clearAll', 'Clear all')}
      </Button>
    </HStack>
  );
};
