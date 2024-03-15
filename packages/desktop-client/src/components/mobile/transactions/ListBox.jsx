import React, { useEffect, useRef } from 'react';

import { useListBox } from '@react-aria/listbox';
import { useListState } from '@react-stately/list';

import { ListBoxSection } from './ListBoxSection';

export function ListBox(props) {
  const state = useListState(props);
  const listBoxRef = useRef();
  const { listBoxProps, labelProps } = useListBox(props, state, listBoxRef);
  const { loadMore } = props;

  useEffect(() => {
    function loadMoreTransactions() {
      if (
        Math.abs(
          listBoxRef.current.scrollHeight -
            listBoxRef.current.clientHeight -
            listBoxRef.current.scrollTop,
        ) < listBoxRef.current.clientHeight // load more when we're one screen height from the end
      ) {
        loadMore?.();
      }
    }
    const currentListBoxRef = listBoxRef.current;
    currentListBoxRef?.addEventListener('scroll', loadMoreTransactions);

    return () => {
      currentListBoxRef?.removeEventListener('scroll', loadMoreTransactions);
    };
  }, [loadMore, state.collection]);

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
