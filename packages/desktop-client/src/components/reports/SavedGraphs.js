import React, { useState } from 'react';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import Button from '../common/Button';
import Menu from '../common/Menu';
import MenuTooltip from '../common/MenuTooltip';
import Text from '../common/Text';
import View from '../common/View';

export function SavedGraphMenuButton({ selectGraph }) {
  let [dataMenuOpen, setDataMenuOpen] = useState(false);

  const onDataMenuSelect = async item => {
    switch (item) {
      case 'NetWorth':
        setDataMenuOpen(false);
        break;
      case 'CashFlow':
        setDataMenuOpen(false);
        break;
      case 'Income':
        setDataMenuOpen(false);
        break;
      case 'Expense':
        setDataMenuOpen(false);
        break;
      case 'All':
        setDataMenuOpen(false);
        break;
      default:
    }
  };

  function DataMenu({ onClose }) {
    return (
      <MenuTooltip width={150} onClose={onClose}>
        <Menu
          onMenuSelect={item => {
            onDataMenuSelect(item);
          }}
          items={[
            ...[
              {
                name: 'NetWorth',
                text: 'Save new report',
              },
              {
                name: 'CashFlow',
                text: 'Clear all',
              },
            ],
          ]}
        />
      </MenuTooltip>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Button
        type="bare"
        onClick={() => {
          setDataMenuOpen(true);
        }}
      >
        <Text
          style={{
            maxWidth: 150,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 0,
          }}
        >
          {'Unsaved Report'}&nbsp;
        </Text>
        <ExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>
      {dataMenuOpen && <DataMenu onClose={() => setDataMenuOpen(false)} />}
    </View>
  );
}
