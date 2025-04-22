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
import { StripeType, useCreatePlanPageSubscriptionMutation } from '@miruni/graphql';

import PaymentForm from '#/admin/components/payment/payment-form';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';
import { logError } from '#/admin/utils/logging';

export const RenewPlanPage = () => {
  const [renewSubscription, { data: renewSubscriptionData }] =
    useCreatePlanPageSubscriptionMutation();
  const { workspace } = useMiruniUser();
  const { goToView } = useWordPressNavigation();
  const workspaceId = workspace?.id;
  const clientSecret =
    renewSubscriptionData?.createPlanPageCreateSubscription?.subscriptionResponse?.clientSecret;
  const plan = renewSubscriptionData?.createPlanPageCreateSubscription?.plan;
  const type = renewSubscriptionData?.createPlanPageCreateSubscription?.subscriptionResponse?.type;
  const [isPaymentFormVisible, setPaymentFormVisible] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { isOpen: isErrorVisible, onClose: onErrorClose, onOpen: onErrorOpen } = useDisclosure();
  const hasCalledRenewSubscription = useRef(false);
  const stripePromise = useMemo(
    () =>
      window.miruniData.stripePublicKey ? loadStripe(window.miruniData.stripePublicKey) : null,
    [window.miruniData.stripePublicKey],
  );

  useEffect(() => {
    if (workspaceId && !hasCalledRenewSubscription.current) {
      hasCalledRenewSubscription.current = true;
      renewSubscription({
        variables: {
          workspaceId,
        },
      }).catch(logError);
    }
  }, [workspaceId, renewSubscription]);

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
  }, [goToView]);

  const getReturnUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', ViewName.PAYMENT_SUCCESS);
    return url.href;
  };

  return (
    <Box
      className="miruni-renew-plan-page"
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
              <Heading color="white">Come Back to Miruni</Heading>

              <Text style={{ fontSize: '20px', maxWidth: '800px', margin: '0 auto' }}>
                Reactivate your {plan?.label} plan and regain access to all your favorite features
                that helped streamline your WordPress workflow
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
                  REACTIVATE YOUR PLAN
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
                        {priceCents && priceCents > 0 && (
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
                </Box>

                <Divider style={{ borderTop: '1px solid #e0e0e0', width: '100%' }} />

                <Box style={{ width: '100%' }}>
                  <Text style={{ fontWeight: '600', marginBottom: '12px' }}>
                    What you'll get back:
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
                        monthly AI-powered smart edits
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

                <Box
                  style={{
                    backgroundColor: '#e6ffec',
                    padding: '16px',
                    borderRadius: '4px',
                    borderLeft: '4px solid #22c55e',
                    width: '100%',
                  }}
                >
                  <Text style={{ fontSize: '14px', color: '#166534' }}>
                    <strong>No setup required.</strong> Your workspace will be instantly reactivated
                    with all your previous content and configurations.
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* Payment form column */}
            <Box style={{ width: window.innerWidth < 768 ? '100%' : '60%', padding: '32px' }}>
              <VStack style={{ gap: '24px', alignItems: 'stretch' }}>
                <Heading style={{ fontSize: '20px' }}>Reactivate Your Subscription</Heading>

                <Text style={{ color: '#666' }}>
                  Complete the payment details below to restore access to your {plan?.label} plan
                  and continue working with your WordPress sites seamlessly.
                </Text>

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
                            rules: {
                              '.Tab': {
                                border: '1px solid #C93DF1',
                                boxShadow:
                                  '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02)',
                                borderRadius: '12px',
                              },
                              '.Tab:hover': {
                                color: 'var(--colorText)',
                              },
                              '.Tab--selected': {
                                borderColor: '#C93DF1',
                                boxShadow:
                                  '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02), 0 0 0 2px var(--colorPrimary)',
                              },
                              '.Input': {
                                padding: '12px',
                              },
                              '.Input:focus': {
                                boxShadow: '0 0 0 2px var(--colorPrimary)',
                              },
                              '.Label': {
                                fontWeight: '500',
                              },
                              '.Error': {
                                fontWeight: '500',
                              },
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

        {/* Help section */}
        <Box style={{ textAlign: 'center', paddingTop: '16px', paddingBottom: '24px' }}>
          <Text style={{ fontWeight: 'bold', fontSize: '14px' }}>Need Help?</Text>
          <Text style={{ fontSize: '14px', color: '#666' }}>
            Click the help icon for assistance or email support@miruni.com.
          </Text>
        </Box>
      </Container>
    </Box>
  );
};
