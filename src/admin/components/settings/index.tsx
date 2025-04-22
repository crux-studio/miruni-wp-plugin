import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';

import { BillingSettings } from './billing';
import { ProjectMapping } from './project-mapping';

export const SettingsPageMenu = () => {
  return (
    <Container
      minW="full"
      bg="white"
      borderRadius="12px"
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.1)"
      w="full"
      p={0}
    >
      <VStack align="stretch" spacing={0}>
        <Box p={6} borderBottom="1px solid" borderColor="gray.100">
          <Heading fontSize="xl" fontWeight="500" mb={2} color="black">
            Miruni WordPress Settings
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Configure your WordPress integration with Miruni
          </Text>
        </Box>

        <Box>
          <ProjectMapping />
          <BillingSettings />
        </Box>
      </VStack>
    </Container>
  );
};
