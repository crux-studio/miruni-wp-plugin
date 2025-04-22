import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Spacer,
  Text,
} from '@chakra-ui/react';

import { FilterButton, IFilter, StoryAttributeTag, filterCheckboxStyles } from '@miruni/eds';
import { stringArrayToGenericArray, stringToGenericType } from '@miruni/utils';

import { HandleFilter } from './types';

interface IFilterMenu<V> {
  filter: IFilter;
  multiSelect: boolean;
  handleFilter: HandleFilter<V>;
  selectedFilters: string | string[];
}

const transformFilterValue = <V,>(filterValue: string | string[]): V | V[] => {
  if (Array.isArray(filterValue)) {
    return stringArrayToGenericArray<V>(filterValue as string[]);
  }
  try {
    return stringToGenericType<V>(filterValue);
  } catch (error) {
    return filterValue as unknown as V;
  }
};

export const FilterMenu = <V,>({
  filter,
  multiSelect = true,
  handleFilter,
  selectedFilters,
}: IFilterMenu<V>) => {
  const { t } = useTranslation();
  const optionsMemo = useMemo(() => {
    return filter.options?.map((item) => (
      <MenuItemOption key={`type_${item.key}`} value={item.key.toString()}>
        <HStack as="span">
          <StoryAttributeTag p="2px 4px" fontSize="14px">
            {item.val}
          </StoryAttributeTag>
        </HStack>
      </MenuItemOption>
    ));
  }, [filter.options]);

  const filtersNameMap: Record<string, string> = useMemo(() => {
    return filter.options?.reduce((acc, { key, val }) => ({ ...acc, [key]: val }), {}) || {};
  }, [filter.options]);

  const selectedFilterString = useMemo(() => {
    if (Array.isArray(selectedFilters)) {
      if (selectedFilters.length <= 3) {
        return selectedFilters.map((key) => filtersNameMap?.[key] || '').join(', ');
      } else {
        return `${selectedFilters
          .slice(0, 3)
          .map((key) => filtersNameMap?.[key] || '')
          .join(', ')}... +${selectedFilters.length - 3}`;
      }
    } else {
      return selectedFilters;
    }
  }, [filtersNameMap, selectedFilters]);

  const handleFilterChange = useCallback(
    (filterValue: string | string[]) => {
      let value = filterValue;
      if (Array.isArray(filterValue) && filterValue.length === 1) {
        value = filterValue[0];
      }
      handleFilter(transformFilterValue<V>(value));
    },
    [handleFilter],
  );

  const handleFilterReset = useCallback(() => {
    handleFilter([]);
  }, [handleFilter]);

  return (
    <Menu closeOnSelect={false} placement="bottom-start" autoSelect={false} isLazy>
      {({ isOpen }) => (
        <>
          <FilterButton
            as={MenuButton}
            isActive={Boolean(selectedFilters?.length)}
            handleFilterReset={handleFilterReset}
            isOpen={isOpen}
          >
            {filter.label}
            {Boolean(selectedFilters?.length) && ` is ${selectedFilterString}`}
          </FilterButton>
          <MenuList
            borderRadius="4px"
            p="4px"
            minW="max-content"
            overflow="hidden"
            fontSize="14px"
            sx={filterCheckboxStyles}
          >
            <MenuOptionGroup
              type={multiSelect ? 'checkbox' : 'radio'}
              onChange={handleFilterChange}
              value={multiSelect ? selectedFilters : selectedFilters?.[0]}
            >
              <HStack p="8px">
                <Text color="black70" fontSize="12px" lineHeight="14px" fontWeight="500">
                  {filter.label}
                </Text>
                <Spacer />
                <Button
                  variant="ghost"
                  fontSize="12px"
                  lineHeight="10px"
                  p="2px 4px"
                  height="auto"
                  onClick={handleFilterReset}
                >
                  {t('filters.clearAll', 'Clear All')}
                </Button>
              </HStack>
              {optionsMemo}
            </MenuOptionGroup>
          </MenuList>
        </>
      )}
    </Menu>
  );
};
