import { Tabs, TabList } from '@chakra-ui/react';

import { EditorTab } from '#/admin/components/editor/monaco-editor';

import { EditorTabComponent } from './editor-tab';

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTab: string;
  handleTabClick: (tabId: string) => void;
  currentTabId: string;
}

export const EditorTabs = ({ tabs, activeTab, handleTabClick, currentTabId }: EditorTabsProps) => {
  return (
    <Tabs
      variant="line"
      onChange={(index) => handleTabClick(tabs[index].id)}
      index={tabs.findIndex((tab) => tab.id === currentTabId)}
      size="sm"
      colorScheme="purple"
      mb={0}
      overflow="hidden"
    >
      <TabList
        borderBottomWidth="1px"
        borderBottomColor="gray.200"
        backgroundColor="gray.50"
        overflowX="auto"
        overflowY="hidden"
        whiteSpace="nowrap"
        css={{
          '&::-webkit-scrollbar': { height: '6px' },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '3px',
          },
        }}
      >
        {tabs.map((tab) => (
          <EditorTabComponent key={tab.id} tab={tab} isActive={tab.id === activeTab} />
        ))}
      </TabList>
    </Tabs>
  );
};
