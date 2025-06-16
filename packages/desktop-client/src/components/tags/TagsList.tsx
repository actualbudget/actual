import React from 'react';

import { View } from '@actual-app/components/view';

import { type Tag } from 'loot-core/types/models';

import { TagRow } from './TagRow';

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
  return (
    <View>
      {tags.map(tag => {
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
