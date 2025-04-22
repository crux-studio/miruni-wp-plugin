import { useMemo } from 'react';

import { Button, Box, Container, VStack, Heading, Text } from '@chakra-ui/react';

import { LinkExternalIcon } from '@miruni/eds/src/icons/link-external.icon';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

export const BillingSettings = () => {
  const { workspace } = useMiruniUser();
  const billingUrl = useMemo(() => {
    if (!workspace) return null;
    const url = new URL(
      `/${workspace.code}-${workspace.id}/workspace-settings/billing`,
      window.miruniData.miruniWebappUrl,
    );
    return url.toString();
  }, [workspace]);

  return (
    <Container maxW="full" paddingInline={0}>
      <VStack align="stretch" p={6} spacing={6}>
        <Heading size="md" fontWeight="400" lineHeight="1.4" letterSpacing="-0.4px">
          Billing Settings
        </Heading>

        <Box bg="white" borderRadius="md" shadow="sm" p={6}>
          <VStack align="stretch" spacing={6}>
            <Text fontSize="md" mb={3} color="gray.600">
              Manage your subscription, payment methods, and billing history in our web application.
            </Text>

            {billingUrl && (
              <Button
                as="a"
                bg="fuchsia.900"
                color="white"
                size="md"
                href={billingUrl}
                target="_blank"
                rel="noopener noreferrer"
                rightIcon={<LinkExternalIcon />}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                  color: 'white',
                }}
                transition="all 0.2s"
              >
                Manage Billing
              </Button>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};
