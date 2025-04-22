import { FC } from 'react';

import { ButtonProps } from '@chakra-ui/react';

import { Params } from '@miruni/models';

import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';
import { captureEvent, TrackingEvent } from '#/admin/logging/posthog';

import { AIGlowButton } from './ai-glow-button';

export interface ReviewSuggestionButtonProps extends ButtonProps {
  storyId: number;
}

export const ReviewSuggestionButton: FC<ReviewSuggestionButtonProps> = ({ storyId, ...rest }) => {
  const { goToView } = useWordPressNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    captureEvent(TrackingEvent.VIEWED_SUGGESTION, {
      storyId: storyId,
    });
    goToView(ViewName.AI_PREVIEW, {
      [Params.STORY_ID]: String(storyId),
    });
  };

  return (
    <AIGlowButton onClick={handleClick} {...rest}>
      Review
    </AIGlowButton>
  );
};
