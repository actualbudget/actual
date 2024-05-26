// @ts-strict-ignore
import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import { css } from 'glamor';
import remarkGfm from 'remark-gfm';

import { useResponsive } from '../ResponsiveProvider';
import { type CSSProperties, theme } from '../style';
import { remarkBreaks, sequentialNewlinesPlugin } from '../util/markdown';

import { Text } from './common/Text';

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];

const markdownStyles = css({
  display: 'block',
  maxWidth: 350,
  padding: 8,
  overflowWrap: 'break-word',
  '& p': {
    margin: 0,
    ':not(:first-child)': {
      marginTop: '0.25rem',
    },
  },
  '& ul, & ol': {
    listStylePosition: 'inside',
    margin: 0,
    paddingLeft: 0,
  },
  '&>* ul, &>* ol': {
    marginLeft: '1.5rem',
  },
  '& li>p': {
    display: 'contents',
  },
  '& blockquote': {
    paddingLeft: '0.75rem',
    borderLeft: '3px solid ' + theme.markdownDark,
    margin: 0,
  },
  '& hr': {
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '1px solid ' + theme.markdownNormal,
  },
  '& code': {
    backgroundColor: theme.markdownLight,
    padding: '0.1rem 0.5rem',
    borderRadius: '0.25rem',
  },
  '& pre': {
    padding: '0.5rem',
    backgroundColor: theme.markdownLight,
    borderRadius: '0.5rem',
    margin: 0,
    ':not(:first-child)': {
      marginTop: '0.25rem',
    },
    '& code': {
      background: 'inherit',
      padding: 0,
      borderRadius: 0,
    },
  },
  '& table, & th, & td': {
    border: '1px solid ' + theme.markdownNormal,
  },
  '& table': {
    borderCollapse: 'collapse',
    wordBreak: 'break-word',
  },
  '& td': {
    padding: '0.25rem 0.75rem',
  },
});

type NotesProps = {
  notes: string;
  editable?: boolean;
  focused?: boolean;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  getStyle?: (editable: boolean) => CSSProperties;
};

export function Notes({
  notes,
  editable,
  focused,
  onChange,
  onBlur,
  getStyle,
}: NotesProps) {
  const { isNarrowWidth } = useResponsive();

  const textAreaRef = useRef<HTMLTextAreaElement>();

  useEffect(() => {
    if (focused && editable) {
      textAreaRef.current.focus();
    }
  }, [focused, editable]);

  return editable ? (
    <textarea
      ref={textAreaRef}
      className={`${css({
        border: '1px solid ' + theme.buttonNormalBorder,
        padding: 7,
        ...(!isNarrowWidth && { minWidth: 350, minHeight: 120 }),
        outline: 'none',
        backgroundColor: theme.tableBackground,
        color: theme.tableText,
        ...getStyle?.(editable),
      })}`}
      value={notes || ''}
      onChange={e => onChange?.(e.target.value)}
      onBlur={e => onBlur?.(e.target.value)}
      placeholder="Notes (markdown supported)"
    />
  ) : (
    <Text {...markdownStyles} style={{ ...getStyle?.(editable) }}>
      <ReactMarkdown remarkPlugins={remarkPlugins} linkTarget="_blank">
        {notes}
      </ReactMarkdown>
    </Text>
  );
}
