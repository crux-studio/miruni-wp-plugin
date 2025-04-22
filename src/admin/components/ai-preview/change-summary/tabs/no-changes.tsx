import { FC } from 'react';

import { Box, Text } from '@chakra-ui/react';

interface ChangeSummaryNoChangesProps {
  message?: string;
}
export const ChangeSummaryNoChanges: FC<ChangeSummaryNoChangesProps> = ({ message }) => {
  return (
    <Box p={6} textAlign="center">
      <Text color="gray.500" fontSize="md">
        No changes available
      </Text>
      <Text color="gray.400" fontSize="sm" mt={1}>
        There are no suggested changes for this content.
      </Text>
      {message && (
        <Text color="gray.400" fontSize="sm" mt={1}>
          {message}
        </Text>
      )}
    </Box>
  );
};
