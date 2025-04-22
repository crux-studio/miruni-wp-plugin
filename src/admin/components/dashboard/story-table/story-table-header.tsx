import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  Box,
  Collapse,
  HStack,
  Text,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  ScaleFade,
  Spacer,
  useDisclosure,
  Center,
} from '@chakra-ui/react';

import { FilterIcon, IFilter, SearchIcon } from '@miruni/eds';
import { ProjectFilter, StoryFilter } from '@miruni/graphql';

import { StoryFilters } from './filters.component';

interface StoryTableHeaderProps {
  headerText: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  handleFilter: (
    filterName: string,
    value: string | number | Array<string | number>,
    options?: { dontSave?: boolean },
  ) => ProjectFilter;
  filters: IFilter[];
  getFilters: () => StoryFilter | undefined;
  resetFilters: () => void;
}

export const StoryTableHeader = ({
  headerText,
  setSearchTerm,
  handleFilter,
  filters,
  getFilters,
  resetFilters,
}: StoryTableHeaderProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOpen: isSearchVisible, onToggle: toggleSearch } = useDisclosure();
  const { isOpen: isFiltersOpen, onToggle: toggleFilters } = useDisclosure({ defaultIsOpen: true });
  const filtersLength = Object.keys(getFilters() || {}).length;
  useEffect(() => {
    if (isSearchVisible) {
      inputRef.current?.focus();
    }
  }, [isSearchVisible]);

  return null;

  return (
    <Box mb="24px" flexShrink="0">
      <HStack direction="row" borderBottom="1px solid" borderColor="black10">
        <HStack>
          <Text
            fontSize="14px"
            flexShrink="0"
            p="13px 8px"
            borderBottom="2px solid"
            borderColor="fuchsia100"
            mb="-1px"
          >
            {headerText}
          </Text>

          <Box
            flexShrink="0"
            flexBasis={isSearchVisible ? '240px' : '0'}
            overflow="hidden"
            transition="0.3s flex-basis"
          >
            <InputGroup maxW="full" p="2px">
              <InputLeftElement pointerEvents="none" w="24px">
                <SearchIcon color="black30" boxSize="12px" />
              </InputLeftElement>
              <Input
                ref={inputRef}
                onChange={(e) => setSearchTerm(e.target.value)}
                type="text"
                required={true}
                placeholder="Search Stories"
                backgroundColor="white"
                _placeholder={{ color: 'black40' }}
                w="full"
                pl="24px"
                fontSize="14px"
                h="28px"
                isDisabled={!isSearchVisible}
                _focusVisible={{
                  borderColor: 'fuchsia50',
                  boxShadow: '0 0 0 1px var(--chakra-colors-fuchsia50)',
                }}
              />
            </InputGroup>
          </Box>
        </HStack>
        <Spacer />
        <IconButton
          variant="unstyled"
          aria-label={t('filters.search', 'Search')}
          _hover={{ bgColor: 'black20' }}
          bgColor={isSearchVisible ? 'black20' : 'transparent'}
          boxSize="24px"
          minW="auto"
          display="inline-flex"
          justifyContent="center"
          alignItems="center"
          onClick={toggleSearch}
        >
          <SearchIcon boxSize="14px" />
        </IconButton>
        <Center pos="relative" boxSize="24px">
          <IconButton
            variant="unstyled"
            aria-label={t('filters.filters', 'Filters')}
            _hover={{ bgColor: 'black20' }}
            bgColor={isFiltersOpen ? 'black20' : 'transparent'}
            boxSize="24px"
            minW="auto"
            display="inline-flex"
            justifyContent="center"
            alignItems="center"
            onClick={toggleFilters}
          >
            <FilterIcon boxSize="14px" />
          </IconButton>
          <Box pos="absolute" top="-4px" right="-5px">
            <ScaleFade in={filtersLength !== 0 && !isFiltersOpen} initialScale={0} unmountOnExit>
              <Badge variant="updateSm" bgColor="azure.900">
                {filtersLength}
              </Badge>
            </ScaleFade>
          </Box>
        </Center>
      </HStack>
      <Collapse in={isFiltersOpen}>
        <StoryFilters
          mt="12px"
          handleFilter={handleFilter}
          teamFilters={filters}
          getFilters={getFilters}
          resetFilters={resetFilters}
        />
      </Collapse>
    </Box>
  );
};
