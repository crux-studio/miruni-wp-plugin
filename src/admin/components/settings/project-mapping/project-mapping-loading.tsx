import { VStack, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export const ProjectMappingLoading = () => {
  const [ellipses, setEllipses] = useState('...');

  useEffect(() => {
    const interval = setInterval(() => {
      setEllipses((prev) => (prev.length === 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [ellipses]);

  return (
    <VStack align="center" py={8} spacing={6}>
      <Spinner size="lg" color="black" thickness="3px" speed="0.7s" />
      <Text color="gray.600" fontSize="sm" fontWeight="500">
        Loading project mapping{ellipses}
      </Text>
    </VStack>
  );
};
