import React, { useState } from 'react';
import { RefreshControl } from 'react-native';

export default function PullToRefresh({ children, onRefresh }) {
  let [refreshing, setRefreshing] = useState(false);

  async function onRefresh_() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  return children({
    refreshControl: (
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh_} />
    )
  });
}
