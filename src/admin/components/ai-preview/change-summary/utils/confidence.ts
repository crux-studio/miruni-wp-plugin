import { BadgeProps } from '@chakra-ui/react';

export const getConfidenceColor = (score: number): BadgeProps['colorScheme'] => {
  if (score >= 0.9) return 'green';
  if (score >= 0.7) return 'teal';
  if (score >= 0.5) return 'yellow';
  return 'orange';
};

export const formatConfidence = (score: number): string => {
  return `${Math.round(score * 100)}%`;
};
