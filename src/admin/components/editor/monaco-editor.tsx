import { useRef, useEffect, useState } from 'react';

import { Box } from '@chakra-ui/react';
import Editor, { OnMount } from '@monaco-editor/react';

import type * as Monaco from 'monaco-editor';

import 'monaco-editor/min/vs/editor/editor.main.css';
// eslint-disable-next-line import/order

// Keep existing EditorTabContentMeta for backward compatibility
export interface EditorTabContentMeta {
  postId: number;
  postTitle: string;
  postContent: string;
}

// Keep existing EditorTab type for backward compatibility
export interface EditorTab {
  id: string;
  title: string;
  language: string;
  value: string;
}

export interface MonacoEditorProps {
  currentTab?: EditorTab;
  onChange?: (value: string | undefined) => void;
  className?: string;
  height?: string;
  options?: Partial<Monaco.editor.IEditorOptions>;
}

export const MonacoEditor = ({
  currentTab,
  onChange,
  className,
  height = '85vh',
  options,
}: MonacoEditorProps) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<typeof Monaco | null>(null);
  const [model, setModel] = useState<Monaco.editor.ITextModel | null>(null);

  // Determine which value to use - priority to selectedChange if available
  const editorValue = currentTab?.value || '';
  const editorLanguage = currentTab?.language || 'html'; // Default to html if not specified

  // Create or update model when tab/change or instance changes
  useEffect(() => {
    if (!monacoInstance || !mounted) return;

    // Clean up previous model
    model?.dispose();

    // Create new model with the determined value
    const newModel = monacoInstance.editor.createModel(editorValue, editorLanguage);
    setModel(newModel);

    // Set the current model to the editor
    if (editorRef.current && newModel) {
      editorRef.current.setModel(newModel);
    }

    return () => {
      newModel?.dispose();
    };
  }, [monacoInstance, mounted, editorValue, editorLanguage]);

  useEffect(() => {
    // Find the shadow root
    let element = containerRef.current as HTMLElement;
    let shadowRoot: ShadowRoot | null = null;

    while (element) {
      const root = element.getRootNode();
      if (root instanceof ShadowRoot) {
        shadowRoot = root;
        break;
      }
      element = element.parentElement as HTMLElement;
    }

    // Add required styles for Shadow DOM
    if (shadowRoot) {
      const style = document.createElement('style');
      style.textContent = `
        .monaco-editor {
          position: relative !important;
          z-index: 1;
        }
        .monaco-editor .overflow-guard {
          position: relative !important;
        }
        .monaco-editor-background {
          background-color: transparent !important;
        }
      `;
      shadowRoot?.appendChild(style);

      return () => {
        shadowRoot?.removeChild(style);
      };
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setMonacoInstance(monaco);
    setMounted(true);

    // Force layout update after mount
    setTimeout(() => {
      editor.layout();
      const editorDomNode = editor.getDomNode();
      if (editorDomNode) {
        editorDomNode.style.position = 'relative';
        editorDomNode.style.contain = 'strict';
        editorDomNode.style.transform = 'translateZ(0)';
      }
    }, 100);

    // Configure editor model
    const model = editor.getModel();
    if (model) {
      model.updateOptions({
        tabSize: 2,
        insertSpaces: true,
        trimAutoWhitespace: true,
      });
    }
  };

  // Use ResizeObserver instead of window events
  useEffect(() => {
    if (!containerRef.current || !editorRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <Box
      ref={containerRef}
      position="relative"
      h="full"
      w="full"
      display="flex"
      flexDir="column"
      isolation="isolate"
      style={{ contain: 'content' }}
      className={className}
    >
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" flex="1" overflow="hidden">
        <Editor
          height={height}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            fontSize: 14,
            lineHeight: 21,
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
            quickSuggestions: false,
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            ...(options || {}),
          }}
          onChange={(value) => onChange?.(value)}
          onMount={handleEditorDidMount}
          loading={
            <Box color="gray.500" p={4}>
              Loading editor...
            </Box>
          }
        />
      </Box>
    </Box>
  );
};
