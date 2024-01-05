import { type ReactNode, useRef, useState, useEffect } from 'react';

import { type CSSProperties, theme } from '../../style';

import Text from './Text';
import { Toggle } from './Toggle';
import View from './View';

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

type MenuItem = {
  type?: string | symbol;
  name: string;
  disabled?: boolean;
  toggle?: boolean;
  tooltip?: string;
  text: string;
  key?: string;
  isOn?: boolean;
  style?: CSSProperties;
};

type ToggleMenuProps = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<MenuItem | typeof ToggleMenu.line>;
  onMenuSelect: (itemName: MenuItem['name']) => void;
  style?: CSSProperties;
};

export function ToggleMenu({
  header,
  footer,
  items: allItems,
  onMenuSelect,
  style,
}: ToggleMenuProps) {
  const elRef = useRef(null);
  const items = allItems.filter(x => x);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const el = elRef.current;
    el.focus();

    const onKeyDown = e => {
      const filteredItems = items.filter(
        item =>
          item && item !== ToggleMenu.line && item.type !== ToggleMenu.label,
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
          if (hoveredIndex !== null && item !== ToggleMenu.line) {
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
        if (item === ToggleMenu.line) {
          return (
            <View key={idx} style={{ margin: '3px 0px' }}>
              <View style={{ borderTop: '1px solid ' + theme.menuBorder }} />
            </View>
          );
        } else if (item.type === ToggleMenu.label) {
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
            key={item.name}
            style={{
              cursor: 'default',
              padding: '9px 10px',
              marginTop:
                idx === 0 ||
                lastItem === ToggleMenu.line ||
                lastItem.type === ToggleMenu.label
                  ? 0
                  : -3,
              flexDirection: 'row',
              alignItems: 'center',
              justifyItems: 'center',
              color: theme.menuItemText,
              ...(item.disabled && { color: theme.buttonBareDisabledText }),
              ...(!item.disabled &&
                hoveredIndex === idx && {
                  backgroundColor: theme.menuItemBackgroundHover,
                  color: theme.menuItemTextHover,
                }),
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={e =>
              !item.disabled &&
              onMenuSelect &&
              !item.toggle &&
              onMenuSelect(item.name)
            }
          >
            {/* Force it to line up evenly */}
            {!item.toggle && (
              <>
                <Text title={item.tooltip}>{item.text}</Text>
                <View style={{ flex: 1 }} />
              </>
            )}
            {item.toggle && (
              <>
                <label htmlFor={item.name} title={item.tooltip}>
                  {item.text}
                </label>
                <View style={{ flex: 1 }} />
                <Toggle
                  id={item.name}
                  checked={item.isOn}
                  onColor={theme.pageTextPositive}
                  style={{ marginLeft: 5, ...item.style }}
                  onChange={() =>
                    !item.disabled && item.toggle && onMenuSelect(item.name)
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
ToggleMenu.line = MenuLine;
ToggleMenu.label = Symbol('menu-label');
