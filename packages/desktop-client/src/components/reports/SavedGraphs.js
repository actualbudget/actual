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
  let [dataMenuOpen, setDataMenuOpen] = useState(false);
  let [disabledItem, setDisabledItem] = useState('AreaGraph');

  const onGraphMenuSelect = async item => {
    setDisabledItem(item);
    switch (item) {
      case 'AreaGraph':
        selectGraph(item);
        setMenuOpen(false);
        break;
      case 'BarGraph':
        selectGraph(item);
        setMenuOpen(false);
        break;
      case 'BarLineGraph':
        selectGraph(item);
        setMenuOpen(false);
        break;
      case 'LineGraph':
        selectGraph(item);
        setMenuOpen(false);
        break;
      case 'DonutGraph':
        selectGraph(item);
        setMenuOpen(false);
        break;
      case 'StackedBarGraph':
        selectGraph(item);
        setMenuOpen(false);
        break;
      case 'Summary':
        setMenuOpen(false);
        break;
      case 'ZeroLine':
        setMenuOpen(false);
        break;
      default:
    }
  };

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

  function GraphMenu({ onClose }) {
    return (
      <MenuTooltip width={150} onClose={onClose}>
        <Menu
          onMenuSelect={item => {
            onGraphMenuSelect(item);
          }}
          items={[
            ...[
              {
                name: 'AreaGraph',
                disabled: disabledItem === 'AreaGraph' ? true : false,
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
                name: 'BarGraph',
                disabled: disabledItem === 'BarGraph' ? true : false,
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
                name: 'BarLineGraph',
                disabled: disabledItem === 'BarLineGraph' ? true : false,
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
              {
                name: 'LineGraph',
                disabled: disabledItem === 'LineGraph' ? true : false,
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
              Menu.line,
              {
                name: 'DonutGraph',
                disabled: disabledItem === 'DonutGraph' ? true : false,
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
                name: 'StackedBarGraph',
                disabled: disabledItem === 'StackedBarGraph' ? true : false,
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
              Menu.line,
              {
                name: 'Summary',
                text: 'View Summary',
              },
              {
                name: 'ZeroLine',
                text: 'Set Line to Zero',
                disabled: true,
              },
            ],
          ]}
        />
      </MenuTooltip>
    );
  }

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
