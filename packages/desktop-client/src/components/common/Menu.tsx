// @ts-strict-ignore
import {
  type ReactNode,
  createElement,
  useEffect,
  useRef,
  useState,
} from 'react';

import { type CSSProperties, theme } from '../../style';

import { Text } from './Text';
import { Toggle } from './Toggle';
import { View } from './View';

type KeybindingProps = {
  keyName: ReactNode;
};

function Keybinding({ keyName }: KeybindingProps) {
  return (
    <Text style={{ fontSize: 10, color: theme.menuKeybindingText }}>
      {keyName}
    </Text>
  );
}

export type MenuItem = {
  type?: string | symbol;
  name: string;
  disabled?: boolean;
  icon?;
  iconSize?: number;
  text: string;
  key?: string;
  style?: CSSProperties;
  toggle?: boolean;
  tooltip?: string;
};

type MenuProps<T extends MenuItem = MenuItem> = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<T | typeof Menu.line>;
  onMenuSelect: (itemName: T['name']) => void;
  style?: CSSProperties;
};

export function Menu<T extends MenuItem>({
  header,
  footer,
  items: allItems,
  onMenuSelect,
  style,
}: MenuProps<T>) {
  const elRef = useRef(null);
  const items = allItems.filter(x => x);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const el = elRef.current;
    el.focus();

    const onKeyDown = e => {
      const filteredItems = items.filter(
        item => item && item !== Menu.line && item.type !== Menu.label,
      );
      const currentIndex = filteredItems.indexOf(items[hoveredIndex]);

      const transformIndex = idx => items.indexOf(filteredItems[idx]);

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
            onMenuSelect?.(item.name);
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
      style={{ outline: 'none', borderRadius: 4, overflow: 'hidden', ...style }}
      tabIndex={1}
      innerRef={elRef}
    >
      {header}
      {items.map((item, idx) => {
        if (item === Menu.line) {
          return (
            <View key={idx} style={{ margin: '3px 0px' }}>
              <View style={{ borderTop: '1px solid ' + theme.menuBorder }} />
            </View>
          );
        } else if (item.type === Menu.label) {
          return (
            <Text
              key={item.name}
              style={{
                color: theme.menuItemTextHeader,
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

        const lastItem = items[idx - 1];

        return (
          <View
            role="button"
            key={item.name}
            style={{
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
              color: theme.menuItemText,
              ...(item.disabled && { color: theme.buttonBareDisabledText }),
              ...(!item.disabled &&
                hoveredIndex === idx && {
                  backgroundColor: theme.menuItemBackgroundHover,
                  color: theme.menuItemTextHover,
                }),
              ...item.style,
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() =>
              !item.disabled &&
              onMenuSelect &&
              item.toggle === undefined &&
              onMenuSelect(item.name)
            }
          >
            {/* Force it to line up evenly */}
            {item.toggle === undefined ? (
              <>
                <Text style={{ lineHeight: 0 }}>
                  {item.icon &&
                    createElement(item.icon, {
                      width: item.iconSize || 10,
                      height: item.iconSize || 10,
                      style: {
                        marginRight: 7,
                        width: item.iconSize || 10,
                      },
                    })}
                </Text>
                <Text title={item.tooltip}>{item.text}</Text>
                <View style={{ flex: 1 }} />
              </>
            ) : (
              <>
                <label htmlFor={item.name} title={item.tooltip}>
                  {item.text}
                </label>
                <View style={{ flex: 1 }} />
                <Toggle
                  id={item.name}
                  checked={item.toggle}
                  onColor={theme.pageTextPositive}
                  style={{ marginLeft: 5, ...item.style }}
                  onToggle={() =>
                    !item.disabled &&
                    item.toggle !== undefined &&
                    onMenuSelect(item.name)
                  }
                />
              </>
            )}
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
