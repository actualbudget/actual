import {
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
const MenuLabel: unique symbol = Symbol('menu-label');
Menu.line = MenuLine;
Menu.label = MenuLabel;

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

type MenuItemObject<NameType, Type extends string | symbol = string> = {
  type?: Type;
  name: NameType;
  disabled?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconSize?: number;
  text: string;
  key?: string;
  toggle?: boolean;
  tooltip?: string;
};

export type MenuItem<NameType = string> =
  | MenuItemObject<NameType>
  | MenuItemObject<string, typeof Menu.label>
  | typeof Menu.line;

function isLabel<T>(
  item: MenuItemObject<T> | MenuItemObject<string, typeof Menu.label>,
): item is MenuItemObject<string, typeof Menu.label> {
  return item.type === Menu.label;
}

type MenuProps<NameType> = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<MenuItem<NameType>>;
  onMenuSelect?: (itemName: NameType) => void;
  style?: CSSProperties;
  className?: string;
  getItemStyle?: (item: MenuItemObject<NameType>) => CSSProperties;
};

export function Menu<const NameType = string>({
  header,
  footer,
  items: allItems,
  onMenuSelect,
  style,
  className,
  getItemStyle,
}: MenuProps<NameType>) {
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
          if (hoveredIndex !== null && item !== Menu.line && !isLabel(item)) {
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
      className={className}
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
        } else if (isLabel(item)) {
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
            key={String(item.name)}
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
              ...(!isLabel(item) && getItemStyle?.(item)),
            }}
            onPointerEnter={() => setHoveredIndex(idx)}
            onPointerLeave={() => setHoveredIndex(null)}
            onPointerUp={e => {
              e.stopPropagation();

              if (
                !item.disabled &&
                item.toggle === undefined &&
                !isLabel(item)
              ) {
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
              <View
                style={{
                  flexDirection: 'row',
                  flex: 1,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label htmlFor={String(item.name)} title={item.tooltip}>
                  {item.text}
                </label>
                <Toggle
                  id={String(item.name)}
                  isOn={item.toggle}
                  style={{ marginLeft: 5 }}
                  onToggle={() =>
                    !item.disabled &&
                    !isLabel(item) &&
                    item.toggle !== undefined &&
                    onMenuSelect?.(item.name)
                  }
                />
              </View>
            )}
            {item.key && <Keybinding keyName={item.key} />}
          </View>
        );
      })}
      {footer}
    </View>
  );
}
