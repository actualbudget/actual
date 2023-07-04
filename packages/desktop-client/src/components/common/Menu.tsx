import {
  type ReactNode,
  createElement,
  useEffect,
  useRef,
  useState,
} from 'react';

import { colors } from '../../style';

import Text from './Text';
import View from './View';

type KeybindingProps = {
  keyName: ReactNode;
};

function Keybinding({ keyName }: KeybindingProps) {
  return <Text style={{ fontSize: 10, color: colors.n6 }}>{keyName}</Text>;
}

type MenuItem = {
  type?: string | symbol;
  name: string;
  disabled?: boolean;
  icon?;
  iconSize?: number;
  text: string;
  key?: string;
};

type MenuProps = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<MenuItem | typeof Menu.line>;
  onMenuSelect;
};

export default function Menu({
  header,
  footer,
  items: allItems,
  onMenuSelect,
}: MenuProps) {
  let elRef = useRef(null);
  let items = allItems.filter(x => x);
  let [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const el = elRef.current;
    el.focus();

    let onKeyDown = e => {
      let filteredItems = items.filter(
        item => item && item !== Menu.line && item.type !== Menu.label,
      );
      let currentIndex = filteredItems.indexOf(items[hoveredIndex]);

      let transformIndex = idx => items.indexOf(filteredItems[idx]);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setHoveredIndex(
            hoveredIndex === null
              ? 0
              : transformIndex(Math.max(currentIndex - 1, 0)),
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHoveredIndex(
            hoveredIndex === null
              ? 0
              : transformIndex(
                  Math.min(currentIndex + 1, filteredItems.length - 1),
                ),
          );
          break;
        case 'Enter':
          e.preventDefault();
          const item = items[hoveredIndex];
          if (hoveredIndex !== null && item !== Menu.line) {
            onMenuSelect && onMenuSelect(item.name);
          }
          break;
        default:
      }
    };

    el.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [hoveredIndex]);

  return (
    <View
      style={{ outline: 'none', borderRadius: 4, overflow: 'hidden' }}
      tabIndex={1}
      innerRef={elRef}
    >
      {header}
      {items.map((item, idx) => {
        if (item === Menu.line) {
          return (
            <View key={idx} style={{ margin: '3px 0px' }}>
              <View style={{ borderTop: '1px solid ' + colors.n10 }} />
            </View>
          );
        } else if (item.type === Menu.label) {
          return (
            <Text
              key={item.name}
              style={{
                color: colors.n6,
                fontSize: 11,
                lineHeight: '1em',
                textTransform: 'uppercase',
                margin: '3px 9px',
                marginTop: 5,
              }}
            >
              {item.name}
            </Text>
          );
        }

        let lastItem = items[idx - 1];

        return (
          <View
            role="button"
            key={item.name}
            style={[
              {
                cursor: 'default',
                padding: '9px 10px',
                marginTop:
                  idx === 0 ||
                  lastItem === Menu.line ||
                  lastItem.type === Menu.label
                    ? 0
                    : -3,
                flexDirection: 'row',
                alignItems: 'center',
              },
              item.disabled && { color: colors.n7 },
              !item.disabled &&
                hoveredIndex === idx && { backgroundColor: colors.n10 },
            ]}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={e =>
              !item.disabled && onMenuSelect && onMenuSelect(item.name)
            }
          >
            {/* Force it to line up evenly */}
            <Text style={{ lineHeight: 0 }}>
              {item.icon &&
                createElement(item.icon, {
                  width: item.iconSize || 10,
                  height: item.iconSize || 10,
                  style: { marginRight: 7, width: 10 },
                })}
            </Text>
            <Text>{item.text}</Text>
            <View style={{ flex: 1 }} />
            {item.key && <Keybinding keyName={item.key} />}
          </View>
        );
      })}
      {footer}
    </View>
  );
}

const MenuLine: unique symbol = Symbol('menu-line');
Menu.line = MenuLine;
Menu.label = Symbol('menu-label');
