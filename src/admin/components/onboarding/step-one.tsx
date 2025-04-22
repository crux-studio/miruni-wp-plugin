import { FC } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  Box,
} from '@chakra-ui/react';

import { SolidMiruniLogo } from '@miruni/eds';

export interface OnboardingModalProps {
  handleNext: () => void;
}

export const OnboardingFlowStropOne: FC<OnboardingModalProps> = ({ handleNext }) => {
  return (
    <Modal
      isOpen={true}
      onClose={() => {
        return;
      }}
      isCentered
      size="md"
    >
      <ModalOverlay bg="rgba(0, 0, 0, 0.4)" />
      <ModalContent bg="#BB4DE9" color="white" borderRadius="xl" maxW="480px" mx="4">
        <ModalHeader pt="8" pb="0">
          <Box display="flex" justifyContent="center">
            <SolidMiruniLogo width="48px" height="48px" fill="white" />
          </Box>
        </ModalHeader>

        <ModalBody>
          <VStack spacing="4" align="center" textAlign="center" px="6">
            <Text fontSize="2xl" fontWeight="600" letterSpacing="-0.02em">
              You're all set!
            </Text>
            <Text fontSize="md" color="whiteAlpha.900" lineHeight="1.6" maxW="380px">
              Your Miruni workspace has been set up for your WordPress site. The feedback widget is
              now live on your site.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter display="flex" justifyContent="center" pb="8" pt="6">
          <Button
            bg="white"
            color="black"
            _hover={{ bg: 'whiteAlpha.900' }}
            onClick={handleNext}
            px="8"
            fontWeight="500"
            rounded="full"
            border="5px solid"
            borderColor="rgba(255, 255, 255, 0.6)"
          >
            Got it
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
