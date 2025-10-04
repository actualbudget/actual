import React, { useState } from 'react';
import { TextArea } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import { type MarkdownWidget } from 'loot-core/types/models';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from '@desktop-client/components/reports/constants';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import {
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '@desktop-client/util/markdown';

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];

const markdownStyles = css({
  paddingRight: 20,
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
    textAlign: 'left',
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
    display: 'inline-table',
    ':not(:last-child)': {
      marginBottom: '0.75rem',
    },
  },
  '& td': {
    padding: '0.25rem 0.75rem',
  },
  '& h3': styles.mediumText,
});

type MarkdownCardProps = {
  isEditing?: boolean;
  meta: MarkdownWidget['meta'];
  onMetaChange: (newMeta: MarkdownWidget['meta']) => void;
  onRemove: () => void;
};

export function MarkdownCard({
  isEditing,
  meta,
  onMetaChange,
  onRemove,
}: MarkdownCardProps) {
  const { t } = useTranslation();

  const [isVisibleTextArea, setIsVisibleTextArea] = useState(false);

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
      ]}
      onMenuSelect={item => {
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
