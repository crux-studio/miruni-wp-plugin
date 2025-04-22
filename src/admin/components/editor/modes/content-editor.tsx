import { useCallback, useEffect, useState } from 'react';

import { Box, Input, useColorModeValue, keyframes, useBoolean } from '@chakra-ui/react';

import { TextOnlyIcon } from '@miruni/eds/src/icons';

import { MonacoEditor } from '#/admin/components/editor/monaco-editor';
import {
  AnimatedGradientBorder,
  useAnimatedGradientStyle,
} from '#/admin/components/ui/animated-gradient';
import { WPClient } from '#/admin/services/wp-client';
import { Change, UpdateRequiredType } from '#/admin/types/suggestion';
import { logError } from '#/admin/utils/logging';

import { ModeViewHeader } from './mode-view-header';

import type * as Monaco from 'monaco-editor';

interface ContentEditorProps {
  change: Change; // Accept selectedChange directly
  onChange?: (value: string | undefined) => void;
  updateSuggestion: (suggestionId: number, updatedContent: string) => Promise<void>;
  onUpdated: () => void;
}

const TITLE_UPDATES: UpdateRequiredType[] = [
  UpdateRequiredType.OTHER_POST_TITLE,
  UpdateRequiredType.POST_TITLE,
];
const CONTENT_UPDATES: UpdateRequiredType[] = [
  UpdateRequiredType.OTHER_POST_CONTENT,
  UpdateRequiredType.POST_CONTENT,
];

export const ContentEditor = ({
  change,
  onChange,
  updateSuggestion,
  onUpdated,
}: ContentEditorProps) => {
  // Use color mode values for better theming
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.100');
  const editorBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('fuchsia.900', 'fuchsia.300');

  const [isModified, setIsModified] = useBoolean();
  const getTitle = () =>
    change.fileType && TITLE_UPDATES.includes(change.fileType)
      ? change.newContent
      : change.post?.postTitle || '';

  const [title, setTitle] = useState(getTitle());
  const [editorValue, setEditorValue] = useState(change.newContent || '');

  const onEditorChange = (value: string | undefined) => {
    setIsModified.on();
    setEditorValue(value || '');
    onChange?.(value);
  };

  // Helper functions to determine if content is AI-suggested
  const isTitleAiSuggested = () =>
    (change.fileType && TITLE_UPDATES.includes(change.fileType)) ?? false;
  const isContentAiSuggested = () =>
    (change.fileType && CONTENT_UPDATES.includes(change.fileType)) ?? false;
  const isAnyAiSuggested = () => isTitleAiSuggested() || isContentAiSuggested();

  // Animation for the box shadow
  const glowAnimation = keyframes`
    0% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.6), 0 0 10px rgba(167, 139, 250, 0.4); }
    50% { box-shadow: 0 0 10px rgba(236, 72, 153, 0.8), 0 0 20px rgba(167, 139, 250, 0.6); }
    100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.6), 0 0 10px rgba(167, 139, 250, 0.4); }
  `;

  // Generate editor style based on editor mode
  const getEditorStyle = () => {
    return {
      fontSize: 16,
      lineHeight: 24,
      padding: { top: 16, bottom: 16 },
      lineDecorationsWidth: 12, // Reduced from 24 to 12 for less padding
      lineNumbers: 'off',
      glyphMargin: false, // Disable glyph margin as it's too large
      renderLineHighlight: 'none',
      fontFamily: 'inherit',
    } as Partial<Monaco.editor.IEditorOptions>;
  };

  // Handle title changes consistently
  const handleTitleChange = useCallback(
    async (title: string) => {
      if (!change.fileType) throw new Error('Change must have a fileType');
      // For changes that updates to AI suggestions, use the onSave to update the suggestion
      if (TITLE_UPDATES.includes(change.fileType)) {
        return updateSuggestion(change.suggestionId || 0, title).catch(logError);
      }
      if (change.draftId === change.post?.postId) {
        await WPClient.updateDraftTitle(change.post?.postId || 0, title);
      } else {
        await WPClient.storeOtherPostChange(change.draftId, 'post_title', title, {
          postId: change.post?.postId || 0,
        }).catch(logError);
      }
    },
    [change, updateSuggestion, onUpdated],
  );

  const handleSave = useCallback(
    async ({
      title,
      editorValue,
      handleTitleChange,
      handleContentChange,
      onChange,
      change,
    }: {
      title?: string;
      editorValue: string;
      handleTitleChange: (title: string) => Promise<void>;
      handleContentChange: (content: string) => Promise<void>;
      onChange?: (content: string) => void;
      change: Change;
    }) => {
      await handleContentChange(editorValue).catch(logError);

      title && (await handleTitleChange(title).catch(logError));

      onChange?.(change.newContent ?? '');
      onUpdated();
    },
    [],
  );
  const handleContentChange = useCallback(
    async (content: string) => {
      if (change.fileType && CONTENT_UPDATES.includes(change.fileType)) {
        return updateSuggestion(change.suggestionId || 0, content).catch(logError);
      }
      if (change.draftId === change.post?.postId) {
        await WPClient.updateDraftContent(change.post?.postId || 0, content).catch(logError);
      } else {
        await WPClient.storeOtherPostChange(change.draftId, 'post_content', content, {
          postId: change.post?.postId || 0,
        }).catch(logError);
      }
    },
    [change, updateSuggestion, onUpdated],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleSave({
          title,
          editorValue,
          handleTitleChange,
          handleContentChange,
          onChange,
          change,
        }).catch(logError);
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [title, editorValue, handleTitleChange, handleContentChange, onChange, change]);

  return (
    <AnimatedGradientBorder
      isActive={isAnyAiSuggested()}
      h="full"
      w="full"
      display="flex"
      flexDir="column"
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
      boxShadow="sm"
    >
      {/* Header section with content type indicator */}
      <ModeViewHeader
        label="Content Editor"
        saveDisabled={!isModified}
        textColor={textColor}
        icon={TextOnlyIcon}
        accentColor={accentColor}
        handleSave={() => {
          handleSave({
            title,
            editorValue,
            handleTitleChange,
            handleContentChange,
            onChange,
            change,
          }).catch(logError);
        }}
      />

      {/* Title input section with animated gradient matching the editor style */}
      <Box py={4} px={2} bg={bgColor} position="relative">
        <Box
          borderRadius="md"
          bg={bgColor}
          overflow="hidden"
          position="relative"
          transition="all 0.3s ease-in-out"
          sx={useAnimatedGradientStyle(isTitleAiSuggested(), '2px', '4s', true)}
          css={
            isTitleAiSuggested()
              ? {
                  animation: `${glowAnimation} 4s ease infinite`,
                }
              : {}
          }
          mb={2}
        >
          <Input
            placeholder="Post title"
            name="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => handleTitleChange(e.target.value)}
            variant="outline"
            fontSize="sm"
            fontWeight="medium"
            width="98%"
            _focus={{
              borderColor: 'fuchsia.900',
              boxShadow: 'none',
            }}
            borderColor={isTitleAiSuggested() ? 'transparent' : 'inherit'}
          />
        </Box>
      </Box>

      {/* Content editor area with enhanced animated gradient and glow when AI suggested */}
      <Box flex="1" bg={bgColor} position="relative" px={2} pt={2} pb={4}>
        <Box
          borderRadius="md"
          bg={editorBg}
          overflow="hidden"
          borderWidth="1px"
          borderColor={isContentAiSuggested() ? 'transparent' : 'gray.100'}
          position="relative"
          transition="all 0.3s ease-in-out"
          sx={useAnimatedGradientStyle(isContentAiSuggested() ?? false)}
          css={
            isContentAiSuggested()
              ? {
                  animation: `${glowAnimation} 4s ease infinite`,
                }
              : {}
          }
        >
          <MonacoEditor
            currentTab={{
              id: change.fileIdentifier || '',
              title: change.fileName || '',
              language: 'html',
              value: change.newContent || '',
            }}
            onChange={onEditorChange}
            height="calc(80vh - 150px)"
            className="content-editor-monaco"
            // Pass additional editor options to make it fit better with content editing
            options={{
              // Default Monaco options from the component
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              letterSpacing: 0.5,
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              renderWhitespace: 'none',
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
              folding: false,
              glyphMargin: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              fixedOverflowWidgets: true,

              // Content editing specific options
              ...getEditorStyle(),
              contextmenu: false,
              quickSuggestions: { strings: true, other: true },
              scrollbar: {
                vertical: 'visible',
                horizontalSliderSize: 8,
                verticalSliderSize: 8,
                horizontalScrollbarSize: 8,
                verticalScrollbarSize: 8,
              },
            }}
          />
        </Box>
      </Box>
    </AnimatedGradientBorder>
  );
};
