import { useMemo } from 'react';

import { Box, Container, Flex } from '@chakra-ui/react';

import { ColorMiruniLogoWithTextHorizontal } from '@miruni/eds';

import { LoginPrompt } from './components/dashboard/login-prompt';
import { LoadingScreen } from './components/loading';
import { TopMenu } from './components/shared/top-menu';
import { useIsLoading } from './hooks/use-is-loading';
import { useMiruniUser } from './hooks/use-miruni-user';

export const Layout = ({ children }) => {
  const { userNotFound, user } = useMiruniUser();

  const { isLoading } = useIsLoading();

  const content = useMemo(() => {
    if (isLoading) {
      return <LoadingScreen />;
    }

    if (userNotFound || !user) {
      return <LoginPrompt />;
    }

    return children;
  }, [isLoading, userNotFound, user, children]);

  return (
    <Box id="miruni-admin-layout">
      <Box py={2}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center" h="60px">
            <ColorMiruniLogoWithTextHorizontal w="140px" />
            <TopMenu />
          </Flex>
        </Container>
      </Box>
      <Container maxW="container.xl" pt={8}>
        {content}
      </Container>
    </Box>
  );
};
