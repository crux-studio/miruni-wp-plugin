import { useState, useEffect, FC } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
  VStack,
  Portal,
  PopoverArrow,
  PopoverBody,
  Flex,
  Button,
} from '@chakra-ui/react';

import { SAMPLE_FEEDBACK_STORY_ID } from '#/admin/constants/ids';

import { OnboardingModalProps } from './step-one';

export const OnboardingFlowStepThree: FC<
  OnboardingModalProps & {
    anchorId?: string;
  }
> = ({
  handleNext,
  anchorId = SAMPLE_FEEDBACK_STORY_ID, // ID of the element to anchor to
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the anchor element once mounted

    const element = document.getElementById(anchorId);

    if (element) {
      setAnchorEl(element);
    } else {
      handleNext();
    }
  }, [anchorId, handleNext]);

  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  return (
    <Portal>
      <Popover
        isOpen={true}
        placement="bottom-start"
        closeOnBlur={false}
        gutter={0} // Adds some space between anchor and popover
      >
        <PopoverTrigger>
          {/* Using a wrapper div positioned absolutely over the anchor element */}
          <div
            style={{
              position: 'absolute',
              left: rect.left + scrollLeft,
              top: rect.top + scrollTop,
              width: rect.width,
              height: rect.height - 20,
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
          <PopoverArrow
            bg="#BB4DE9"
            border="none !important"
            boxShadow="none !important"
            outline="none"
          />
          <PopoverBody>
            <VStack align="flex-start" spacing="4">
              <Text fontWeight="600" fontSize="lg" lineHeight="1.2">
                See sample feedback
              </Text>

              <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.5">
                Once a collaborator submits new feedback on your site, it will appear on your Miruni
                dashboard.
              </Text>
              <Flex gap="3" w="full" justifyContent="flex-end">
                <Button
                  rounded={'full'}
                  variant="ghost"
                  onClick={handleNext}
                  color="white"
                  w="max-content"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  border="5px solid"
                  borderColor="rgba(255, 255, 255, 0.6)"
                  fontWeight="normal"
                >
                  Ok
                </Button>
              </Flex>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Portal>
  );
};
