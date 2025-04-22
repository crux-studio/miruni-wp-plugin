import { FC, ReactNode } from 'react';

import { Box, Button, ButtonProps } from '@chakra-ui/react';

import { AI_GRADIENT } from '#/admin/constants/styles';

export interface AIGlowButtonProps extends ButtonProps {
  children: ReactNode;
}

export const AIGlowButton: FC<AIGlowButtonProps> = ({ children, ...rest }) => {
  return (
    <Box
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      className="glow-button-container"
    >
      {/* Gradient glow effect */}
      {!rest.isDisabled && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bgGradient={AI_GRADIENT}
          rounded={rest.rounded || 'md'}
          filter="auto"
          blur="4px"
          opacity="0.5"
          _groupHover={{ opacity: 0.75 }}
          transition="opacity 0.2s"
          transform="scale(1.1)"
          pointerEvents="none"
        />
      )}
      {/* Button content */}
      <Button
        position="relative"
        role="group"
        size="xs"
        bg="black"
        color="white"
        _hover={{ bg: 'blackAlpha.800' }}
        {...rest}
      >
        {children}
      </Button>
    </Box>
  );
};
