import React, { useState } from 'react';
import { TextArea } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { css } from '@emotion/css';

import { type MarkdownWidget } from 'loot-core/src/types/models';

import { styles, theme } from '../../../style';
import { Menu } from '../../common/Menu';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { NON_DRAGGABLE_AREA_CLASS_NAME } from '../constants';
import { ReportCard } from '../ReportCard';

const markdownStyles = css({
  paddingRight: 20,
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
          <Text {...markdownStyles}>
            <ReactMarkdown linkTarget="_blank">{meta.content}</ReactMarkdown>
          </Text>
        )}
      </View>
    </ReportCard>
  );
}
