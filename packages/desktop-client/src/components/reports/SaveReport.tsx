import React, { useState } from 'react';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import { Button } from '../common/Button';
import Menu from '../common/Menu';
import MenuTooltip from '../common/MenuTooltip';
import Text from '../common/Text';
import View from '../common/View';

function SaveReportMenu({ setMenuOpen }) {
  return (
    <MenuTooltip width={150} onClose={() => setMenuOpen(false)}>
      <Menu
        onMenuSelect={item => {
          switch (item) {
            case 'save':
            case 'clear':
              setMenuOpen(false);
              break;
            default:
          }
        }}
        items={[
          {
            name: 'save',
            text: 'Save new report',
            disabled: true,
          },
          {
            name: 'clear',
            text: 'Clear all',
            disabled: true,
          },
        ]}
      />
    </MenuTooltip>
  );
}

export function SaveReportMenuButton() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          setMenuOpen(true);
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
          Unsaved Report&nbsp;
        </Text>
        <ExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>
      {menuOpen && <SaveReportMenu setMenuOpen={setMenuOpen} />}
    </View>
  );
}
