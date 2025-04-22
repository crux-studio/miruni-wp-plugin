import { FC } from 'react';

import { Avatar, Box, Button, Flex, Text, Tooltip } from '@chakra-ui/react';

import { AI_GRADIENT } from '#/admin/constants/styles';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

import { SignoutButton } from './login-button';

export const TopMenu: FC = () => {
  const { user, remainingSmartEdits } = useMiruniUser();

  const username = user?.name || user?.email;

  if (!user) {
    return null;
  }

  return (
    <Flex align="center" gap={4}>
      <Tooltip label="Smart Edits power your AI-assisted editing capabilities">
        <Box
          position="relative"
          display="flex"
          alignItems="center"
          justifyContent="center"
          className="smart-edit-button-container"
          cursor="pointer"
        >
          {/* Gradient glow effect */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bgGradient={AI_GRADIENT}
            rounded="md"
            filter="auto"
            blur="4px"
            opacity="0.5"
            _groupHover={{ opacity: 0.7 }}
            transition="opacity 0.2s"
            transform="scale(1.08)"
            pointerEvents="none"
          />

          {/* Button content */}
          <Button
            as="a"
            href={`https://help.miruni.io/en/articles/11003094-what-is-a-smart-edit`}
            target="_blank"
            position="relative"
            role="group"
            size="sm"
            bg="black"
            color="white"
            _hover={{ bg: 'blackAlpha.800' }}
            px={3}
            variant="solid"
            rightIcon={
              <Flex
                bg="whiteAlpha.300"
                px={2}
                py={0.5}
                borderRadius="full"
                fontWeight="bold"
                fontSize="xs"
                alignItems="center"
                justifyContent="center"
                minW="1.5rem"
              >
                {remainingSmartEdits}
              </Flex>
            }
          >
            <Text display="flex" alignItems="center" gap={1}>
              ⚡️ Smart Edits
            </Text>
          </Button>
        </Box>
      </Tooltip>
      <Flex align="center" gap={2}>
        <Avatar size="sm" name={username || ''} bg="fuchsia.900" color="white"></Avatar>
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            {username}
          </Text>
        </Box>
      </Flex>
      <SignoutButton />
    </Flex>
  );
};
