import React from 'react';

import { type TagEntity } from 'loot-core/types/models';

import { PeopleRow } from './PeopleRow';

import { Table, useTableNavigator } from '@desktop-client/components/table';

type PeopleListProps = {
  people: TagEntity[];
  selectedItems: Set<string>;
  hoveredPerson?: string;
  onHover: (id?: string) => void;
};

export function PeopleList({
  people,
  selectedItems,
  hoveredPerson,
  onHover,
}: PeopleListProps) {
  const tableNavigator = useTableNavigator(people, [
    'select',
    'color',
    'description',
  ]);

  return (
    <Table
      navigator={tableNavigator}
      items={people}
      backgroundColor="none"
      renderItem={({ item: person, focusedField, onEdit }) => {
        const hovered = hoveredPerson === person.id;
        const selected = selectedItems.has(person.id);

        return (
          <PeopleRow
            key={person.id}
            person={person}
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
