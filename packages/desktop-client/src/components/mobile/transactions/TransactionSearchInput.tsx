import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Search } from '#components/common/Search';
import { useUrlParam } from '#hooks/useUrlParam';

type TransactionSearchInputProps = {
  placeholder: string;
  onSearch: (searchText: string) => void;
};

export function TransactionSearchInput({
  placeholder,
  onSearch,
}: TransactionSearchInputProps) {
  // Keep the search in the URL so it is restored when navigating back from a
  // transaction. Local state drives the input because URL updates are applied
  // in a React transition, which would let the input lag behind what was typed.
  const location = useLocation();
  const [searchParam, setSearchParam] = useUrlParam('search');
  const [text, setText] = useState(searchParam ?? '');
  // Values written to the URL by typing that may not have landed yet.
  const pendingParamsRef = useRef<string[]>([]);

  // Apply the URL search on mount (restoring it after navigating back) and
  // whenever a navigation changes it while the list stays mounted.
  useEffect(() => {
    const value = searchParam ?? '';
    const pendingIndex = pendingParamsRef.current.lastIndexOf(value);
    if (pendingIndex !== -1) {
      // Our own update caught up; the input and results already match it.
      pendingParamsRef.current = pendingParamsRef.current.slice(
        pendingIndex + 1,
      );
      return;
    }

    pendingParamsRef.current = [];
    setText(value);
    if (value !== '' || text !== '') {
      onSearch(value);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only react to URL changes
  }, [searchParam]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.mobilePageBackground,
        padding: 10,
        width: '100%',
      }}
    >
      <Search
        value={text}
        onChange={text => {
          setText(text);
          pendingParamsRef.current.push(text);
          // Carry the location state so drill-down filters are not dropped.
          setSearchParam(text, { replace: true, state: location.state });
          onSearch(text);
        }}
        placeholder={placeholder}
        width="100%"
        height={styles.mobileMinHeight}
        style={{
          backgroundColor: theme.tableBackground,
          borderColor: theme.formInputBorder,
        }}
      />
    </View>
  );
}
