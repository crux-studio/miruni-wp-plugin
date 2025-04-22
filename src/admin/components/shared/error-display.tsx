import { FC } from 'react';

import { Container, VStack, Heading, Text, Button } from '@chakra-ui/react';

import { ColorMiruniLogo } from '@miruni/eds';

import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  details?: string;
  showLogo?: boolean;
}

export const ErrorDisplay: FC<ErrorDisplayProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while processing your request.',
  details,
  showLogo = true,
}) => {
  const { goToView } = useWordPressNavigation();

  return (
    <Container maxW="xl" px={8} py={12} background="white" borderRadius="lg" boxShadow="lg">
      <VStack spacing={8} align="center">
        {showLogo && <ColorMiruniLogo boxSize={20} />}

        <VStack spacing={6} width="full" maxW="md" mx="auto">
          <VStack spacing={4}>
            <Heading size="lg" fontWeight="500" textAlign="center">
              {title}
            </Heading>
            <Text fontSize="lg" color="gray.600" textAlign="center" lineHeight="tall">
              {message}
            </Text>
            {details && (
              <Text fontSize="md" color="gray.500" textAlign="center" lineHeight="tall">
                {details}
              </Text>
            )}
          </VStack>

          <Button
            variant="solid"
            rounded="full"
            color="white"
            bg="black"
            onClick={() => goToView(ViewName.DASHBOARD)}
            fontWeight="medium"
          >
            Back to dashboard
          </Button>
        </VStack>
      </VStack>
    </Container>
  );
};
