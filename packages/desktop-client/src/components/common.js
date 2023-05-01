import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from 'react';
import { Route, NavLink, withRouter, useRouteMatch } from 'react-router-dom';

import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption,
} from '@reach/listbox';
import { css } from 'glamor';

import { integerToCurrency } from 'loot-core/src/shared/util';

import ExpandArrow from '../icons/v0/ExpandArrow';
import { styles, colors } from '../style';

import Button from './common/Button';
import Input, { defaultInputStyle } from './common/Input';
import Text from './common/Text';
import View from './common/View';

export { default as Modal, ModalButtons } from './common/Modal';
export { default as Button, ButtonWithLoading } from './common/Button';
export { default as Input } from './common/Input';
export { default as View } from './common/View';
export { default as Text } from './common/Text';
export { default as Stack } from './Stack';

export function TextOneLine({ children, ...props }) {
  return (
    <Text
      {...props}
      style={[
        props.style,
        {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        },
      ]}
    >
      {children}
    </Text>
  );
}

export const useStableCallback = callback => {
  const callbackRef = useRef();
  const memoCallback = useCallback(
    (...args) => callbackRef.current(...args),
    [],
  );
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  return memoCallback;
};

export function Block(props) {
  const { style, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef}
      className={`${props.className || ''} ${css(props.style)}`}
    />
  );
}

export const Card = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <View
      {...props}
      ref={ref}
      style={[
        {
          marginTop: 15,
          marginLeft: 5,
          marginRight: 5,
          borderRadius: 6,
          backgroundColor: 'white',
          borderColor: colors.p3,
          boxShadow: '0 1px 2px #9594A8',
        },
        props.style,
      ]}
    >
      <View
        style={{
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
});

export function Link({ style, children, ...nativeProps }) {
  return (
    <Button
      {...css(
        {
          textDecoration: 'none',
          color: styles.textColor,
          backgroundColor: 'transparent',
          border: 0,
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
          ':hover': {
            textDecoration: 'underline',
          },
        },
        styles.smallText,
        style,
      )}
      {...nativeProps}
    >
      {children}
    </Button>
  );
}

export function AnchorLink({ to, exact, style, activeStyle, children }) {
  let match = useRouteMatch({ path: to, exact: true });

  return (
    <NavLink
      to={to}
      exact={exact}
      {...css([styles.smallText, style, match ? activeStyle : null])}
    >
      {children}
    </NavLink>
  );
}

export const ExternalLink = React.forwardRef(
  ({ asAnchor, children, ...props }, ref) => {
    function onClick(e) {
      e.preventDefault();
      window.Actual.openURLInBrowser(props.href);
    }

    if (asAnchor) {
      return (
        <a ref={ref} {...props} onClick={onClick}>
          {children}
        </a>
      );
    }
    return (
      <Button ref={ref} bare {...props} onClick={onClick}>
        {children}
      </Button>
    );
  },
);

function ButtonLink_({
  history,
  staticContext,
  to,
  style,
  activeStyle,
  match,
  location,
  ...props
}) {
  return (
    <Route
      path={to}
      children={({ match }) => (
        <Button
          style={[style, match ? activeStyle : null]}
          {...props}
          onClick={e => {
            props.onClick && props.onClick(e);
            history.push(to);
          }}
        />
      )}
    />
  );
}

export const ButtonLink = withRouter(ButtonLink_);

export function InputWithContent({
  leftContent,
  rightContent,
  inputStyle,
  style,
  getStyle,
  ...props
}) {
  let [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        defaultInputStyle,
        {
          padding: 0,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        },
        focused && {
          border: '1px solid ' + colors.b5,
          boxShadow: '0 1px 1px ' + colors.b7,
        },
        style,
        getStyle && getStyle(focused),
      ]}
    >
      {leftContent}
      <Input
        {...props}
        style={[
          inputStyle,
          {
            flex: 1,
            '&, &:focus, &:hover': {
              border: 0,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              color: 'inherit',
            },
          },
        ]}
        onFocus={e => {
          setFocused(true);
          props.onFocus && props.onFocus(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur && props.onBlur(e);
        }}
      />
      {rightContent}
    </View>
  );
}

export function Search({
  inputRef,
  value,
  onChange,
  placeholder,
  isInModal,
  width = 350,
}) {
  return (
    <Input
      inputRef={inputRef}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width,
        borderColor: isInModal ? null : 'transparent',
        backgroundColor: isInModal ? null : colors.n11,
        ':focus': isInModal
          ? null
          : {
              backgroundColor: 'white',
              '::placeholder': { color: colors.n8 },
            },
      }}
    />
  );
}

export function KeyboardButton({ highlighted, children, ...props }) {
  return (
    <Button
      {...props}
      bare
      style={[
        {
          backgroundColor: 'white',
          shadowColor: colors.n3,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 1,
          shadowOpacity: 1,
          elevation: 4,
          borderWidth: 0,
          paddingLeft: 17,
          paddingRight: 17,
        },
        highlighted && { backgroundColor: colors.p6 },
        props.style,
      ]}
      textStyle={[highlighted && { color: 'white' }]}
    >
      {children}
    </Button>
  );
}

export const Select = React.forwardRef(
  ({ style, children, ...nativeProps }, ref) => {
    return (
      <select
        ref={ref}
        {...css(
          {
            backgroundColor: 'transparent',
            height: 28,
            fontSize: 14,
            flex: 1,
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            color: colors.n1,
            ':focus': {
              border: '1px solid ' + colors.b5,
              boxShadow: '0 1px 1px ' + colors.b7,
              outline: 'none',
            },
          },
          style,
        )}
        {...nativeProps}
      >
        {children}
      </select>
    );
  },
);

export function CustomSelect({
  options,
  value,
  onChange,
  style,
  disabledKeys = [],
}) {
  return (
    <ListboxInput
      value={value}
      onChange={onChange}
      style={{ lineHeight: '1em' }}
    >
      <ListboxButton
        {...css([{ borderWidth: 0, padding: 5, borderRadius: 4 }, style])}
        arrow={<ExpandArrow style={{ width: 7, height: 7, paddingTop: 3 }} />}
      />
      <ListboxPopover style={{ zIndex: 10000, outline: 0, borderRadius: 4 }}>
        <ListboxList>
          {options.map(([value, label]) => (
            <ListboxOption
              key={value}
              value={value}
              disabled={disabledKeys.includes(value)}
            >
              {label}
            </ListboxOption>
          ))}
        </ListboxList>
      </ListboxPopover>
    </ListboxInput>
  );
}

export function Keybinding({ keyName }) {
  return <Text style={{ fontSize: 10, color: colors.n6 }}>{keyName}</Text>;
}

export function Menu({ header, footer, items: allItems, onMenuSelect }) {
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
          if (hoveredIndex !== null) {
            onMenuSelect && onMenuSelect(items[hoveredIndex].name);
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
                React.createElement(item.icon, {
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

Menu.line = Symbol('menu-line');
Menu.label = Symbol('menu-label');

export function AlignedText({
  left,
  right,
  style,
  leftStyle,
  rightStyle,
  truncate = 'left',
  ...nativeProps
}) {
  const truncateStyle = {
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
      {...nativeProps}
    >
      <Block
        style={[
          { marginRight: 10 },
          truncate === 'left' && truncateStyle,
          leftStyle,
        ]}
      >
        {left}
      </Block>
      <Block
        style={[
          { flex: 1, textAlign: 'right' },
          truncate === 'right' && truncateStyle,
          rightStyle,
        ]}
      >
        {right}
      </Block>
    </View>
  );
}

export function PlainCurrency({ amount, style }) {
  return <span style={style}>{integerToCurrency(amount)}</span>;
}

export function PageHeader({ title, style }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <span style={[styles.pageHeader, style]}>{title}</span>
    </View>
  );
}

export function P({ style, isLast, children, ...props }) {
  return (
    <div
      {...props}
      {...css(!isLast && { marginBottom: 15 }, style, { lineHeight: '1.5em' })}
    >
      {children}
    </div>
  );
}

export function Strong({ style, children, ...props }) {
  return (
    <span {...props} {...css(style, { fontWeight: 500 })}>
      {children}
    </span>
  );
}

export function InlineField({ label, labelWidth, children, width, style }) {
  return (
    <label
      {...css(
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          margin: '7px 0',
          width,
        },
        style,
      )}
    >
      <div
        style={{
          width: labelWidth || 75,
          textAlign: 'right',
          paddingRight: 10,
        }}
      >
        {label}:
      </div>
      {children}
    </label>
  );
}

export function FormError({ style, children }) {
  return (
    <View style={[{ color: 'red', fontSize: 13 }, style]}>{children}</View>
  );
}

export function InitialFocus({ children }) {
  let node = useRef(null);

  useEffect(() => {
    if (node.current && !global.IS_DESIGN_MODE) {
      // This is needed to avoid a strange interaction with
      // `ScopeTab`, which doesn't allow it to be focused at first for
      // some reason. Need to look into it.
      setTimeout(() => {
        if (node.current) {
          node.current.focus();
          node.current.setSelectionRange(0, 10000);
        }
      }, 0);
    }
  }, []);

  if (typeof children === 'function') {
    return children(node);
  }
  return React.cloneElement(children, { inputRef: node });
}

export function HoverTarget({
  style,
  contentStyle,
  children,
  renderContent,
  disabled,
}) {
  let [hovered, setHovered] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!disabled) {
      setHovered(true);
    }
  }, [disabled]);

  const onMouseLeave = useCallback(() => {
    if (!disabled) {
      setHovered(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (disabled && hovered) {
      setHovered(false);
    }
  }, [disabled, hovered]);

  return (
    <View style={style}>
      <View
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={contentStyle}
      >
        {children}
      </View>
      {hovered && renderContent()}
    </View>
  );
}

export function Label({ title, style }) {
  return (
    <Text
      style={[
        styles.text,
        {
          color: colors.n2,
          textAlign: 'right',
          fontSize: 12,
          marginBottom: 2,
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}

export const NullComponent = () => null;

export * from './tooltips';
export { useTooltip } from './tooltips';
