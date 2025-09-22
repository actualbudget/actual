import React from 'react';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

import { type PayeeEntity } from 'loot-core/types/models';

type PayeesListItemProps = {
  payee: PayeeEntity;
  onPress: () => void;
};

export function PayeesListItem({ payee, onPress }: PayeesListItemProps) {
  return (
    <Button
      variant="bare"
      style={{
        minHeight: 56,
        width: '100%',
        borderRadius: 0,
        borderWidth: '0 0 1px 0',
        borderColor: theme.tableBorder,
        borderStyle: 'solid',
        backgroundColor: theme.tableBackground,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '12px 16px',
        gap: 12,
      }}
      onPress={onPress}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: theme.pageText,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={payee.name}
      >
        {payee.name}
      </span>
    </Button>
  );
}
