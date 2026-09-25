import React from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { ChangeLogKind } from '@actual-app/core/server/changelog/types';

// An edit is the ordinary case, so its badge is the neutral one: it names the
// event without competing with the diffs that say what actually moved.
const KIND_COLORS = {
  created: { background: theme.noticeBackground, text: theme.noticeText },
  updated: {
    background: theme.tableRowHeaderBackground,
    text: theme.tableRowHeaderText,
  },
  deleted: { background: theme.errorBackground, text: theme.errorTextDark },
  restored: {
    background: theme.formLabelBackground,
    text: theme.formLabelText,
  },
} as const;

type ChangeLogKindBadgeProps = {
  kind: ChangeLogKind;
};

export function ChangeLogKindBadge({ kind }: ChangeLogKindBadgeProps) {
  const colors = KIND_COLORS[kind];

  return (
    <View
      data-testid="change-log-badge"
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.background,
        color: colors.text,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {kind === 'created' && <Trans>Added</Trans>}
      {kind === 'updated' && <Trans>Edited</Trans>}
      {kind === 'deleted' && <Trans>Deleted</Trans>}
      {kind === 'restored' && <Trans>Restored</Trans>}
    </View>
  );
}
