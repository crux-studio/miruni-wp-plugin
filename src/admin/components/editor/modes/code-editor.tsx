import { Box, Flex, Badge } from '@chakra-ui/react';

import { MonacoEditor } from '#/admin/components/editor/monaco-editor';
import { Change } from '#/admin/types/suggestion';

interface CodeEditorProps {
  change?: Change; // Accept selectedChange directly
  onChange?: (value: string | undefined) => void;
}

export const CodeEditor = ({ change, onChange }: CodeEditorProps) => {
  // Determine language from either source
  const language = 'html';

  return (
    <Box position="relative" h="full" w="full" display="flex" flexDir="column">
      <Flex align="center" py={2} px={4} bg="gray.100" borderTopRadius="md">
        <Box mr={2}>Active Language:</Box>
        <Badge colorScheme="purple">{language}</Badge>
      </Flex>

      <MonacoEditor
        currentTab={{
          id: change?.fileIdentifier || '',
          title: change?.fileName || '',
          language,
          value: change?.newContent || '',
        }}
        onChange={onChange}
        height="85vh"
      />
    </Box>
  );
};
