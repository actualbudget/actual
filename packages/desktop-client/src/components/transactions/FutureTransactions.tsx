import React, { useCallback, useState } from 'react';

import { SvgCheveronDown, SvgCheveronRight } from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';

import { View } from '../common/View';
import { Row } from '../table';

export function FutureTransactions({ children }) {
  const [isOpen, setOpen] = useState(false);

  const onToggle = useCallback(() => setOpen(open => !open), []);

  return (
    <div style={{ backgroundColor: 'lightgray' }}>
      <FutureTransactionsHeader
        Icon={isOpen ? SvgCheveronDown : SvgCheveronRight}
        onClick={onToggle}
      />
      {isOpen && children}
      {isOpen && (
        <View
          style={{
            flexDirection: 'row',
            height: 10,
            flex: '0 0 10px',
            userSelect: 'text',
            backgroundColor: 'lightgray',
          }}
        />
      )}
    </div>
  );
}

function FutureTransactionsHeader({ Icon, onClick }) {
  return (
    <Row style={{ alignItems: 'center' }}>
      <SvgCalendar
        style={{
          width: 13,
          height: 13,
          marginTop: 0,
          marginLeft: 5,
          marginRight: 8,
        }}
      />
      <span style={{ fontWeight: 'bold' }}>Future transactions</span>
      <Icon
        style={{ width: 20, height: 20, marginTop: 0, marginLeft: 5 }}
        onClick={onClick}
      />
    </Row>
  );
}
