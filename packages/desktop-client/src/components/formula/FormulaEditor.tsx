import { useMemo } from 'react';

import { EditorView } from '@codemirror/view';
import CodeMirror, {
  EditorState,
  type ReactCodeMirrorProps,
} from '@uiw/react-codemirror';

import { excelFormulaExtension } from './codeMirror-excelLanguage';

import { useTheme } from '@desktop-client/style/theme';

type FormulaMode = 'transaction' | 'query';

type FormulaEditorProps = {
  value: string;
  onChange: (value: string) => void;
  mode: FormulaMode;
  height?: string;
  disabled?: boolean;
  queries?: Record<string, unknown>;
  variables?: Record<string, number | string>;
  singleLine?: boolean;
  showLineNumbers?: boolean;
};

export function FormulaEditor({
  value,
  onChange,
  mode,
  height = '100%',
  disabled = false,
  queries,
  variables,
  singleLine = false,
  showLineNumbers = true,
}: FormulaEditorProps) {
  const [activeTheme] = useTheme();

  const isDarkTheme = useMemo(() => {
    if (activeTheme === 'dark' || activeTheme === 'midnight') {
      return true;
    }
    if (activeTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [activeTheme]);

  const extensions = useMemo(
    () => [
      ...(singleLine
        ? [
            EditorState.transactionFilter.of(tr =>
              tr.newDoc.lines > 1
                ? [
                    tr,
                    {
                      changes: {
                        from: 0,
                        to: tr.newDoc.length,
                        insert: tr.newDoc.sliceString(0, undefined, ' '),
                      },
                      sequential: true,
                    },
                  ]
                : [tr],
            ),
          ]
        : []),
      ...excelFormulaExtension(mode, queries, isDarkTheme, variables),
      EditorView.lineWrapping,
      EditorView.editable.of(!disabled),
    ],
    [mode, queries, isDarkTheme, disabled, singleLine, variables],
  );

  const codeMirrorTheme: ReactCodeMirrorProps['theme'] = isDarkTheme
    ? 'dark'
    : 'light';

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={codeMirrorTheme}
      extensions={extensions}
      onChange={onChange}
      editable={!disabled}
      basicSetup={{
        lineNumbers: showLineNumbers,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: false,
      }}
      style={{
        fontSize: '14px',
        border: 'none',
      }}
    />
  );
}
