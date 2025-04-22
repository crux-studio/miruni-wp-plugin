import { useCallback, useRef, FC } from 'react';

import { Box, Grid, Divider } from '@chakra-ui/react';

import { PreviewIframe } from '#/admin/components/shared/preview-iframe';
import { WPClient } from '#/admin/services/wp-client';
import { Change, UpdateRequiredType } from '#/admin/types/suggestion';

import { ContentEditor } from './modes/content-editor';
import { ThemeModEditor } from './modes/theme-mod-editor';
import { MonacoEditor } from './monaco-editor';
import { useUpdateSuggestion } from './use-update-suggestion';

export type EditorMode = 'content' | 'code' | 'simple';

// Keep the EditorTab type for backward compatibility
export interface EditorTab {
  id: string;
  title: string;
  language: string;
  value: string;
}

interface EditWithPreviewProps {
  url: string;
  pageId: number;
  onUpdated?: () => Promise<void>;
  storyId?: number;
  initialTitle?: string;
  onChange?: (value: string | undefined, tabId: string) => void;
  onTitleChange?: (title: string) => void;
  selectedChange: Change; // Accept selectedChange directly
}

const changeToTab = (change: Change): EditorTab => {
  return {
    id: change.fileIdentifier || '',
    title: change.fileName,
    language: 'html',
    value: change.newContent || '',
  };
};

export const EditWithPreview: FC<EditWithPreviewProps> = ({
  url,
  pageId,
  onUpdated,
  storyId,
  onChange,
  selectedChange, // New prop for direct change
}) => {
  // const [editorValue, setEditorValue] = useState<string>(selectedChange.newContent || '');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { updateSuggestions } = useUpdateSuggestion(storyId);

  // Get the current tab and determine its editor mode
  const currentTab = changeToTab(selectedChange);

  const refreshPreview = () => {
    iframeRef.current?.contentWindow?.location.reload();
  };

  // Unified save function to handle all save operations
  const saveSuggestion = useCallback(
    async (suggestionId: number, content: string) => {
      if (!pageId) return;

      const updatedSuggestions = updateSuggestions([
        {
          suggestionId,
          newFileContents: content,
        },
      ]);

      // Apply all updates
      const promises = updatedSuggestions.map((suggestion) =>
        WPClient.userUpdateToChange(pageId, suggestion),
      );

      await Promise.all(promises);
      await onUpdated?.();
      refreshPreview();
    },
    [pageId, updateSuggestions, onUpdated],
  );

  const handleEditorChange = (value: string | undefined, tabId: string) => {
    onChange?.(value, tabId);
  };

  // Render the appropriate editor based on the active mode
  const renderEditorContent = () => {
    switch (selectedChange.fileType) {
      case UpdateRequiredType.POST_CONTENT:
      case UpdateRequiredType.OTHER_POST_CONTENT:
      case UpdateRequiredType.POST_TITLE:
      case UpdateRequiredType.OTHER_POST_TITLE:
        return (
          <ContentEditor
            change={selectedChange}
            onChange={(val) => handleEditorChange(val, currentTab.id)}
            updateSuggestion={saveSuggestion}
            onUpdated={refreshPreview}
          />
        );
      // case 'code':
      //   return (
      //     <CodeEditor
      //       change={selectedChange}
      //       onChange={(val) => handleEditorChange(val, currentTab.id)}
      //     />
      //   );
      case UpdateRequiredType.THEME_MOD:
        return <ThemeModEditor change={selectedChange} updateSuggestion={saveSuggestion} />;
      default:
        return (
          <MonacoEditor
            currentTab={currentTab}
            onChange={(val) => handleEditorChange(val, currentTab.id)}
          />
        );
    }
  };

  return (
    <Box width="full" height="full">
      <Grid templateColumns="50% 2px 50%" height="100%" gap={0}>
        <Box height="100%" display="flex" flexDirection="column">
          <PreviewIframe url={url} title="Preview Version" ref={iframeRef} />
        </Box>
        <Divider orientation="vertical" borderWidth="2px" borderColor="gray.200" />
        <Box height="100%" display="flex" flexDirection="column">
          <Box flex="1">{renderEditorContent()}</Box>
        </Box>
      </Grid>
    </Box>
  );
};
