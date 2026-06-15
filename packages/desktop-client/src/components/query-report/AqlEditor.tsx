import { useMemo } from 'react';

import { View } from '@actual-app/components/view';
import { EditorView } from '@codemirror/view';
import CodeMirror, { EditorState } from '@uiw/react-codemirror';
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror';

import { aqlLanguageExtension } from './codeMirror-aqlLanguage';

import { autocompleteTabAcceptHighest } from '@desktop-client/components/codemirror/autocompleteTabAccept';
import { useTheme } from '@desktop-client/style/theme';

type AqlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  disabled?: boolean;
  singleLine?: boolean;
  showLineNumbers?: boolean;
  error?: string | null;
};

export function AqlEditor({
  value,
  onChange,
  height = '100%',
  disabled = false,
  singleLine = false,
  showLineNumbers = true,
  error = null,
}: AqlEditorProps) {
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
      ...aqlLanguageExtension(isDarkTheme),
      EditorView.lineWrapping,
      EditorView.editable.of(!disabled),
      autocompleteTabAcceptHighest,
    ],
    [isDarkTheme, disabled, singleLine],
  );

  const codeMirrorTheme: ReactCodeMirrorProps['theme'] = isDarkTheme
    ? 'dark'
    : 'light';

  return (
    <View style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
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
      </View>
      {error && (
        <View
          style={{
            padding: '8px 12px',
            backgroundColor: isDarkTheme ? '#3d1f1f' : '#fff3f3',
            borderTop: `1px solid ${isDarkTheme ? '#5c2828' : '#ffcdd2'}`,
            color: isDarkTheme ? '#ff8a8a' : '#c62828',
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          {error}
        </View>
      )}
    </View>
  );
}
