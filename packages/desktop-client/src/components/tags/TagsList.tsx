import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';

import { type Tag } from 'loot-core/types/models';

import { TagRow } from './TagRow';

const defaultTagFallback: Tag = {
  id: '',
  tag: '*',
  color: theme.noteTagDefault,
  description: t('Default tag color'),
};

type TagsListProps = {
  tags: Tag[];
  selectedItems: Set<string>;
  hoveredTag?: string;
  onHover?: (id: string | null) => void;
};

export function TagsList({
  tags,
  selectedItems,
  hoveredTag,
  onHover,
}: TagsListProps) {
  const defaultTag = {
    ...defaultTagFallback,
    ...tags.find(tag => tag.tag === '*'),
  };

  return (
    <View>
      <TagRow
        key={defaultTag.id}
        tag={defaultTag}
        hovered={hoveredTag === defaultTag.id}
        selected={selectedItems.has(defaultTag.id)}
        onHover={onHover}
      />
      {tags
        .filter(tag => tag.tag !== '*')
        .map(tag => {
          const hovered = hoveredTag === tag.id;
          const selected = selectedItems.has(tag.id);

          return (
            <TagRow
              key={tag.id}
              tag={tag}
              hovered={hovered}
              selected={selected}
              onHover={onHover}
            />
          );
        })}
    </View>
  );
}
