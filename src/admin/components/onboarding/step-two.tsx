import { useState, useEffect, FC } from 'react';

import {
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
  Button,
  VStack,
  Portal,
  PopoverArrow,
  PopoverBody,
} from '@chakra-ui/react';

import { GET_SITE_FEEDBACK_BUTTON_ID } from '#/admin/constants/ids';
import { useInviteUserModal } from '#/admin/hooks/use-invite-collaborator-modal';

import { OnboardingModalProps } from './step-one';

export const OnboardingFlowStepTwo: FC<
  OnboardingModalProps & {
    anchorId?: string;
  }
> = ({
  handleNext,
  anchorId = GET_SITE_FEEDBACK_BUTTON_ID, // ID of the element to anchor to
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { openInviteUserModal } = useInviteUserModal();

  useEffect(() => {
    // Find the anchor element once mounted

    const interval = setInterval(() => {
      const element = document.getElementById(anchorId);

      if (element) {
        setAnchorEl(element);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [anchorId]);

  if (!anchorEl) return null;

  return (
    <Portal>
      <Popover
        isOpen={true}
        placement="bottom-start"
        closeOnBlur={false}
        gutter={12} // Adds some space between anchor and popover
      >
        <PopoverTrigger>
          {/* Using a wrapper div positioned absolutely over the anchor element */}
          <div
            style={{
              position: 'absolute',
              left: anchorEl?.offsetLeft,
              top: anchorEl?.offsetTop,
              width: anchorEl?.offsetWidth,
              height: anchorEl?.offsetHeight,
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          bg="#BB4DE9"
          color="white"
          borderRadius="xl"
          border="none"
          maxW="320px"
          p="4"
          _focus={{ boxShadow: 'none', outline: 'none', border: 'none' }}
          autoFocus={false}
        >
          <PopoverArrow bg="#BB4DE9" border="none !important" boxShadow="none !important" />
          <PopoverBody>
            <VStack align="flex-start" spacing="4">
              <Text fontWeight="600" fontSize="lg" lineHeight="1.2">
                Invite collaborators to give site feedback
              </Text>

              <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.5">
                The feedback widget on your site only appears to people you've invited. Invite
                collaborators to start getting feedback.
              </Text>

              <Flex gap="3" w="full">
                <Button
                  rounded={'full'}
                  bg="white"
                  color="black"
                  flexGrow={1}
                  onClick={openInviteUserModal}
                  _hover={{ bg: 'whiteAlpha.900' }}
                  border="5px solid"
                  borderColor="rgba(255, 255, 255, 0.6)"
                  fontWeight="normal"
                >
                  Send invite
                </Button>
                <Button
                  rounded={'full'}
                  variant="ghost"
                  flexGrow={1}
                  onClick={handleNext}
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  border="5px solid"
                  borderColor="rgba(255, 255, 255, 0.6)"
                  fontWeight="normal"
                >
                  I'll do it later
                </Button>
              </Flex>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Portal>
  );
};
