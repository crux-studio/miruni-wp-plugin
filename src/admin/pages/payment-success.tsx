import { useEffect, useState } from 'react';

import { Button, Box, Text, Spinner, VStack, Heading, Center } from '@chakra-ui/react';

import { PaymentStatus } from '@miruni/graphql';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation } from '#/admin/hooks/use-wp-nav';
import { logError } from '#/admin/utils/logging';

export const PaymentSuccess = () => {
  const { paymentStatus, refetchMiruniUser } = useMiruniUser();
  const { goToView } = useWordPressNavigation();
  const [isConfirmed, setIsConfirmed] = useState(paymentStatus === PaymentStatus.Active);

  useEffect(() => {
    // If already confirmed, no need to poll
    if (paymentStatus === PaymentStatus.Active) {
      setIsConfirmed(true);
      return;
    }

    // Set up polling interval (every 2 seconds)
    const intervalId = setInterval(async () => {
      try {
        await refetchMiruniUser();
      } catch (error) {
        logError(error as Error);
      }
    }, 2000);

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [paymentStatus, refetchMiruniUser]);

  const handleDashboardClick = () => {
    goToView('dashboard');
  };

  return (
    <Center>
      <VStack spacing={6} align="center" p={10} maxW="600px">
        <Heading>Payment Success</Heading>

        {!isConfirmed ? (
          <Box textAlign="center">
            <Spinner size="md" mb={4} color="purple.500" />
            <Text fontWeight="medium">
              We're finalizing your payment and setting up your account...
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              This may take a few moments while we confirm your payment with our payment processor.
              Please don't close this page.
            </Text>
          </Box>
        ) : (
          <Text color="green.500" fontWeight="medium">
            Your account is all set up and ready to use!
          </Text>
        )}

        <Button
          colorScheme="purple"
          isDisabled={!isConfirmed}
          onClick={handleDashboardClick}
          mt={4}
        >
          {isConfirmed ? 'Go to dashboard' : 'Setting up your account...'}
        </Button>
      </VStack>
    </Center>
  );
};
