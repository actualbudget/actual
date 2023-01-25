import React from 'react';

import Component from '@reactions/component';

import { Section } from '../guide/components';

import Autocomplete, { MultiAutocomplete } from './Autocomplete';

let items = [
  { id: 'one', name: 'James' },
  { id: 'two', name: 'Sarah' },
  { id: 'three', name: 'Evelina' },
  { id: 'four', name: 'Georgia' },
  { id: 'five', name: 'Charlotte' },
  { id: 'six', name: 'Fannie' },
  { id: 'seven', name: 'Lily' },
  { id: 'eight', name: 'Gray' }
];

export default () => (
  <Section>
    Autocomplete
    <Autocomplete
      suggestions={items}
      highlightFirst
      onUpdate={() => {}}
      containerProps={{ style: { width: 300 } }}
    />
    Multi Autocomplete
    <Component initialState={{ items: [] }}>
      {({ state, setState }) => (
        <MultiAutocomplete
          suggestions={['#one', '#two', '#three']}
          highlightFirst
          value={state.items}
          onChange={items => setState({ items })}
          containerProps={{ style: { width: 300 } }}
        />
      )}
    </Component>
    Multi Autocomplete (strict)
    <Component initialState={{ ids: [] }}>
      {({ state, setState }) => (
        <MultiAutocomplete
          suggestions={items}
          highlightFirst
          strict
          value={state.ids}
          onChange={ids => setState({ ids })}
          containerProps={{ style: { width: 300 } }}
        />
      )}
    </Component>
  </Section>
);
