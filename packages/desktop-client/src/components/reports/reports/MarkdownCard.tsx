import React, { useRef, useState } from 'react';
import { TextArea } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { Menu } from '@actual-app/components/menu';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { MarkdownWidget } from '@actual-app/core/types/models';
import { css } from '@emotion/css';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import { useContextMenuAction } from '#components/ContextMenu';
import { NON_DRAGGABLE_AREA_CLASS_NAME } from '#components/reports/constants';
import { ReportCard } from '#components/reports/ReportCard';
import {
  markdownBaseStyles,
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '#util/markdown';

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];

const markdownStyles = css(markdownBaseStyles, {
  paddingRight: 20,
  '& table': {
    display: 'inline-table',
    ':not(:last-child)': {
      marginBottom: '0.75rem',
    },
  },
});

type MarkdownCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta: MarkdownWidget['meta'];
  onMetaChange: (newMeta: MarkdownWidget['meta']) => void;
};

export function MarkdownCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
}: MarkdownCardProps) {
  const { t } = useTranslation();

  const [isVisibleTextArea, setIsVisibleTextArea] = useState(false);

  const contextMenuTriggerRef = useRef(null);

  useContextMenuAction(
    contextMenuTriggerRef,
    {
      type: Menu.label,
      name: t('Text position:'),
      text: '',
    },
    {
      name: 'text-left',
      text: t('Left'),
      onClick: () =>
        onMetaChange({
          ...meta,
          text_align: 'left',
        }),
    },
    {
      name: 'text-center',
      text: t('Center'),
      onClick: () =>
        onMetaChange({
          ...meta,
          text_align: 'center',
        }),
    },
    {
      name: 'text-right',
      text: t('Right'),
      onClick: () =>
        onMetaChange({
          ...meta,
          text_align: 'right',
        }),
    },
    Menu.line,
    {
      name: 'edit',
      text: t('Edit content'),
      onClick: () => setIsVisibleTextArea(true),
    },
  );

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={isVisibleTextArea}
      contextMenuTriggerRef={contextMenuTriggerRef}
      widgetId={widgetId}
    >
      <View
        style={{
          flex: 1,
          paddingTop: 5,
          paddingLeft: 20,
          overflowY: 'auto',
          height: '100%',
          textAlign: meta.text_align,
        }}
      >
        {isVisibleTextArea ? (
          <TextArea
            style={{
              height: '100%',
              border: 0,
              marginTop: 11,
              marginBottom: 11,
              marginRight: 20,
              color: theme.formInputText,
              backgroundColor: theme.tableBackground,
            }}
            className={NON_DRAGGABLE_AREA_CLASS_NAME}
            autoFocus
            defaultValue={meta.content}
            onBlur={event => {
              onMetaChange({
                ...meta,
                content: event.currentTarget.value,
              });
              setIsVisibleTextArea(false);
            }}
          />
        ) : (
          <Text className={markdownStyles}>
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              rehypePlugins={[
                [
                  rehypeExternalLinks,
                  { target: '_blank', rel: ['noopener', 'noreferrer'] },
                ],
              ]}
            >
              {meta.content}
            </ReactMarkdown>
          </Text>
        )}
      </View>
    </ReportCard>
  );
}
