import React, { useRef } from 'react';
import { useListBox } from 'react-aria';
import { useListState } from 'react-stately';

import { useScrollListener } from '../../ScrollProvider';

import { ListBoxSection } from './ListBoxSection';

export function ListBox(props) {
  const state = useListState(props);
  const listBoxRef = useRef();
  const { listBoxProps, labelProps } = useListBox(props, state, listBoxRef);
  const { loadMore } = props;

  useScrollListener(({ hasScrolledToEnd }) => {
    const scrolledToBottom = hasScrolledToEnd('down', 5);
    if (scrolledToBottom) {
      loadMore?.();
    }
  });

  return (
    <>
      <div {...labelProps}>{props.label}</div>
      <ul
        {...listBoxProps}
        ref={listBoxRef}
        style={{
          padding: 0,
          listStyle: 'none',
          margin: 0,
          width: '100%',
        }}
      >
        {[...state.collection].map(item => (
          <ListBoxSection key={item.key} section={item} state={state} />
        ))}
      </ul>
    </>
  );
}
