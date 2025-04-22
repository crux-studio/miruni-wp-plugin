import { FC } from 'react';

import { Box, Text } from '@chakra-ui/react';

import { Change } from '#/admin/types/suggestion';
import { UpdateRequiredType } from '#/admin/types/suggestion';

interface ChangeDetailsProps {
  change: Change;
}

export const ChangeDetails: FC<ChangeDetailsProps> = ({ change }) => {
  switch (change.fileType) {
    case UpdateRequiredType.OTHER_POST_TITLE:
    case UpdateRequiredType.OTHER_POST_CONTENT:
    case UpdateRequiredType.THEME_MOD:
      return (
        <>
          <Text fontWeight="medium" mt={2} fontSize="sm">
            From:
          </Text>
          <Box p={2} bg="gray.50" borderRadius="md" mb={2}>
            <Text color="gray.600" fontSize="sm" whiteSpace="pre-wrap">
              "{change.originalContent}"
            </Text>
          </Box>
          <Text fontWeight="medium" fontSize="sm">
            To:
          </Text>
          <Box p={2} bg="gray.50" borderRadius="md">
            <Text color="gray.600" fontSize="sm" whiteSpace="pre-wrap">
              "{change.newContent}"
            </Text>
          </Box>
        </>
      );
    default:
      return null;
  }
};
