import { keyframes, Box, BoxProps } from '@chakra-ui/react';

import { AI_GRADIENT } from '#/admin/constants/styles';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Enhanced animation for the box shadow
const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.6), 0 0 10px rgba(167, 139, 250, 0.4); }
  50% { box-shadow: 0 0 10px rgba(236, 72, 153, 0.8), 0 0 20px rgba(167, 139, 250, 0.6); }
  100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.6), 0 0 10px rgba(167, 139, 250, 0.4); }
`;

export interface AnimatedGradientBorderProps extends BoxProps {
  isActive?: boolean;
  gradientColors?: string;
  thickness?: string;
  duration?: string;
  children: React.ReactNode;
}

export const AnimatedGradientBorder = ({
  isActive = true,
  gradientColors = AI_GRADIENT,
  thickness = '1px',
  duration = '4s',
  children,
  ...rest
}: AnimatedGradientBorderProps) => {
  if (!isActive) {
    return <Box {...rest}>{children}</Box>;
  }

  return (
    <Box
      position="relative"
      sx={{
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'inherit',
          padding: thickness,
          background: gradientColors,
          backgroundSize: '300% 300%',
          maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          pointerEvents: 'none',
          zIndex: 1,
          animation: `${gradientAnimation} ${duration} ease infinite`,
        },
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};

export const useAnimatedGradientStyle = (
  isActive: boolean,
  thickness = '2px',
  duration = '4s',
  addGlow = true,
) => {
  if (!isActive) return {};

  return {
    position: 'relative',
    boxShadow: addGlow
      ? '0 0 10px rgba(236, 72, 153, 0.7), 0 0 20px rgba(167, 139, 250, 0.5)'
      : 'none',
    animation: addGlow ? `${glowAnimation} 4s ease infinite` : 'none',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 'inherit',
      padding: thickness,
      background: AI_GRADIENT,
      backgroundSize: '300% 300%',
      maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      maskComposite: 'exclude',
      pointerEvents: 'none',
      zIndex: 1,
      animation: `${gradientAnimation} ${duration} ease infinite`,
    },
  };
};
