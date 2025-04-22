import { Container, VStack, Heading, Text } from '@chakra-ui/react';

import { ColorMiruniLogo } from '@miruni/eds';

export const ProjectNotAvailablePrompt = () => {
  return (
    <Container maxW="xl" px={8} py={12} background="white" borderRadius="lg" boxShadow="lg">
      <VStack spacing={10} align="center">
        <ColorMiruniLogo boxSize={24} />

        <VStack spacing={10} width="full" maxW="md" mx="auto">
          <VStack spacing={4}>
            <Heading size="xl" fontWeight="500" textAlign="center">
              It looks like you don't have access to this Miruni project.
            </Heading>
            <Text fontSize="lg" color="gray.600" textAlign="center" lineHeight="tall">
              Please contact the project owner or an admin to request access to the Miruni project
              associated with this Wordpress website.
            </Text>
            <Text fontSize="lg" color="gray.600" textAlign="center" lineHeight="tall">
              Then you will be able to create and manage edit requests and collaborate with your
              team.
            </Text>
          </VStack>
        </VStack>
      </VStack>
    </Container>
  );
};
