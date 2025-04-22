import { useEffect, useState } from 'react';

import { Box, Flex, Input, Button, Stack, Text, Tooltip } from '@chakra-ui/react';

import { SmartEditSubContainer } from '#/admin/components/ai-preview/smart-edit-sub-container.component';

import { TabConfig } from './types';

interface PreviewContainerTabsProps {
  tabs: TabConfig[];
  title: string;
  onUpdateTitle: (title: string) => Promise<void>;
}

export const PreviewContainerTabs = ({ tabs, title, onUpdateTitle }: PreviewContainerTabsProps) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);

  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.target.value);
  };

  useEffect(() => {
    setTitleValue(title);
  }, [title]);

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (titleValue !== title) {
      await onUpdateTitle(titleValue);
    }
  };

  const handleTitleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
      if (titleValue !== title) {
        await onUpdateTitle(titleValue);
      }
    }
  };

  return (
    <SmartEditSubContainer
      heading={
        <Flex as="nav">
          {tabs.map((tab, index) => (
            <Tooltip
              key={index}
              label={tab.disabledTooltip}
              aria-label={tab.disabledTooltip}
              isDisabled={!tab.disabled}
            >
              <Button
                key={index}
                variant="ghost"
                color={activeTabIndex === index ? 'fuchsia.900' : 'black'}
                size={'md'}
                borderRadius="0"
                borderBottom={activeTabIndex === index ? '2px solid' : 'none'}
                borderColor="fuchsia.900"
                fontWeight={activeTabIndex === index ? 'bold' : 'normal'}
                mr={2}
                px={4}
                py={2}
                onClick={() => handleTabChange(index)}
                isDisabled={tab.disabled}
              >
                {tab.name}
              </Button>
            </Tooltip>
          ))}
        </Flex>
      }
    >
      <>
        <Flex
          justifyContent="space-between"
          alignItems="center"
          p={4}
          borderBottomWidth="1px"
          borderBottomColor="gray.200"
        >
          <Box gap={2}>
            <Text fontSize="sm" color="gray.500">
              Page Title
            </Text>
            {isEditingTitle ? (
              <Input
                autoFocus
                value={titleValue}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                size="sm"
                width="300px"
                borderColor={'fuchsia.900'}
                _focus={{ borderColor: 'fuchsia.900' }}
                boxShadow="none"
                rounded="md"
              />
            ) : (
              <Text
                as="span"
                p={0}
                m={0}
                fontSize="lg"
                onClick={handleTitleClick}
                cursor="pointer"
                _hover={{ color: 'fuchsia.900' }}
              >
                {title || 'Untitled'}
              </Text>
            )}
          </Box>
        </Flex>
        <Stack spacing={0}>
          {tabs.map((tab, index) => (
            <Box
              key={index}
              display={activeTabIndex === index ? 'block' : 'none'}
              p={tab.padding ?? 0}
            >
              {tab.content}
            </Box>
          ))}
        </Stack>
      </>
    </SmartEditSubContainer>
  );
};
