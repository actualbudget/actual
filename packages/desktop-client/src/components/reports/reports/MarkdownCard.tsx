import React, { useState } from 'react';
import { TextArea } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { type MarkdownWidget } from 'loot-core/src/types/models';

import { View } from '../../common/View';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';

type MarkdownCardProps = {
  isEditing?: boolean;
  meta?: MarkdownWidget['meta'];
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

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isVisibleTextArea, setIsVisibleTextArea] = useState(false);

  return (
    <ReportCard
      isEditing={isEditing}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
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
          case 'rename':
            setNameMenuOpen(true);
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
      <View style={{ flex: 1, paddingTop: 20, paddingLeft: 20 }}>
        <ReportCardName
          name={meta.name}
          isEditing={nameMenuOpen}
          onChange={newName => {
            onMetaChange({
              ...meta,
              name: newName,
            });
            setNameMenuOpen(false);
          }}
          onClose={() => setNameMenuOpen(false)}
        />

        <View style={{ overflowY: 'auto', height: '100%' }}>
          {isVisibleTextArea ? (
            <TextArea
              style={{
                height: '100%',
                border: 0,
                marginTop: 11,
                marginLeft: -2,
                marginRight: -2,
              }}
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
            <ReactMarkdown linkTarget="_blank">{meta.content}</ReactMarkdown>
          )}
        </View>
      </View>
    </ReportCard>
  );
}
