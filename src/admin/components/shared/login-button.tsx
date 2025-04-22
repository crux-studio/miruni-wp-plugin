import { FC } from 'react';

import { useApolloClient } from '@apollo/client';
import { Button, ButtonProps } from '@chakra-ui/react';

import { loginWithMiruni, signoutFromMiruni } from '#/admin/auth/miruni-login';
import { useIsLoading } from '#/admin/hooks/use-is-loading';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';

type BaseLoginSignupButtonProps = ButtonProps & {
  loginFunction: () => void;
  buttonText: string;
};

const BaseLoginSignupButton: FC<BaseLoginSignupButtonProps> = ({
  loginFunction,
  buttonText,
  ...props
}) => {
  return (
    <Button
      onClick={loginFunction}
      size="lg"
      width="max-content"
      fontSize="md"
      cursor="pointer"
      {...props}
    >
      {buttonText}
    </Button>
  );
};

export type LoginSignupButtonProps = ButtonProps & {
  callback?: () => void;
};

export const LoginButton: FC<LoginSignupButtonProps> = ({ callback, ...props }) => {
  const { setLoading, clearLoading } = useIsLoading();

  const onLoginClick = () => {
    setLoading('Waiting for you to log into your account');
    loginWithMiruni(callback, {}, clearLoading);
  };
  return (
    <BaseLoginSignupButton
      {...props}
      variant="outline"
      background="white"
      color="black"
      borderColor="black"
      _hover={{ bg: 'black', color: 'white', borderColor: 'black' }}
      loginFunction={onLoginClick}
      buttonText="Log in to your account"
    />
  );
};

export const SignupButton: FC<LoginSignupButtonProps> = ({ callback, ...props }) => {
  const { setLoading, clearLoading } = useIsLoading();

  const onSignupClick = () => {
    setLoading('Setting up your workspace');

    loginWithMiruni(
      callback,
      {
        screen_hint: 'signup',
      },
      clearLoading,
    );
  };
  return (
    <BaseLoginSignupButton
      {...props}
      bg="black"
      color="white"
      _hover={{ bg: 'white', color: 'black', border: '1px solid black' }}
      loginFunction={onSignupClick}
      buttonText="Create your free account"
    />
  );
};

export const SignoutButton: FC<ButtonProps> = (props) => {
  const apolloClient = useApolloClient();
  const { goToView } = useWordPressNavigation();
  const { clearLoading } = useIsLoading();
  const { clearMiruniUser } = useMiruniUser();
  return (
    <BaseLoginSignupButton
      {...props}
      variant="ghost"
      color="gray.600"
      fontSize="sm"
      _hover={{ color: 'fuchsia.900', bg: 'gray.50' }}
      loginFunction={async () => {
        await signoutFromMiruni();
        await apolloClient.resetStore().catch(() => {
          return;
        });
        clearMiruniUser();
        clearLoading();
        goToView(ViewName.DASHBOARD);
      }}
      size={props.size || 'sm'}
      buttonText="Sign out"
    />
  );
};
