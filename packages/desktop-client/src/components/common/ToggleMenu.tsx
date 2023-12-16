import {
  type ReactNode,
  createElement,
  useEffect,
  useRef,
  useState,
} from 'react';

import { theme } from '../../style';

import Text from './Text';
import View from './View';
import Toggle from './Toggle';

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
  iconSize?: number;
  text: string;
  key?: string;
  isOn?;
};

type ToggleMenuProps = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<MenuItem | typeof ToggleMenu.line>;
  onMenuSelect: (itemName: MenuItem['name']) => void;
};

export default function ToggleMenu({
  header,
  footer,
  items: allItems,
  onMenuSelect,
}: ToggleMenuProps) {
  const elRef = useRef(null);
  const items = allItems.filter(x => x);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  //control menu with keyboard
  useEffect(() => {
    const el = elRef.current;
    el.focus();

    const onKeyDown = e => {
      const filteredItems = items.filter(
        item => item && item !== ToggleMenu.line && item.type !== ToggleMenu.label,
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
      style={{ outline: 'none', borderRadius: 4, overflow: 'hidden' }}
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
            role="button"
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
              justifyContent: 'center',
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
              !item.disabled && onMenuSelect && onMenuSelect(item.name)
            }
          >
            {/* Force it to line up evenly */}
            <Text>{item.text}</Text>
            <View style={{ flex: 1 }} />
            {item.toggle && 
              <View style={{ marginLeft: 7, paddingBottom: 10,}}>
                <Toggle
                  isOn={item.isOn}
                  onColor={theme.pageTextPositive}
                  handleToggle={() => onMenuSelect(item.name)}
                />
              </View>
            }
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
