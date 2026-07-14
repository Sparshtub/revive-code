import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Issue } from '../ReviewCard';

interface MonacoViewerProps {
  code: string;
  language: string;
  issues: Issue[];
  scrollToLineTrigger?: { line: number; timestamp: number } | null;
}

export default function MonacoViewer({ code, language, issues, scrollToLineTrigger }: MonacoViewerProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyDecorations();
  };

  const applyDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Clear old decorations
    if (decorationsRef.current.length > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }

    const newDecorations = issues
      .filter((issue) => issue.line !== undefined)
      .map((issue) => {
        let className = 'bg-success/5 border-l-2 border-success';
        const sev = issue.severity.toLowerCase();
        if (sev === 'critical') {
          className = 'bg-error/15 border-l-2 border-error';
        } else if (sev === 'high') {
          className = 'bg-accent-amber/15 border-l-2 border-accent-amber';
        } else if (sev === 'medium') {
          className = 'bg-warning/10 border-l-2 border-warning';
        } else if (issue.is_ai) {
          className = 'bg-purple-500/10 border-l-2 border-purple-500';
        }

        return {
          range: new monaco.Range(issue.line, 1, issue.line, 1),
          options: {
            isWholeLine: true,
            className: className,
            hoverMessage: { value: `**[${issue.severity}] ${issue.title}**: ${issue.description}` }
          }
        };
      });

    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  };

  useEffect(() => {
    applyDecorations();
  }, [issues, code]);

  useEffect(() => {
    if (scrollToLineTrigger && editorRef.current) {
      const editor = editorRef.current;
      editor.revealLineInCenter(scrollToLineTrigger.line);
      editor.setPosition({ lineNumber: scrollToLineTrigger.line, column: 1 });
      editor.focus();
    }
  }, [scrollToLineTrigger]);

  return (
    <div className="w-full h-full bg-surface-dark border border-hairline/15 rounded-lg overflow-hidden flex flex-col">
      <div className="bg-surface-dark-elevated px-4 py-2 border-b border-hairline/10 flex items-center justify-between text-xs font-mono text-on-dark-soft">
        <span>Source Code Viewer</span>
        <span>{language.toUpperCase()}</span>
      </div>
      <div className="flex-1 h-[450px]">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'var(--font-mono), monospace',
            lineHeight: 20,
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
            },
            roundedSelection: true,
            automaticLayout: true,
            contextmenu: false,
          }}
        />
      </div>
    </div>
  );
}
