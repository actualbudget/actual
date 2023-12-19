import {
  type ReactNode,
  createElement,
  useEffect,
  useRef,
  useState,
  createRef,
  type MouseEventHandler,
} from 'react';

import { theme } from '../../style';

import Text from './Text';
import View from './View';
import Toggle from './Toggle';
import { FormLabel } from '../forms';
import ToggleSwitch from './ToggleSwitch';

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
function Blanket({
  children,
  onClick,
}) {
  const blanketRef = createRef<HTMLDivElement>();

  const handleCloseClick: MouseEventHandler<HTMLDivElement> = (event) => {
    //if (typeof onClick !== "function") return;

    // begin type narrowing
    if (event.target !== blanketRef.current) return;

    event.stopPropagation();
    onClick();
  };

  return (
    <div
      ref={blanketRef}
      onClick={handleCloseClick}
    >
      {children}
    </div>
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
  const clickRef = createRef<HTMLInputElement>();
  const blanketRef = createRef<HTMLDivElement>();

  const handleCloseClick = (item, event) => {
    //if (typeof onClick !== "function") return;

    // begin type narrowing
    //if (event.currentTarget !== blanketRef.current) return;

    //event.stopPropagation();
    if (event === "parent") {onMenuSelect(item)};
  };

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
            onClick={(e) =>
              !item.disabled && onMenuSelect && handleCloseClick(item.name, "parent")
            }
          >
            {/* Force it to line up evenly */}
            {!item.toggle &&
            <>
            <Text>{item.text}</Text>
            <View style={{ flex: 1 }} />
            </>
            }
            {item.toggle && 
              <>
                <Text>{item.text}</Text>
                <View style={{ flex: 1 }} />
                <Toggle
                  id={item.name}
                  isOn={item.isOn}
                  onColor={theme.pageTextPositive}
                />
              </>
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
