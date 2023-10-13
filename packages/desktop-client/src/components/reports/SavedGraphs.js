import React, { useState } from 'react';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import ChartBar from '../../icons/v1/ChartBar';
import ChartPie from '../../icons/v1/ChartPie';
import Button from '../common/Button';
import Menu from '../common/Menu';
import MenuTooltip from '../common/MenuTooltip';
import Text from '../common/Text';
import View from '../common/View';

export function SavedGraphMenuButton({ selectGraph }) {
  let [menuOpen, setMenuOpen] = useState(false);

  const onFilterMenuSelect = async item => {
    selectGraph(item);
    switch (item) {
      case 'LineGraph':
        setMenuOpen(false);
        break;
      case 'AreaGraph':
        setMenuOpen(false);
        break;
      case 'DonutGraph':
        setMenuOpen(false);
        break;
      case 'BarGraph':
        setMenuOpen(false);
        break;
      case 'StackedBarGraph':
        setMenuOpen(false);
        break;
      case 'BarLineGraph':
        setMenuOpen(false);
        break;
      default:
    }
  };

  function GraphMenu({ onClose }) {
    return (
      <MenuTooltip width={150} onClose={onClose}>
        <Menu
          onMenuSelect={item => {
            onFilterMenuSelect(item);
          }}
          items={[
            ...[
              {
                name: 'LineGraph',
                text: (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ExpandArrow
                      width={8}
                      height={8}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{
                        maxWidth: 50,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      Line
                    </Text>
                  </View>
                ),
              },
              {
                name: 'AreaGraph',
                text: (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ExpandArrow
                      width={8}
                      height={8}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{
                        maxWidth: 50,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      Area
                    </Text>
                  </View>
                ),
              },
              {
                name: 'DonutGraph',
                text: (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ChartPie
                      width={10}
                      height={10}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{
                        maxWidth: 50,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      Donut
                    </Text>
                  </View>
                ),
              },
              {
                name: 'BarGraph',
                text: (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ChartBar
                      width={10}
                      height={10}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{
                        maxWidth: 50,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      Bar
                    </Text>
                  </View>
                ),
              },
              {
                name: 'StackedBarGraph',
                text: (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ChartBar
                      width={10}
                      height={10}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{
                        maxWidth: 100,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      Stacked Bar
                    </Text>
                  </View>
                ),
              },
              {
                name: 'BarLineGraph',
                text: (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ChartBar
                      width={10}
                      height={10}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{
                        maxWidth: 100,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      Bar Line
                    </Text>
                  </View>
                ),
              },
            ],
          ]}
        />
      </MenuTooltip>
    );
  }

  return (
    <View>
      <Button
        type="bare"
        style={{ marginTop: 10 }}
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
          {'Graph Select'}&nbsp;
        </Text>
        <ExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>
      {menuOpen && <GraphMenu onClose={() => setMenuOpen(false)} />}
    </View>
  );
}
