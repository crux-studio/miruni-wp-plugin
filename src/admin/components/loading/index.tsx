import { useRef } from 'react';

import { Container, VStack, Text, Box } from '@chakra-ui/react';

import { ColorMiruniLogoWithTextHorizontal } from '@miruni/eds';

import { useIsLoading } from '#/admin/hooks/use-is-loading';

export const LoadingScreen = () => {
  const { loadingMessage } = useIsLoading();
  const textRef = useRef<HTMLDivElement>(null);

  return (
    <Container alignItems="center" display="flex">
      <VStack
        spacing={8}
        justifyContent="center"
        align="center"
        w="full"
        h="50vh"
        alignItems={'center'}
      >
        <ColorMiruniLogoWithTextHorizontal w="160px" h="42px" />
        <Box textAlign="center" overflow="hidden" textOverflow="ellipsis">
          <Text ref={textRef}>{loadingMessage}</Text>
        </Box>
      </VStack>
    </Container>
  );
};
