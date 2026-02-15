import React, { useState } from 'react';
import { TextArea } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { Menu } from '@actual-app/components/menu';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import type { MarkdownWidget } from 'loot-core/types/models';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from '@desktop-client/components/reports/constants';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { useDashboardWidgetCopyMenu } from '@desktop-client/components/reports/useDashboardWidgetCopyMenu';
import {
  markdownBaseStyles,
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '@desktop-client/util/markdown';

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
  isEditing?: boolean;
  meta: MarkdownWidget['meta'];
  onMetaChange: (newMeta: MarkdownWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function MarkdownCard({
  isEditing,
  meta,
  onMetaChange,
  onRemove,
  onCopy,
}: MarkdownCardProps) {
  const { t } = useTranslation();

  const [isVisibleTextArea, setIsVisibleTextArea] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={isVisibleTextArea}
      menuItems={[
        {
          type: Menu.label,
          name: t('Text position:'),
          text: '',
        },
        {
          name: 'text-left',
          text: t('Left'),
        },
        {
          name: 'text-center',
          text: t('Center'),
        },
        {
          name: 'text-right',
          text: t('Right'),
        },
        Menu.line,
        {
          name: 'edit',
          text: t('Edit content'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'text-left':
            onMetaChange({
              ...meta,
              text_align: 'left',
            });
            break;
          case 'text-center':
            onMetaChange({
              ...meta,
              text_align: 'center',
            });
            break;
          case 'text-right':
            onMetaChange({
              ...meta,
              text_align: 'right',
            });
            break;
          case 'edit':
            setIsVisibleTextArea(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
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
