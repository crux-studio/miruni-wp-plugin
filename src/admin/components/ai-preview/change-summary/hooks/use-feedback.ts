import { useState, useEffect } from 'react';

import { useAddAiSuggestionFeedbackMutation } from '@miruni/graphql';

import { FeedbackState } from '#/admin/components/ai-preview/change-summary/types';
import { Change } from '#/admin/types/suggestion';
import { logError } from '#/admin/utils/logging';

export const useFeedback = () => {
  const [changes, setChanges] = useState<Change[]>([]);
  const [addAiSuggestionFeedback] = useAddAiSuggestionFeedbackMutation({});

  const setInitialFeedback = (): FeedbackState => {
    const initialFeedback: FeedbackState = {};
    if (changes) {
      changes.forEach((change) => {
        initialFeedback[change.suggestionId] = {
          isNegative: change.userScore ? change.userScore === 0 : undefined,
          showComments: !!change.userComments,
          comment: change.userComments,
          isExpanded: false,
        };
      });
    }
    return initialFeedback;
  };

  const [feedback, setFeedback] = useState<FeedbackState>(setInitialFeedback());

  useEffect(() => {
    // Only update feedback state for NEW changes or changes with DIFFERENT feedback values
    if (changes) {
      setFeedback((prevFeedback) => {
        const newFeedback = { ...prevFeedback };

        changes.forEach((change) => {
          const id = change.suggestionId;

          // If we don't have feedback for this ID yet, or the server feedback has changed
          if (
            !prevFeedback[id] ||
            (change.userScore !== undefined &&
              (prevFeedback[id].isNegative === undefined ||
                (change.userScore === 0) !== prevFeedback[id].isNegative)) ||
            change.userComments !== prevFeedback[id].comment
          ) {
            newFeedback[id] = {
              isNegative: change.userScore !== undefined ? change.userScore === 0 : undefined,
              showComments: !!change.userComments,
              comment: change.userComments || '',
              isExpanded: prevFeedback[id]?.isExpanded || false,
            };
          }
        });

        return newFeedback;
      });
    }
  }, [changes]);

  const handleFeedback = (id: number, isNegative: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedback((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isNegative,
        showComments: isNegative,
      },
    }));

    addAiSuggestionFeedback({
      variables: {
        input: {
          inSuggestionId: id,
          score: isNegative ? 0 : 1,
        },
      },
    }).catch(logError);
  };

  const handleCommentChange = (id: number, comment: string) => {
    setFeedback((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        comment,
      },
    }));

    // Find the change with this suggestionId
    if (changes) {
      const changeIndex = changes.findIndex((change) => change.suggestionId === id);
      if (changeIndex !== -1) {
        changes[changeIndex].userComments = comment;
      }
    }
  };

  const onCommentBlur = (id: number) => {
    if (!changes) return;

    const changeIndex = changes.findIndex((change) => change.suggestionId === id);
    if (changeIndex !== -1) {
      addAiSuggestionFeedback({
        variables: {
          input: {
            inSuggestionId: id,
            comment: changes[changeIndex].userComments,
          },
        },
      }).catch(logError);
    }
  };

  const toggleExpanded = (id: number) => {
    setFeedback((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isExpanded: !prev[id].isExpanded,
      },
    }));
  };

  return {
    feedback,
    handleFeedback,
    handleCommentChange,
    onCommentBlur,
    toggleExpanded,
    setChanges,
  };
};
