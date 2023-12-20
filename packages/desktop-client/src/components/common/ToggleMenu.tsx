import {
  type ReactNode,
  useRef,
  useState,
  createRef,
} from 'react';

import { theme } from '../../style';
import { FormLabel } from '../forms';

import Text from './Text';
import Toggle from './Toggle';
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

  const blanketRef = [];

  const handleCloseClick = (item, event) => {
    const [ref] = blanketRef.filter(ref => ref.current === event.currentTarget);
    if (ref && event.target.id !== item) {
      return;
    } else {
      onMenuSelect(item);
    }
  };

  return (
    <View
      style={{ outline: 'none', borderRadius: 4, overflow: 'hidden' }}
      tabIndex={1}
      innerRef={elRef}
    >
      {header}
      {items.map((item, idx) => {
        blanketRef[idx] = createRef<HTMLDivElement>();
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
            innerRef={blanketRef[idx]}
            key={item.name}
            id={item.name}
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
              !item.toggle &&
              !item.disabled &&
              onMenuSelect &&
              onMenuSelect(item.name)
            }
          >
            {/* Force it to line up evenly */}
            {!item.toggle && (
              <>
                <Text>{item.text}</Text>
                <View style={{ flex: 1 }} />
              </>
            )}
            {item.toggle && (
              <>
                <FormLabel htmlFor={item.name} title={item.text} />
                <View style={{ flex: 1 }} />
                <Toggle
                  id={item.name}
                  checked={item.isOn}
                  onColor={theme.pageTextPositive}
                  onChange={e =>
                    item.toggle &&
                    !item.disabled &&
                    onMenuSelect &&
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
ToggleMenu.line = MenuLine;
ToggleMenu.label = Symbol('menu-label');
