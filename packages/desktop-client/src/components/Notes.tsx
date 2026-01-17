// @ts-strict-ignore
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import {
  markdownBaseStyles,
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '@desktop-client/util/markdown';

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];

const markdownStyles = css(markdownBaseStyles, {
  display: 'block',
  maxWidth: 350,
  padding: 8,
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
  const { t } = useTranslation();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focused && editable) {
      textAreaRef.current.focus();
    }
  }, [focused, editable]);

  return editable ? (
    <textarea
      ref={textAreaRef}
      className={css({
        border: '1px solid ' + theme.buttonNormalBorder,
        padding: 7,
        ...(!isNarrowWidth && { minWidth: 350, minHeight: 120 }),
        outline: 'none',
        backgroundColor: theme.tableBackground,
        color: theme.tableText,
        ...getStyle?.(editable),
      })}
      value={notes || ''}
      onChange={e => onChange?.(e.target.value)}
      onBlur={e => onBlur?.(e.target.value)}
      placeholder={t('Notes (markdown supported)')}
    />
  ) : (
    <Text className={css([markdownStyles, getStyle?.(editable)])}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[
          [
            rehypeExternalLinks,
            { target: '_blank', rel: ['noopener', 'noreferrer'] },
          ],
        ]}
      >
        {notes}
      </ReactMarkdown>
    </Text>
  );
}
