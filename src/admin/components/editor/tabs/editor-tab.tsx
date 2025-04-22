import { FC } from 'react';

import { Tab, Flex, Text } from '@chakra-ui/react';

import { EditorTab } from '#/admin/components/editor/monaco-editor';

const getLanguageDisplayName = (language: string) => {
  const languageMap: Record<string, string> = {
    javascript: 'JS',
    typescript: 'TS',
    markdown: 'MD',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
    python: 'PY',
  };

  return languageMap[language.toLowerCase()] || language.toUpperCase();
};

interface EditorTabComponentProps {
  tab: EditorTab;
  isActive: boolean;
}

export const EditorTabComponent: FC<EditorTabComponentProps> = ({ tab, isActive }) => {
  return (
    <Tab
      key={tab.id}
      py={2}
      px={4}
      fontWeight="medium"
      borderTopRadius="md"
      borderBottom="none"
      minWidth="120px"
      maxWidth="200px"
      transition="all 0.2s"
      position="relative"
      _hover={{
        backgroundColor: 'white',
        color: 'fuchsia.700',
      }}
      _selected={{
        backgroundColor: 'white',
        color: 'fuchsia.900',
        borderTopColor: 'fuchsia.200',
        borderLeftColor: 'fuchsia.200',
        borderRightColor: 'fuchsia.200',
        borderTopWidth: '1px',
        borderLeftWidth: '1px',
        borderRightWidth: '1px',
        borderBottomWidth: '0',
        borderBottomColor: 'white',
        marginBottom: '-1px',
        fontWeight: '600',
        _after: {
          content: '""',
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '3px',
          backgroundColor: 'fuchsia.600',
          borderTopLeftRadius: 'md',
          borderTopRightRadius: 'md',
        },
      }}
    >
      <Flex direction="column" align="center" w="100%">
        <Flex align="center" w="100%" justify="center" mb={1}>
          {/* <Icon as={LanguageIcon} mr={1} fontSize="xs" /> */}
          <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {tab.title}
          </Text>
        </Flex>
        <Text fontSize="xs" color={isActive ? 'fuchsia.700' : 'gray.500'} fontWeight="normal">
          {getLanguageDisplayName(tab.language) ?? tab.language}
        </Text>
      </Flex>
    </Tab>
  );
};
