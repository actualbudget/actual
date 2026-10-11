import React, { useEffect, useState } from 'react';

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
  const [searchParam, setSearchParam] = useUrlParam('search');
  const [text, setText] = useState(searchParam ?? '');

  // Re-apply a search restored from the URL when the list is mounted.
  useEffect(() => {
    if (text !== '') {
      onSearch(text);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

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
          setSearchParam(text, { replace: true });
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
