import { useRef, useEffect, useState, useMemo } from 'react';

import { Switch, Flex, Text, useDisclosure, HStack } from '@chakra-ui/react';
import { DiffEditor, DiffOnMount } from '@monaco-editor/react';

import { UpdateRequiredType } from '#/admin/types/suggestion';

import type * as monaco from 'monaco-editor';
import 'monaco-editor/min/vs/editor/editor.main.css';

// Improved JSON formatter with better error handling
const formatJson = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // If not valid JSON, return as is without throwing an error to console
    return content;
  }
};

// Better language detection
const getLanguage = (fileType: UpdateRequiredType) => {
  switch (fileType) {
    case UpdateRequiredType.ELEMENTOR_JSON:
      return 'json';

    default:
      return 'html';
  }
};

// Configurable theming for better diff highlighting
const diffTheme = {
  added: '#e6ffed',
  removed: '#ffebe9',
  modified: '#fff5b1',
};

interface JsonDiffViewerProps {
  original?: string;
  modified?: string;
  fileType?: UpdateRequiredType;
  height?: string;
}

export const OptimizedMonacoDiffEditor = ({
  original = '',
  modified = '',
  fileType = UpdateRequiredType.ELEMENTOR_JSON,
  height = '90vh',
}: JsonDiffViewerProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { isOpen: isInline, onToggle } = useDisclosure();
  const originalModelRef = useRef<monaco.editor.ITextModel | null>(null);
  const modifiedModelRef = useRef<monaco.editor.ITextModel | null>(null);

  const language = useMemo(() => getLanguage(fileType), [fileType]);
  const isJsonLanguage = language === 'json';

  // Process and format content
  const processedOriginal = useMemo(
    () => (isJsonLanguage ? formatJson(original) : original),
    [original, isJsonLanguage],
  );

  const processedModified = useMemo(
    () => (isJsonLanguage ? formatJson(modified) : modified),
    [modified, isJsonLanguage],
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Proper cleanup
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }

      if (originalModelRef.current) {
        originalModelRef.current.dispose();
        originalModelRef.current = null;
      }
      if (modifiedModelRef.current) {
        modifiedModelRef.current.dispose();
        modifiedModelRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount: DiffOnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Create and set models with appropriate language
    if (!originalModelRef.current) {
      originalModelRef.current = monaco.editor.createModel(processedOriginal, language);
    }
    if (!modifiedModelRef.current) {
      modifiedModelRef.current = monaco.editor.createModel(processedModified, language);
    }

    editor.setModel({
      original: originalModelRef.current,
      modified: modifiedModelRef.current,
    });

    // Configure editor
    editor.updateOptions({
      readOnly: true,
    });

    // Setup better JSON diff highlighting
    if (isJsonLanguage) {
      monaco.editor.defineTheme('jsonDiffTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'diffEditor.insertedTextBackground': diffTheme.added + '80',
          'diffEditor.removedTextBackground': diffTheme.removed + '80',
          'diffEditor.modifiedLineBackground': diffTheme.modified + '40',
        },
      });
      monaco.editor.setTheme('jsonDiffTheme');
    }

    // Ensure proper layout
    requestAnimationFrame(() => {
      editor.layout();
    });
  };

  // Update models when content changes
  useEffect(() => {
    if (originalModelRef.current && modifiedModelRef.current) {
      originalModelRef.current.setValue(processedOriginal);
      modifiedModelRef.current.setValue(processedModified);
    }
  }, [processedOriginal, processedModified]);

  // Enhanced resize observer
  useEffect(() => {
    if (!containerRef.current || !editorRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (editorRef.current) {
        requestAnimationFrame(() => {
          editorRef.current?.layout();

          // Update individual editors
          const original = editorRef.current?.getOriginalEditor();
          const modified = editorRef.current?.getModifiedEditor();
          original?.layout();
          modified?.layout();
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{
        position: 'relative',
        isolation: 'isolate',
        contain: 'content',
        willChange: 'transform',
      }}
    >
      <Flex justify="space-between" p={2} alignItems="center" wrap="wrap" gap={2} mb={2}>
        <HStack spacing={4}>
          <Flex alignItems="center" gap={2}>
            <Text fontSize="sm">View inline</Text>
            <Switch colorScheme="blue" isChecked={isInline} onChange={onToggle} />
          </Flex>
        </HStack>

        <DiffEditor
          height={height}
          language={language}
          original={processedOriginal}
          modified={processedModified}
          options={{
            renderSideBySide: !isInline,
            enableSplitViewResizing: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            overviewRulerBorder: false,
            fontSize: 14,
            lineHeight: 21,
            letterSpacing: 0.5,
            smoothScrolling: true,
            renderWhitespace: 'selection',
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            automaticLayout: true,
            folding: true,
            foldingStrategy: isJsonLanguage ? 'indentation' : 'auto',
            foldingHighlight: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            fixedOverflowWidgets: true,
            renderOverviewRuler: true,
            quickSuggestions: false,
            matchBrackets: 'always',
            renderLineHighlight: 'all',
            colorDecorators: true,
          }}
          onMount={handleEditorDidMount}
          className="overflow-hidden rounded-md border border-gray-200"
          loading={
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading editor...
            </div>
          }
        />
      </Flex>
    </div>
  );
};
