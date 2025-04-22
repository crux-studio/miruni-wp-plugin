import { FC, JSXElementConstructor, ReactElement } from 'react';

import { IconButton } from '@chakra-ui/react';

interface ScrollButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: ReactElement<any, string | JSXElementConstructor<any>>;
  onClick: () => void;
  direction: 'left' | 'right';
}

export const ScrollButton: FC<ScrollButtonProps> = ({ icon, onClick, direction }) => {
  return (
    <IconButton
      aria-label={`Scroll ${direction}`}
      icon={icon}
      position="absolute"
      right={direction === 'right' ? 0 : 'auto'}
      top="50%"
      transform="translateY(-50%)"
      zIndex={2}
      size="sm"
      onClick={onClick}
      variant="solid"
      colorScheme="fuchsia"
      borderRadius="full"
      color="fuchsia.900"
      bgColor="white"
      border="1px fuchsia.900"
      _hover={{ bgColor: 'fuchsia.50' }}
    />
  );
};
