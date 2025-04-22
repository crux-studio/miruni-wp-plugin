import React, { FC, useCallback, useState } from 'react';

import { Box, Button, Flex, Icon, VStack, Text } from '@chakra-ui/react';
import {
  AddressElement,
  useStripe,
  useElements,
  PaymentElement,
  ElementProps,
} from '@stripe/react-stripe-js';
import Stripe from 'stripe';

import { ExclamationCircleIcon } from '@miruni/eds';
import { StripeType } from '@miruni/graphql';

interface PaymentFormProps {
  hide: boolean;
  onPaid: (paymentIntent?: Stripe.PaymentIntent) => void;
  setStripeError: React.Dispatch<React.SetStateAction<string | null>>;
  stripeError: string | null;
  stripeElementProps?: ElementProps;
  stripeType: StripeType;
  returnUrl: string;
}

const PaymentForm: FC<PaymentFormProps> = ({
  hide,
  onPaid,
  setStripeError,
  stripeError,
  stripeElementProps = {},
  stripeType,
  returnUrl,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const confirmSetupIntent = useCallback(async () => {
    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    setIsProcessing(false);

    if (error) {
      setStripeError(error?.message ?? 'Something went wrong');
    } else {
      onPaid();
    }
  }, [stripe, elements, returnUrl, setStripeError, onPaid]);

  const confirmPaymentIntent = useCallback(async () => {
    if (!stripe || !elements) {
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        expand: ['invoice'],
      },
    });

    setIsProcessing(false);

    if (error) {
      setStripeError(error?.message ?? 'Something went wrong');
    } else {
      if (paymentIntent?.status === 'succeeded') {
        onPaid(paymentIntent as Stripe.PaymentIntent);
      }
    }
  }, [stripe, elements, onPaid, setStripeError]);

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setIsProcessing(true);

    if (stripeType === StripeType.Setup) {
      await confirmSetupIntent();
    } else {
      await confirmPaymentIntent();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: hide ? 'none' : 'block',
      }}
    >
      <VStack spacing={6} align="stretch" borderRadius="lg" my={4}>
        <Text fontSize="sm" fontWeight="bold" textTransform="uppercase">
          Payment Information
        </Text>

        <Box>
          <Text fontSize="sm" mb={2} fontWeight="medium">
            Billing Address
          </Text>
          <Box bg="white" p={3} borderRadius="md" border="1px" borderColor="gray.200">
            <AddressElement options={{ mode: 'billing', display: {} }} {...stripeElementProps} />
          </Box>
        </Box>

        <Box>
          <Text fontSize="sm" mb={2} fontWeight="medium">
            Payment Method
          </Text>
          <Box bg="white" p={3} borderRadius="md" border="1px" borderColor="gray.200">
            <PaymentElement {...stripeElementProps} />
          </Box>
        </Box>

        {stripeError && (
          <Flex
            rounded="md"
            bgColor="red.50"
            p={3}
            px={4}
            alignItems="center"
            border="1px"
            borderColor="red.200"
          >
            <Icon as={ExclamationCircleIcon} mr={2} color="red.500" />
            <Text color="red.700" fontSize="sm">
              {stripeError}
            </Text>
          </Flex>
        )}
      </VStack>

      <Button
        disabled={isProcessing}
        type="submit"
        colorScheme="blackAlpha"
        variant="primary"
        borderRadius="full"
        px={8}
        py={6}
        fontSize="md"
        w="full"
        _disabled={{ opacity: 0.7, cursor: 'not-allowed' }}
      >
        {isProcessing ? 'Processing' : 'Submit'}
      </Button>
    </form>
  );
};

export default PaymentForm;
