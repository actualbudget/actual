import React from 'react';

import { theme } from '@actual-app/components/theme';
import type { TagEntity } from '@actual-app/core/types/models';

import { Table, useTableNavigator } from '#components/table';

import { TagRow } from './TagRow';

type TagsListProps = {
  tags: TagEntity[];
  selectedItems: Set<string>;
  hoveredTag?: string;
  onHover: (id?: string) => void;
};

export function TagsList({
  tags,
  selectedItems,
  hoveredTag,
  onHover,
}: TagsListProps) {
  const tableNavigator = useTableNavigator(tags, [
    'select',
    'color',
    'description',
  ]);

  return (
    <Table
      navigator={tableNavigator}
      items={tags}
      backgroundColor={theme.tableBackground}
      renderItem={({ item: tag, focusedField, onEdit }) => {
        const hovered = hoveredTag === tag.id;
        const selected = selectedItems.has(tag.id);

        return (
          <TagRow
            key={tag.id}
            tag={tag}
            hovered={hovered}
            selected={selected}
            onHover={onHover}
            focusedField={focusedField}
            onEdit={onEdit}
          />
        );
      }}
    />
  );
}
