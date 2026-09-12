import React from 'react';

import { View } from '@actual-app/components/view';
import type { ChangeLogEntry } from '@actual-app/core/server/changelog/types';

import { ChangeLogRow } from './ChangeLogRow';

type ChangeLogListProps = {
  entries: ChangeLogEntry[];
  currentClientId: string;
};

export function ChangeLogList({
  entries,
  currentClientId,
}: ChangeLogListProps) {
  return (
    // Scoped so tests can address entry rows without also matching the
    // header, which `TableHeader` renders as a `Row` of its own.
    <View data-testid="change-log">
      {entries.map((entry, index) => (
        <ChangeLogRow
          key={entry.id}
          entry={entry}
          isCurrentClient={entry.clientId === currentClientId}
          index={index}
        />
      ))}
    </View>
  );
}
