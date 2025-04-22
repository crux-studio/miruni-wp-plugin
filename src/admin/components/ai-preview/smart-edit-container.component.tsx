import { FC } from 'react';

import { Accordion, Box, Button, Flex, Heading, HStack } from '@chakra-ui/react';

import { AIGlowButton } from '#/admin/components/shared/ai-glow-button';

interface SmartEditContainerProps {
  children: React.ReactNode;
  onTryAgain: () => void;
  onPublish: () => void;
  onRevertPublish: () => void;
  isPublished: boolean;
  loadingPublish?: boolean;
  loadingTryAgain?: boolean;
  isDisabled: boolean;
}

export const SmartEditContainer: FC<SmartEditContainerProps> = ({
  children,
  onPublish,
  isPublished,
  onRevertPublish,
  loadingPublish,
  loadingTryAgain,
  onTryAgain,
  isDisabled,
}) => {
  const onButtonClick = isPublished ? onRevertPublish : onPublish;

  return (
    <Flex
      flexDir="column"
      bg="white"
      boxShadow="lg"
      rounded="2xl"
      position="relative"
      h="max-content"
    >
      <Flex
        w="full"
        justify="space-between"
        p={4}
        bg="white"
        align={'center'}
        roundedTop="2xl"
        position="sticky"
        top={'20px'}
        zIndex={2}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Heading as="h5" fontSize="xl" fontWeight="normal" p={0} m={0}>
          ⚡️ Smart Edit
        </Heading>
        <HStack spacing={2} align="center">
          <Button
            position="relative"
            variant="outline"
            colorScheme="gray"
            fontSize="14px"
            fontWeight="normal"
            size="md"
            rounded="full"
            onClick={onTryAgain}
            isLoading={loadingTryAgain}
            isDisabled={loadingPublish || isDisabled}
            borderWidth="1.5px"
            borderColor="gray.200"
            color="gray.700"
            bg="white"
            transition="all 0.3s ease"
            disabled={isDisabled}
            _hover={{
              transform: 'scale(1.02)',
              transition: 'all 0.3s ease',
            }}
          >
            Try Again
          </Button>
          <AIGlowButton
            fontSize="14px"
            fontWeight="normal"
            size="md"
            rounded="full"
            onClick={onButtonClick}
            isLoading={loadingPublish}
            isDisabled={isDisabled || loadingTryAgain}
          >
            {isPublished ? 'Undo' : 'Apply Changes'}
          </AIGlowButton>
        </HStack>
      </Flex>
      <Box overflowY="auto" display="flex" flexDirection="column" flex="1">
        <Accordion
          allowMultiple
          defaultIndex={[0, 1]}
          flex="1"
          display="flex"
          flexDirection="column"
        >
          {children}
        </Accordion>
      </Box>
    </Flex>
  );
};
