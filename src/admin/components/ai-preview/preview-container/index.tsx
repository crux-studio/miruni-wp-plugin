import { ReactNode, useEffect, RefObject } from 'react';

import { Box, Text } from '@chakra-ui/react';

import { Preview } from '#/admin/components/ai-preview/preview';
import { OptimizedMonacoDiffEditor } from '#/admin/components/editor/diff';
import { Change, UpdateRequiredType } from '#/admin/types/suggestion';

import { PreviewContainerTabs } from './tabs';
import { TabConfig } from './types';

interface PreviewContainerProps {
  editorContent: ReactNode;
  title: string;
  updateDraftTitle: (newTitle: string) => Promise<void>;
  originalUrl: string | null;
  previewUrl: string | null;
  selectedChange?: Change;
  previewIframeRef: RefObject<HTMLIFrameElement>;
  publishedIframeRef: RefObject<HTMLIFrameElement>;
  // Optional custom tabs that can be passed to override defaults
  customTabs?: TabConfig[];
}

export const PreviewContainer = ({
  editorContent,
  title,
  updateDraftTitle,
  originalUrl,
  previewUrl,
  selectedChange,
  previewIframeRef,
  publishedIframeRef,
  customTabs,
}: PreviewContainerProps) => {
  useEffect(() => {
    previewIframeRef.current?.contentWindow?.location.reload();
    publishedIframeRef.current?.contentWindow?.location.reload();
  }, [previewUrl, previewIframeRef, publishedIframeRef]);

  // Determine the change type if it exists
  const changeType = selectedChange?.fileType;

  // Generate default tabs based on the change type
  const getDefaultTabs = (): TabConfig[] => {
    // Check if editor tab should be disabled
    const isEditorDisabled =
      changeType &&
      !([UpdateRequiredType.POST_CONTENT, UpdateRequiredType.BLOCK_TEMPLATE] as string[]).includes(
        changeType,
      );

    // Check if diff tab should be disabled
    const isDiffDisabled =
      changeType &&
      !(
        [
          UpdateRequiredType.OTHER_POST_CONTENT,
          UpdateRequiredType.POST_CONTENT,
          UpdateRequiredType.ELEMENTOR_JSON,
        ] as string[]
      ).includes(changeType);

    const defaultTabs: TabConfig[] = [
      {
        name: 'Page Preview',
        content: (
          <Preview
            originalUrl={originalUrl}
            previewUrl={previewUrl}
            previewIframeRef={previewIframeRef}
            originalIframeRef={publishedIframeRef}
          />
        ),
      },
      {
        name: 'Editor',
        padding: 4,
        disabled: isEditorDisabled,
        disabledTooltip:
          'The editor is only available when changes are made in a WordPress page or post',
        content: (
          <>
            <Box py={2}>
              <Text fontSize="md">
                Edit page or post content and see a live preview of your changes
              </Text>
            </Box>
            {editorContent}
          </>
        ),
      },
      {
        name: 'Code Changes',
        padding: 4,
        disabled: isDiffDisabled,
        disabledTooltip: 'Diff view is only available for content, post, and Elementor changes',
        content: (
          <>
            <Box py={2}>
              <Text fontSize="md">
                See the code changes between the current published version and after the Smart Edit
                suggestions
              </Text>
            </Box>
            <OptimizedMonacoDiffEditor
              original={selectedChange?.originalContent || ''}
              modified={selectedChange?.newContent || ''}
              fileType={selectedChange?.fileType}
            />
          </>
        ),
      },
    ];

    return defaultTabs;
  };

  // Use custom tabs if provided, otherwise generate default tabs
  const tabs = customTabs || getDefaultTabs();

  if (!previewUrl || !selectedChange) {
    return null;
  }

  return <PreviewContainerTabs tabs={tabs} title={title} onUpdateTitle={updateDraftTitle} />;
};

// Export the getDefaultTabs function for use in the parent component
export const getPreviewTabs = (
  selectedChange: Change,
  originalUrl: string | null,
  previewUrl: string | null,
  previewIframeRef: RefObject<HTMLIFrameElement>,
  publishedIframeRef: RefObject<HTMLIFrameElement>,
  editorContent: ReactNode,
): TabConfig[] => {
  const changeType = selectedChange?.fileType;

  // Check if editor tab should be disabled
  const isEditorDisabled =
    changeType &&
    !(
      [
        UpdateRequiredType.POST_CONTENT,
        UpdateRequiredType.POST_TITLE,
        UpdateRequiredType.OTHER_POST_TITLE,
        UpdateRequiredType.OTHER_POST_CONTENT,
        UpdateRequiredType.THEME_MOD,
      ] as string[]
    ).includes(changeType);

  // Check if diff tab should be disabled
  const isDiffDisabled =
    changeType &&
    !(
      [
        UpdateRequiredType.OTHER_POST_CONTENT,
        UpdateRequiredType.POST_CONTENT,
        UpdateRequiredType.ELEMENTOR_JSON,
      ] as string[]
    ).includes(changeType);

  const tabs: TabConfig[] = [
    {
      name: 'Visual',
      content: (
        <Preview
          originalUrl={originalUrl}
          previewUrl={previewUrl}
          previewIframeRef={previewIframeRef}
          originalIframeRef={publishedIframeRef}
        />
      ),
    },
    {
      name: 'Editor',
      padding: 4,
      disabled: isEditorDisabled,
      disabledTooltip:
        'The editor is only available when changes are made in a WordPress page or post',
      content: <Box p={4}>{editorContent}</Box>,
    },
    {
      name: 'Diff',
      padding: 4,
      disabled: isDiffDisabled,
      disabledTooltip: 'Diff view is only available for content, post, and Elementor changes',
      content: (
        <Box p={4}>
          <OptimizedMonacoDiffEditor
            original={selectedChange?.originalContent || ''}
            modified={selectedChange?.newContent || ''}
            fileType={selectedChange?.fileType}
          />
        </Box>
      ),
    },
  ];

  return tabs;
};
