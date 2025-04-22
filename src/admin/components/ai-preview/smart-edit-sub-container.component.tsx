import { FC } from 'react';

import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Flex,
  AccordionIcon,
  Box,
} from '@chakra-ui/react';

interface SmartEditSubContainerProps {
  children: React.ReactNode;
  heading?: React.ReactNode;
  headerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  isExpandable?: boolean;
}

export const SmartEditSubContainer: FC<SmartEditSubContainerProps> = ({
  children,
  heading,
  headerContent,
  rightContent,
  isExpandable,
}) => {
  if (!isExpandable) {
    return (
      <Box w="full">
        <Flex
          w="full"
          justify="space-between"
          bg="#F7FAFC"
          align="center"
          fontSize="18px"
          color="gray.900"
          borderY="1px solid #E2E8F0"
        >
          {heading && (
            <Box fontWeight="700" flex="1" textAlign="left">
              {heading}
            </Box>
          )}
          {headerContent && (
            <Box flex="1" ml={heading ? 4 : 0}>
              {headerContent}
            </Box>
          )}

          {rightContent && <Box mr={4}>{rightContent}</Box>}
        </Flex>
        <Box p={0}>{children}</Box>
      </Box>
    );
  }
  return (
    <AccordionItem flexDir="column" bg="white">
      <Flex
        w="full"
        justify="space-between"
        bg="#F7FAFC"
        align="center"
        fontSize="18px"
        color="gray.900"
        borderY="1px solid #E2E8F0"
      >
        <AccordionButton
          bg="unset"
          _hover={{
            _bg: 'unset',
          }}
          flex="1"
          px={0}
          disabled={!isExpandable}
          py={0}
        >
          {heading && (
            <Box fontWeight="700" flex="1" textAlign="left">
              {heading}
            </Box>
          )}
          {headerContent && (
            <Box flex="1" ml={heading ? 4 : 0}>
              {headerContent}
            </Box>
          )}
          {rightContent && <Box mr={4}>{rightContent}</Box>}
          {isExpandable && <AccordionIcon mr={3} />}
        </AccordionButton>
      </Flex>
      <AccordionPanel p={0}>{children}</AccordionPanel>
    </AccordionItem>
  );
};
