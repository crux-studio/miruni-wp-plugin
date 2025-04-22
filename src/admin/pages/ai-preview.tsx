import { useRef, useMemo } from 'react';

import { Badge, Box, Button, Flex } from '@chakra-ui/react';

import {
  useGenerateAiSuggestionMutation,
  useMarkSuggestionBatchAppliedWithContentMutation,
  useMarkSuggestionBatchRevertedMutation,
} from '@miruni/graphql';
import { Params } from '@miruni/models';

import { AiSuggestionChangesSummary } from '#/admin/components/ai-preview/change-summary';
import { AiPreviewSummary } from '#/admin/components/ai-preview/edit-request-summary/summary';
import { useAiSuggestions } from '#/admin/components/ai-preview/hooks/use-suggestions';
import { PreviewContainer } from '#/admin/components/ai-preview/preview-container';
import { SmartEditContainer } from '#/admin/components/ai-preview/smart-edit-container.component';
import { SmartEditSubContainer } from '#/admin/components/ai-preview/smart-edit-sub-container.component';
import { addDeactivateSnippetParam } from '#/admin/components/ai-preview/utils/params';
import { EditWithPreview } from '#/admin/components/editor/edit-with-preview';
import { ErrorDisplay } from '#/admin/components/shared/error-display';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';
import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';
import { WPClient } from '#/admin/services/wp-client';
import { logError } from '#/admin/utils/logging';

export const AIPreviewPage = () => {
  const [generateStoryAiSuggestion] = useGenerateAiSuggestionMutation();
  const { workspace } = useMiruniUser();
  const workspaceHasSmartEdits =
    !!workspace?.remainingSmartEditAllowanceThisPeriod &&
    workspace.remainingSmartEditAllowanceThisPeriod > 0;

  const { getQueryParams } = useWordPressNavigation();
  const { goToView } = useWordPressNavigation();

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const publishedIframeRef = useRef<HTMLIFrameElement>(null);

  let storyId: string | string[] | undefined = getQueryParams()?.[Params.STORY_ID];
  if (Array.isArray(storyId)) storyId = storyId[0];

  const {
    previewResponse,
    previewUrl,
    selectedPage,
    selectedBatch,
    suggestions,
    isGeneratingSuggestion,
    setSelectedSuggestionId,
    setIsGeneratingSuggestion,
    clearPreviewResponse,
    changes,
    selectedChange,
    updateDraftTitle,
    draftTitle,
    error,
    setError,
  } = useAiSuggestions(storyId ? Number(storyId) : undefined);

  const [markSuggestionBatchApplied, { loading: markSuggestionBatchAppliedLoading }] =
    useMarkSuggestionBatchAppliedWithContentMutation({
      update: (cache) => {
        // set the appliedAt for this batch to the current time
        const appliedAt = new Date().toISOString();
        cache.modify({
          id: selectedBatch?.nodeId,
          fields: {
            appliedAt: () => appliedAt,
          },
        });
      },
    });

  const [markSuggestionBatchReverted, { loading: makSuggestionBatchRevertedLoading }] =
    useMarkSuggestionBatchRevertedMutation({
      update: (cache) => {
        // set the appliedAt for this batch to null
        cache.modify({
          id: selectedBatch?.nodeId,
          fields: {
            appliedAt: () => null,
          },
        });
      },
    });

  const originalUrl = useMemo(() => {
    if (!selectedPage) return null;
    if (Number(selectedPage) === -1) return '/';
    return `/?p=${selectedPage}`;
  }, [selectedPage]);

  const onPublish = async () => {
    if (!workspaceHasSmartEdits) {
      // eslint-disable-next-line no-console
      console.error('No smart edits available');
      return;
    }
    await WPClient.publishDraft(previewResponse?.preview_page_id as number);

    // Instead of applying suggestions individually, use the batch operation
    if (selectedBatch) {
      try {
        // Format the suggestion contents as an array of objects with id and applied_content
        const suggestionContents = suggestions.map((suggestion) => ({
          id: suggestion.id,
          applied_content: suggestion.updatedFileContent ?? 'Unknown',
        }));

        await markSuggestionBatchApplied({
          variables: {
            suggestionBatchId: selectedBatch.id,
            suggestionContents: suggestionContents,
          },
        });

        // Reload the published iframe after publishing
        publishedIframeRef.current?.contentWindow?.location.reload();
      } catch (error) {
        logError(error as Error);
      }
    }
  };

  const onRevert = async () => {
    if (selectedBatch) {
      try {
        await WPClient.revertPublishDraft(Number(selectedPage));
        await markSuggestionBatchReverted({
          variables: {
            suggestionBatchId: selectedBatch.id,
          },
        });
        // Reload the published iframe after reverting
        publishedIframeRef.current?.contentWindow?.location.reload();
      } catch (error) {
        logError(error as Error);
        setError('Error reverting suggestion batch');
      }
    }
  };

  // Function to update draft title that also reloads preview
  const handleUpdateDraftTitle = async (newTitle: string) => {
    await updateDraftTitle(newTitle);
    previewIframeRef.current?.contentWindow?.location.reload();
  };

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <Box px={4}>
      <Box py={4}>
        <Button
          variant="ghost"
          size="sm"
          color="fuchsia.900"
          onClick={() => goToView(ViewName.DASHBOARD)}
        >
          ← Back to project
        </Button>
      </Box>

      <AiPreviewSummary
        createdAt={
          selectedBatch?.story?.createdAt ? new Date(selectedBatch.story.createdAt) : new Date()
        }
        description={selectedBatch?.story?.description || ''}
        reporterName={selectedBatch?.story?.reporter?.name || ''}
        captures={selectedBatch?.story?.captures?.nodes || []}
        isLoading={!previewResponse}
      />

      {/* Changes Summary moved above the preview */}
      <SmartEditContainer
        onTryAgain={() => {
          if (!workspaceHasSmartEdits) {
            // eslint-disable-next-line no-console
            console.error('No smart edits available');
            return;
          }
          setIsGeneratingSuggestion(true);
          const numberStoryId = Number(storyId);
          generateStoryAiSuggestion({
            variables: {
              storyId: numberStoryId,
            },
          }).catch(logError);
          clearPreviewResponse();
        }}
        isDisabled={!workspaceHasSmartEdits}
        onPublish={() => onPublish().catch((err) => logError(err))}
        onRevertPublish={onRevert}
        isPublished={!!selectedBatch?.appliedAt}
        loadingPublish={markSuggestionBatchAppliedLoading || makSuggestionBatchRevertedLoading}
        loadingTryAgain={isGeneratingSuggestion}
      >
        <SmartEditSubContainer
          heading={
            <Flex gap={2} align="center" px={3} py={2}>
              Review suggested changes
              {changes.length > 0 && (
                <Badge
                  background="fuchsia.900"
                  color="white"
                  fontSize="10px"
                  rounded="full"
                  px={2}
                  py={0.5}
                >
                  {changes?.length}
                </Badge>
              )}
            </Flex>
          }
          isExpandable
        >
          <AiSuggestionChangesSummary
            storyId={Number(storyId)}
            setSelectedSuggestion={(id) => setSelectedSuggestionId(id)}
            isLoading={!previewResponse}
            changes={changes}
            overallSummary={selectedBatch?.changeSummary ?? ''}
          />
        </SmartEditSubContainer>

        <PreviewContainer
          selectedChange={selectedChange}
          title={draftTitle || ''}
          updateDraftTitle={handleUpdateDraftTitle}
          originalUrl={originalUrl ? addDeactivateSnippetParam(originalUrl) : originalUrl}
          previewUrl={previewUrl ? addDeactivateSnippetParam(previewUrl) : null}
          previewIframeRef={previewIframeRef}
          publishedIframeRef={publishedIframeRef}
          // selectedChangeName={
          //   selectedChange
          //     ? getUpdateFileName(
          //         selectedChange.fileName,
          //         selectedSuggestion?.fileType as UpdateRequiredType,
          //         selectedSuggestion?.fileIdentifier ?? undefined,
          //       )
          //     : undefined
          // }
          editorContent={
            selectedChange && (
              <EditWithPreview
                storyId={Number(storyId)}
                url={previewUrl ? addDeactivateSnippetParam(previewUrl) : ''}
                pageId={previewResponse?.preview_page_id as number}
                selectedChange={selectedChange} // Pass the selectedChange directly
              />
            )
          }
        />
      </SmartEditContainer>
    </Box>
  );
};
