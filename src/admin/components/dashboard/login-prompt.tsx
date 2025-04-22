import { Container, VStack, Heading, Text } from '@chakra-ui/react';

import { ColorMiruniLogo } from '@miruni/eds';

import { LoginButton, SignupButton } from '#/admin/components/shared/login-button';
import { useIsLoading } from '#/admin/hooks/use-is-loading';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

export const LoginPrompt = () => {
  const { refetchMiruniUser } = useMiruniUser();
  const { setLoading } = useIsLoading();

  const onLoginCallback = () => {
    refetchMiruniUser();

    setLoading('Fetching your data from Miruni');
  };

  return (
    <Container maxW="md" py={6} background="white" borderRadius="md" boxShadow="md">
      <VStack spacing={6} align="center">
        <ColorMiruniLogo boxSize={24} />

        <VStack spacing={8} width="full">
          <VStack spacing={3}>
            <Heading size="lg" fontWeight="400">
              Welcome to Miruni
            </Heading>
            <Text color="gray.600" textAlign="center">
              Get started with Miruni to start automating edit requests
            </Text>
          </VStack>

          <VStack width="full" spacing={4}>
            <SignupButton callback={onLoginCallback} />
            <Text color="gray.600">Already have an account?</Text>
            <LoginButton callback={onLoginCallback} />
          </VStack>
        </VStack>
      </VStack>
    </Container>
  );
};
