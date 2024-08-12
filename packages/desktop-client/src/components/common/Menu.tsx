import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react';

import { type CSSProperties, theme } from '../../style';

import { Text } from './Text';
import { Toggle } from './Toggle';
import { View } from './View';

const MenuLine: unique symbol = Symbol('menu-line');
Menu.line = MenuLine;
Menu.label = Symbol('menu-label');

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
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconSize?: number;
  text: string;
  key?: string;
  toggle?: boolean;
  tooltip?: string;
};

type MenuProps<T extends MenuItem = MenuItem> = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<T | typeof Menu.line>;
  onMenuSelect?: (itemName: T['name']) => void;
  style?: CSSProperties;
  getItemStyle?: (item: T) => CSSProperties;
};

export function Menu<T extends MenuItem>({
  header,
  footer,
  items: allItems,
  onMenuSelect,
  style,
  getItemStyle,
}: MenuProps<T>) {
  const elRef = useRef<HTMLDivElement>(null);
  const items = allItems.filter(x => x);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = elRef.current;
    el?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      const filteredItems = items.filter(
        item => item && item !== Menu.line && item.type !== Menu.label,
      );
      const currentIndex = filteredItems.indexOf(items[hoveredIndex || 0]);

      const transformIndex = (idx: number) => items.indexOf(filteredItems[idx]);

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
          const item = items[hoveredIndex || 0];
          if (hoveredIndex !== null && item !== Menu.line) {
            onMenuSelect?.(item.name);
          }
          break;
        default:
      }
    };

    el?.addEventListener('keydown', onKeyDown);

    return () => {
      el?.removeEventListener('keydown', onKeyDown);
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
              key={idx}
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

        const Icon = item.icon;

        return (
          <View
            role="button"
            key={item.name}
            style={{
              cursor: 'default',
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              color: theme.menuItemText,
              ...(item.disabled && { color: theme.buttonBareDisabledText }),
              ...(!item.disabled &&
                hoveredIndex === idx && {
                  backgroundColor: theme.menuItemBackgroundHover,
                  color: theme.menuItemTextHover,
                }),
              ...getItemStyle?.(item),
            }}
            onPointerEnter={() => setHoveredIndex(idx)}
            onPointerLeave={() => setHoveredIndex(null)}
            onPointerUp={e => {
              e.stopPropagation();

              if (!item.disabled && item.toggle === undefined) {
                onMenuSelect?.(item.name);
              }
            }}
          >
            {/* Force it to line up evenly */}
            {item.toggle === undefined ? (
              <>
                {Icon && (
                  <Icon
                    width={item.iconSize || 10}
                    height={item.iconSize || 10}
                    style={{ marginRight: 7, width: item.iconSize || 10 }}
                  />
                )}
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
                  style={{ marginLeft: 5 }}
                  onToggle={() =>
                    !item.disabled &&
                    item.toggle !== undefined &&
                    onMenuSelect?.(item.name)
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
