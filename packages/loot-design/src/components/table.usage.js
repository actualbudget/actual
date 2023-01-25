import React, { useState } from 'react';

import { Section, Component } from '../guide/components';

import { View, Text } from './common';
import {
  TableWithNavigator as Table,
  Row,
  Cell,
  InputCell,
  useTableNavigator
} from './table';

let uuid = require('loot-core/src/platform/uuid');

function PersonRow({ person, editing, focusedField, onEdit, onUpdate }) {
  let { id } = person;
  return (
    <Row style={{ width: 500 }} borderColor="#f0f0f0" collapsed={true}>
      <InputCell
        width="flex"
        value={person.name}
        exposed={focusedField === 'name'}
        onUpdate={value => onUpdate(id, 'name', value)}
        onExpose={() => onEdit(id, 'name')}
      />
      {person.poop ? (
        <InputCell
          width="100"
          value={person.poop}
          exposed={focusedField === 'poop'}
          onUpdate={value => onUpdate(id, 'poop', value)}
          onExpose={() => onEdit(id, 'poop')}
        />
      ) : (
        <Cell width="100" />
      )}
      <InputCell
        width="100"
        value={person.age}
        exposed={focusedField === 'age'}
        onUpdate={value => onUpdate(id, 'age', value)}
        onExpose={() => onEdit(id, 'age')}
      />
      <InputCell
        width="100"
        value={person.height}
        exposed={focusedField === 'height'}
        onUpdate={value => onUpdate(id, 'height', value)}
        onExpose={() => onEdit(id, 'height')}
      />
    </Row>
  );
}

let people = [
  { id: 1, name: 'James', age: 34, height: 6 },
  { id: 2, name: 'Sarah', poop: 1, age: 33, height: 5.6 },
  { id: 3, name: 'Evy', age: 4, height: 3 },
  { id: 4, name: 'Georgia', poop: 2, age: 3, height: 2.5 },
  { id: 5, name: 'Charlotte', age: 0, height: 1.2 }
];

let getFields = item =>
  item.poop ? ['name', 'poop', 'age', 'height'] : ['name', 'age', 'height'];

export default () => (
  <Section>
    Input Cell Example
    <Component>
      {() => {
        let [value, setValue] = useState('hello');
        let [exposed, setExposed] = useState(false);

        return (
          <View style={{ backgroundColor: 'white', width: 200 }}>
            <InputCell
              value={value}
              exposed={exposed}
              onUpdate={value => setValue(value)}
              onExpose={() => setExposed(true)}
              onBlur={() => setExposed(false)}
              style={{ height: 30 }}
            />
            <Text style={{ padding: 10 }}>{value}</Text>
          </View>
        );
      }}
    </Component>
    Multiple Cells
    <Component>
      {() => {
        let [items, setItems] = useState(() => {
          return [...people];
        });
        let { onEdit, editingId, focusedField, getNavigatorProps } =
          useTableNavigator(items, getFields);

        function onUpdate(id, name, value) {
          let idx = items.findIndex(item => item.id === id);
          items[idx] = { ...items[idx], [name]: value };
          setItems(items);
        }

        return (
          <View
            style={{ backgroundColor: 'white', width: 500 }}
            {...getNavigatorProps()}
          >
            {items.map(item => {
              let editing = editingId === item.id;
              return (
                <PersonRow
                  person={item}
                  editing={editing}
                  focusedField={editing && focusedField}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                />
              );
            })}
          </View>
        );
      }}
    </Component>
    Using Table
    <Component>
      {() => {
        let [items, setItems] = useState(() => {
          let lots = [];
          for (let i = 0; i < 100; i++) {
            lots = lots.concat(
              people.map(person => ({ ...person, id: uuid.v4Sync() }))
            );
          }
          return lots;
        });

        function onUpdate(id, name, value) {
          let idx = items.findIndex(item => item.id === id);
          items[idx] = { ...items[idx], [name]: value };
          setItems(items);
        }

        return (
          <Table
            items={items}
            fields={getFields}
            style={{ width: 500, height: 200 }}
            renderItem={({ props, item, editing, focusedField, onEdit }) => (
              <PersonRow
                person={item}
                editing={editing}
                focusedField={focusedField}
                onEdit={onEdit}
                onUpdate={onUpdate}
              />
            )}
          />
        );
      }}
    </Component>
  </Section>
);
