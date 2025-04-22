import { FC, useState } from 'react';

import { CheckCircleIcon } from '@chakra-ui/icons';
import { Divider, Textarea, Text, Box } from '@chakra-ui/react';

import { Change } from '#/admin/types/suggestion';

interface ChangeFeedbackProps {
  change: Change;
  handleCommentChange: (id: number, comment: string) => void;
  onCommentBlur: (id: number) => void;
}
export const ChangeFeedback: FC<ChangeFeedbackProps> = ({
  change,
  handleCommentChange,
  onCommentBlur,
}) => {
  const [changed, setChanged] = useState(false);
  return (
    <Box w="full" h="full" position={'relative'}>
      <Divider my={3} />
      <Text fontWeight="medium" mb={2}>
        Your Feedback:
      </Text>
      <Textarea
        placeholder="Please provide your feedback..."
        value={change.userComments || ''}
        size="sm"
        onChange={(e) => handleCommentChange(change.suggestionId, e.target.value)}
        onBlur={() => {
          onCommentBlur(change.suggestionId);
          setChanged(true);
        }}
        borderColor="fuchsia.900"
        colorScheme="fuchsia"
        _focusVisible={{
          borderColor: '#C93DF1',
          boxShadow: '0 0 0 1px #C93DF1',
        }}
        _focus={{
          borderColor: '#C93DF1',
          boxShadow: '0 0 0 1px #C93DF1',
        }}
      />
      {changed && (
        <Box position={'absolute'} bottom={0} right={0} p={2}>
          <CheckCircleIcon boxSize={5} color="green.500" />
        </Box>
      )}
    </Box>
  );
};
