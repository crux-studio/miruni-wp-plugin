import { FC } from 'react';

import { Tab, Text, VStack, Tooltip } from '@chakra-ui/react';

import { getFileName } from '#/admin/components/ai-preview/change-summary/utils/file-name';
import { getFullFileName } from '#/admin/components/ai-preview/change-summary/utils/file-name';
import { Change } from '#/admin/types/suggestion';

interface ChangeTabProps {
  change: Change;
}

export const ChangeTab: FC<ChangeTabProps> = ({ change }) => {
  return (
    <Tooltip label={getFullFileName(change)} placement="top" openDelay={500}>
      <Tab
        fontWeight="medium"
        py={1}
        minWidth="120px"
        maxWidth="200px"
        _selected={{
          bg: 'fuchsia.50',
          color: 'fuchsia.900',
          borderBottomColor: 'fuchsia.600',
          borderBottomWidth: '3px',
        }}
      >
        <VStack spacing={1} width="100%">
          <Text
            fontSize="xs"
            fontWeight="bold"
            width="100%"
            textAlign="center"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {getFileName(change).title}
          </Text>
          {getFileName(change).subtitle && (
            <Text
              fontSize="10px"
              width="100%"
              textAlign="center"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {getFileName(change).subtitle}
            </Text>
          )}
        </VStack>
      </Tab>
    </Tooltip>
  );
};
