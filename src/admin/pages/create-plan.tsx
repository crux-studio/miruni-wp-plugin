import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import {
  Box,
  Container,
  VStack,
  Text,
  Heading,
  Flex,
  Badge,
  Divider,
  List,
  ListItem,
  Alert,
  AlertIcon,
  CloseButton,
  useDisclosure,
  ScaleFade,
  SlideFade,
  Skeleton,
} from '@chakra-ui/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import { ColorMiruniLogo } from '@miruni/eds';
import { CheckCircleIcon } from '@miruni/eds/src/icons/check-circle.icon';
import {
  StripeType,
  useCreatePlanPageSubscriptionMutation,
  useCustomerHasHadPaidSubscriptionQuery,
} from '@miruni/graphql';

import PaymentForm from '#/admin/components/payment/payment-form';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';
import { logError } from '#/admin/utils/logging';

export const CreatePlanPage = () => {
  const [createPlan, { data: createPlanData }] = useCreatePlanPageSubscriptionMutation();
  const { workspace } = useMiruniUser();
  const { goToView } = useWordPressNavigation();
  const workspaceId = workspace?.id;
  const clientSecret =
    createPlanData?.createPlanPageCreateSubscription?.subscriptionResponse?.clientSecret;
  const plan = createPlanData?.createPlanPageCreateSubscription?.plan;
  const type = createPlanData?.createPlanPageCreateSubscription?.subscriptionResponse?.type;
  const [isPaymentFormVisible, setPaymentFormVisible] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { isOpen: isErrorVisible, onClose: onErrorClose, onOpen: onErrorOpen } = useDisclosure();
  const { data: hasHadPaidSubscriptionData } = useCustomerHasHadPaidSubscriptionQuery();
  const hasHadPaidSubscription = hasHadPaidSubscriptionData?.hasCustomerHadPaidSubscription ?? true;
  const hasCalledCreatePlan = useRef(false);
  const stripePromise = useMemo(
    () =>
      window.miruniData.stripePublicKey ? loadStripe(window.miruniData.stripePublicKey) : null,
    [window.miruniData.stripePublicKey],
  );

  useEffect(() => {
    if (workspaceId && !hasCalledCreatePlan.current) {
      hasCalledCreatePlan.current = true;
      createPlan({
        variables: {
          workspaceId,
        },
      }).catch(logError);
    }
  }, [workspaceId, createPlan]);

  // Gradient colors - adapted for WordPress admin
  const gradientBg = 'linear-gradient(135deg, #8a2be2 0%, #c13584 100%)';
  const highlightColor = '#8a2be2';

  const priceDollars = plan?.pricePerMonth ? Math.floor(plan.pricePerMonth / 100) : null;
  const priceCents = plan?.pricePerMonth ? Math.abs(plan.pricePerMonth % 100) : null;

  useEffect(() => {
    // Show payment form after a short delay for better UX
    const timer = setTimeout(() => {
      setPaymentFormVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Show error alert when payment error occurs
  useEffect(() => {
    if (paymentError) {
      onErrorOpen();
    } else {
      onErrorClose();
    }
  }, [paymentError, onErrorOpen, onErrorClose]);

  const handleErrorClose = () => {
    setPaymentError(null);
    onErrorClose();
  };

  const onPaid = useCallback(async () => {
    goToView(ViewName.PAYMENT_SUCCESS);
  }, [workspaceId]);

  const getReturnUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', ViewName.PAYMENT_SUCCESS);
    return url.href;
  };
  return (
    <Box
      className="miruni-create-plan-page"
      style={{ fontSize: '16px', backgroundColor: '#f0f0f1' }}
    >
      {/* Header */}
      <Box
        style={{
          background: gradientBg,
          color: 'white',
          padding: '48px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container
          style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}
        >
          <VStack style={{ textAlign: 'center', gap: '16px' }}>
            <SlideFade in={true} style={{ transform: 'translateY(-20px)', opacity: 0 }}>
              <ColorMiruniLogo boxSize={24} />
            </SlideFade>

            <SlideFade in={true} style={{ transform: 'translateY(20px)', opacity: 0 }}>
              <Heading color="white">Complete Your Miruni Setup</Heading>

              <Text style={{ fontSize: '20px', maxWidth: '800px', margin: '0 auto' }}>
                You're just one step away from transforming your WordPress workflow
              </Text>
            </SlideFade>
          </VStack>
        </Container>
      </Box>

      <Container style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Error Alert */}
        <ScaleFade
          in={isErrorVisible}
          style={{ transformOrigin: 'top', opacity: isErrorVisible ? 1 : 0 }}
        >
          {paymentError && (
            <Alert
              status="error"
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                borderRadius: '4px',
                marginBottom: '24px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <AlertIcon />
              <Box style={{ flex: 1 }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>Payment Error</Text>
                <Text style={{ fontSize: '16px' }}>{paymentError}</Text>
              </Box>
              <CloseButton
                onClick={handleErrorClose}
                style={{
                  alignSelf: 'flex-start',
                  position: 'relative',
                  right: '-4px',
                  top: '-4px',
                }}
              />
            </Alert>
          )}
        </ScaleFade>

        <Box
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            marginBottom: '32px',
          }}
        >
          {/* Two-column layout */}
          <Flex
            style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}
          >
            {/* Plan summary column */}
            <Box
              style={{
                width: window.innerWidth < 768 ? '100%' : '40%',
                backgroundColor: '#f5f5f5',
                padding: '32px',
                borderRight: window.innerWidth < 768 ? 'none' : '1px solid #e0e0e0',
                borderBottom: window.innerWidth < 768 ? '1px solid #e0e0e0' : 'none',
              }}
            >
              <VStack style={{ alignItems: 'flex-start', gap: '24px' }}>
                <Badge
                  style={{
                    backgroundColor: highlightColor,
                    color: 'white',
                    fontSize: '14px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                  }}
                >
                  SMART EDIT PLAN
                </Badge>

                <Box>
                  {plan ? (
                    <>
                      <Text style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                        {plan.label}
                      </Text>
                      <Flex style={{ display: 'flex', alignItems: 'baseline' }}>
                        <Text
                          style={{ fontSize: '32px', fontWeight: 'bold', color: highlightColor }}
                        >
                          ${priceDollars}
                        </Text>
                        {priceCents !== null && priceCents > 0 && (
                          <Text
                            style={{ fontSize: '18px', fontWeight: 'bold', color: highlightColor }}
                          >
                            .{priceCents < 10 ? `0${priceCents}` : priceCents}
                          </Text>
                        )}
                        <Text style={{ color: '#666', fontSize: '16px', marginLeft: '4px' }}>
                          /month
                        </Text>
                      </Flex>
                    </>
                  ) : (
                    <>
                      <Skeleton height="24px" width="180px" mb="4px" />
                      <Skeleton height="40px" width="140px" />
                    </>
                  )}
                  {!hasHadPaidSubscription && (
                    <Text style={{ color: '#666', fontSize: '14px' }}>
                      After your 14-day free trial
                    </Text>
                  )}
                </Box>

                <Divider style={{ borderTop: '1px solid #e0e0e0', width: '100%' }} />

                <Box style={{ width: '100%' }}>
                  <Text style={{ fontWeight: '600', marginBottom: '12px' }}>
                    Your plan includes:
                  </Text>
                  <List style={{ listStyleType: 'none', padding: 0 }}>
                    <ListItem
                      style={{
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <CheckCircleIcon style={{ color: '#22c55e', marginRight: '8px' }} />
                      <Text>
                        <strong>
                          {plan ? (
                            plan.monthlySmartEdits
                          ) : (
                            <Skeleton display="inline-block" height="16px" width="40px" />
                          )}
                        </strong>{' '}
                        monthly AI-powered Smart Edits
                      </Text>
                    </ListItem>
                    <ListItem
                      style={{
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <CheckCircleIcon style={{ color: '#22c55e', marginRight: '8px' }} />
                      <Text>WordPress dashboard integration</Text>
                    </ListItem>

                    <ListItem
                      style={{
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <CheckCircleIcon style={{ color: '#22c55e', marginRight: '8px' }} />
                      <Text>Contextual feedback with screenshots</Text>
                    </ListItem>
                    <ListItem
                      style={{
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <CheckCircleIcon style={{ color: '#22c55e', marginRight: '8px' }} />
                      <Text>Unlimited team collaboration</Text>
                    </ListItem>
                  </List>
                </Box>
                {!hasHadPaidSubscription && (
                  <Box
                    style={{
                      backgroundColor: '#e6f7ff',
                      padding: '16px',
                      borderRadius: '4px',
                      borderLeft: '4px solid #1890ff',
                      width: '100%',
                    }}
                  >
                    <Text style={{ fontSize: '14px', color: '#0c53b7' }}>
                      <strong>14-day free trial.</strong> No charges until your trial ends. Cancel
                      anytime before the trial ends.
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Payment form column */}
            <Box style={{ width: window.innerWidth < 768 ? '100%' : '60%', padding: '32px' }}>
              <VStack style={{ gap: '24px', alignItems: 'stretch' }}>
                <Heading style={{ fontSize: '20px' }}>Payment Details</Heading>

                <ScaleFade
                  in={isPaymentFormVisible}
                  style={{ transformOrigin: 'center', opacity: isPaymentFormVisible ? 1 : 0 }}
                >
                  <Box
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'white',
                    }}
                  >
                    {clientSecret && stripePromise ? (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              colorPrimary: '#C93DF1',
                              colorBackground: '#ffffff',
                              colorText: '#000',
                              colorDanger: '#df1b41',
                              fontFamily:
                                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                              borderRadius: '8px',
                              spacingUnit: '4px',
                              fontSizeBase: '16px',
                            },
                          },
                        }}
                      >
                        <PaymentForm
                          onPaid={onPaid}
                          setStripeError={setPaymentError}
                          stripeError={paymentError || ''}
                          stripeType={type ?? StripeType.Setup}
                          hide={false}
                          returnUrl={getReturnUrl()}
                        />
                      </Elements>
                    ) : (
                      <Box style={{ textAlign: 'center', padding: '16px' }}>
                        <Text>Loading payment form...</Text>
                      </Box>
                    )}
                  </Box>
                </ScaleFade>
              </VStack>
            </Box>
          </Flex>
        </Box>

        {/* Additional help text for payment issues */}
        {isErrorVisible && (
          <Box
            style={{
              marginBottom: '24px',
              padding: '16px',
              borderRadius: '4px',
              backgroundColor: '#fff8e1',
              border: '1px solid #ffe082',
            }}
          >
            <Text style={{ fontSize: '14px', color: '#b45309' }}>
              <strong>Having trouble?</strong> If your payment isn't processing, please try:
            </Text>
            <List
              style={{
                marginTop: '8px',
                marginLeft: '16px',
                fontSize: '14px',
                color: '#b45309',
                listStyleType: 'none',
              }}
            >
              <ListItem>• Verifying your card information is correct</ListItem>
              <ListItem>• Checking with your bank for any transaction blocks</ListItem>
              <ListItem>• Using a different payment method</ListItem>
              <ListItem>• Contacting support for immediate help</ListItem>
            </List>
          </Box>
        )}
      </Container>
    </Box>
  );
};
