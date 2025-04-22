import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useMarkAiSuggestionBatchViewedMutation,
  useStoryAiSuggestionsQuery,
} from '@miruni/graphql';

import { PreviewResponse, WPClient } from '#/admin/services/wp-client';
import { Change, UpdateRequiredType } from '#/admin/types/suggestion';
import { logError } from '#/admin/utils/logging';

export const useAiSuggestions = (storyId?: number) => {
  const [selectedSuggestionBatchId, setSelectedSuggestionBatchId] = useState<number | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [previewResponse, setPreviewResponse] = useState<PreviewResponse | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markAiSuggestionAsViewed] = useMarkAiSuggestionBatchViewedMutation();

  const clearError = useCallback(() => setError(null), []);

  const { data: storyAiSuggestionData } = useStoryAiSuggestionsQuery({
    variables: {
      storyId: storyId as number,
    },
    skip: !storyId,
    pollInterval: isGeneratingSuggestion ? 5000 : 0, // Poll every 5 seconds when generating
  });
  useEffect(() => {
    if (selectedSuggestionBatchId) return;
    const firstBatchId = storyAiSuggestionData?.storyAiSuggestionBatches?.nodes[0]?.id;
    if (firstBatchId) {
      setSelectedSuggestionBatchId(firstBatchId);
    }
  }, [
    storyAiSuggestionData?.storyAiSuggestionBatches?.nodes[0]?.id,
    selectedSuggestionBatchId,
    setSelectedSuggestionBatchId,
  ]);

  useEffect(() => {
    const batchId = storyAiSuggestionData?.storyAiSuggestionBatches?.nodes[0]?.id;
    if (!batchId) return;
    const batchViewed = storyAiSuggestionData?.storyAiSuggestionBatches?.nodes[0]?.firstViewedAt;
    if (batchViewed) return;
    markAiSuggestionAsViewed({
      variables: {
        suggestionBatchId: storyAiSuggestionData?.storyAiSuggestionBatches?.nodes[0]?.id as number,
      },
    }).catch(logError);
  }, [storyAiSuggestionData?.storyAiSuggestionBatches?.nodes[0]?.firstViewedAt]);

  const suggestionBatches = storyAiSuggestionData?.storyAiSuggestionBatches?.nodes || [];
  const selectedBatch = useMemo(
    () =>
      selectedSuggestionBatchId
        ? suggestionBatches.find((batch) => batch.id === selectedSuggestionBatchId)
        : suggestionBatches[0] ?? null,
    [selectedSuggestionBatchId, suggestionBatches],
  );

  // automatically select the first suggestion in the batch
  useEffect(() => {
    if (!selectedBatch) return;
    const selectedSuggestionIdInBatch =
      selectedBatch.storyAiSuggestionsBySuggestionBatchId.nodes.find(
        (suggestion) => suggestion.id === selectedSuggestionId,
      );

    if (selectedSuggestionIdInBatch) return;
    setSelectedSuggestionId(
      selectedBatch.storyAiSuggestionsBySuggestionBatchId.nodes[0]?.id ?? null,
    );
  }, [selectedBatch, selectedSuggestionId]);

  const selectedSuggestion = useMemo(
    () =>
      selectedSuggestionId
        ? selectedBatch?.storyAiSuggestionsBySuggestionBatchId.nodes.find(
            (suggestion) => suggestion.id === selectedSuggestionId,
          )
        : selectedBatch?.storyAiSuggestionsBySuggestionBatchId.nodes[0] ?? null,
    [selectedSuggestionId, selectedBatch],
  );

  const requestEditPreview = useCallback(
    async (page?: number) => {
      if (!selectedBatch) return;
      setError(null); // Clear any previous errors
      const suggestions = selectedBatch.storyAiSuggestionsBySuggestionBatchId.nodes;

      WPClient.requestEditPreview2(page || Number(selectedPage), selectedBatch.id, suggestions)
        .then((response) => {
          setDraftTitle(response.preview_title);
          setPreviewUrl(response.preview_url);
          setPreviewResponse(response);
          setIsGeneratingSuggestion(false);
        })
        .catch((err) => {
          logError(err);
          setError("Sorry, we couldn't generate a preview for this suggestion.");
          setIsGeneratingSuggestion(false);
        });
    },
    [selectedBatch, selectedPage],
  );

  useEffect(() => {
    if (!storyAiSuggestionData || !suggestionBatches.length) return;
    const newBatchHasArrived = selectedBatch && selectedBatch.id !== suggestionBatches[0].id;
    const batch = suggestionBatches[0];
    const _selectedPage = batch.contentMetadata?.postId;
    if (selectedPage === _selectedPage && !newBatchHasArrived) return;

    setSelectedPage(_selectedPage);

    requestEditPreview(_selectedPage).catch(logError);
  }, [storyAiSuggestionData, selectedSuggestionBatchId, selectedPage, suggestionBatches]);

  // Stop polling when we detect new suggestions
  useEffect(() => {
    if (isGeneratingSuggestion && storyAiSuggestionData?.storyAiSuggestionBatches?.nodes.length) {
      const latestBatch = storyAiSuggestionData.storyAiSuggestionBatches.nodes[0];
      // Check if this is a new batch
      if (latestBatch.id !== selectedBatch?.id) {
        setIsGeneratingSuggestion(false);
        setSelectedSuggestionBatchId(latestBatch.id);
      }
    }
  }, [storyAiSuggestionData, isGeneratingSuggestion, selectedBatch]);

  const suggestions = selectedBatch?.storyAiSuggestionsBySuggestionBatchId.nodes || [];

  const changes: Change[] = useMemo(
    () =>
      previewResponse?.changes
        .map((change) => {
          const suggestion = suggestions.find(
            (s) => s.fileIdentifier === change.file_identifier || s.fileType === change.file_name,
          );
          return {
            draftId: previewResponse?.preview_page_id || -1,
            suggestionId: suggestion?.id || -1,
            fileName: change.file_name,
            fileType: (suggestion?.fileType as UpdateRequiredType) ?? undefined,
            changesMade: change.changes_made,
            confidenceScore: suggestion?.confidence || 0,
            userScore: suggestion?.userFeedbackScore || undefined,
            userComments: suggestion?.userFeedbackComments || '',
            fileIdentifier: suggestion?.fileIdentifier ?? undefined,
            originalContent: change.original_content,
            newContent: suggestion?.updatedFileContent ?? undefined,
            post: change.post
              ? {
                  postId: change.post.post_id,
                  postTitle: change.post.post_title,
                  postContent: change.post.post_content,
                }
              : undefined,
          } as Change;
          // POST and POST_TITLE should be first
        })
        .sort((a, b) => {
          if (a.fileType === UpdateRequiredType.POST_CONTENT) return -1;
          if (b.fileType === UpdateRequiredType.POST_CONTENT) return 1;
          if (a.fileType === UpdateRequiredType.POST_TITLE) return -1;
          if (b.fileType === UpdateRequiredType.POST_TITLE) return 1;
          return 0;
        }) || [],
    [previewResponse, suggestions],
  );

  const selectedChange = useMemo(
    () => changes.find((change) => change.suggestionId === selectedSuggestionId),
    [changes, selectedSuggestionId],
  );

  const updateDraftTitle = useCallback(
    async (newTitle: string) => {
      if (!previewResponse) return;
      setDraftTitle(newTitle);
      return WPClient.updateDraftTitle(previewResponse.preview_page_id, newTitle).catch(logError);
    },
    [previewResponse],
  );

  return {
    suggestions,
    selectedSuggestion,
    suggestionBatches,
    selectedSuggestionBatchId,
    selectedBatch,
    setSelectedSuggestionBatchId,
    selectedSuggestionId,
    setSelectedSuggestionId,
    setIsGeneratingSuggestion,
    isGeneratingSuggestion,
    previewResponse,
    previewUrl,
    selectedPage,
    setPreviewUrl,
    setPreviewResponse,
    clearPreviewResponse: () => {
      setPreviewResponse(null);
    },
    changes,
    selectedChange,
    requestEditPreview,
    updateDraftTitle,
    draftTitle,
    error,
    clearError,
    setError,
  };
};
