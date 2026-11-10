import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
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
  const location = useLocation();
  // Keep the search in the URL so it survives opening a transaction and
  // navigating back. Local state drives the input so typing stays responsive.
  const [searchParam, setSearchParam] = useUrlParam('search');
  const urlText = searchParam ?? '';
  const [text, setText] = useState(urlText);
  // The last search sent to onSearch, so the URL update caused by typing
  // isn't applied a second time.
  const lastSearch = useRef('');

  const applySearch = useEffectEvent((value: string) => {
    if (value !== lastSearch.current) {
      lastSearch.current = value;
      setText(value);
      onSearch(value);
    }
  });
  // Follow the URL whenever it changes: on mount (restoring a search after
  // navigating back) and on any later navigation that changes `search`.
  useEffect(() => {
    applySearch(urlText);
  }, [urlText]);

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
          lastSearch.current = text;
          setText(text);
          onSearch(text);
          // Preserve navigation state (e.g. report drill-down filters).
          setSearchParam(text, { replace: true, state: location.state });
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
