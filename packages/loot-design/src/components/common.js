import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback
} from 'react';
import mergeRefs from 'react-merge-refs';
import ReactModal from 'react-modal';
import { Route, NavLink, withRouter, useRouteMatch } from 'react-router-dom';

import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption
} from '@reach/listbox';
import { css } from 'glamor';
import hotkeys from 'hotkeys-js';

import { integerToCurrency } from 'loot-core/src/shared/util';
import ExpandArrow from 'loot-design/src/svg/v0/ExpandArrow';

import { styles, colors } from '../style';
import Loading from '../svg/AnimatedLoading';
import Delete from '../svg/v0/Delete';
import tokens from '../tokens';

import Text from './Text';
import { useProperFocus } from './useProperFocus';
import View from './View';

export { default as View } from './View';
export { default as Text } from './Text';
export { default as Stack } from './Stack';

export function TextOneLine({ children, centered, ...props }) {
  return (
    <Text numberOfLines={1} {...props}>
      {children}
    </Text>
  );
}

export const useStableCallback = callback => {
  const callbackRef = useRef();
  const memoCallback = useCallback(
    (...args) => callbackRef.current(...args),
    []
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
          boxShadow: '0 1px 2px #9594A8'
        },
        props.style
      ]}
    >
      <View
        style={{
          borderRadius: 6,
          overflow: 'hidden'
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
            textDecoration: 'underline'
          }
        },
        styles.smallText,
        style
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
  }
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

// eslint-disable-next-line
export const ButtonLink = withRouter(ButtonLink_);

export const Button = React.forwardRef(
  (
    {
      children,
      pressed,
      primary,
      hover,
      bare,
      style,
      disabled,
      hoveredStyle,
      activeStyle,
      as = 'button',
      ...nativeProps
    },
    ref
  ) => {
    hoveredStyle = [
      bare
        ? { backgroundColor: 'rgba(100, 100, 100, .15)' }
        : { ...styles.shadow },
      hoveredStyle
    ];
    activeStyle = [
      bare
        ? { backgroundColor: 'rgba(100, 100, 100, .25)' }
        : {
            transform: 'translateY(1px)',
            boxShadow:
              !bare &&
              (primary
                ? '0 1px 4px 0 rgba(0,0,0,0.3)'
                : '0 1px 4px 0 rgba(0,0,0,0.2)'),
            transition: 'none'
          },
      activeStyle
    ];

    let Component = as;
    let buttonStyle = [
      {
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: bare ? '5px' : '5px 10px',
        margin: 0,
        overflow: 'hidden',
        display: 'flex',
        borderRadius: 4,
        backgroundColor: bare
          ? 'transparent'
          : primary
          ? disabled
            ? colors.n7
            : colors.p5
          : 'white',
        border: bare
          ? 'none'
          : '1px solid ' +
            (primary ? (disabled ? colors.n7 : colors.p5) : colors.n9),
        color: primary ? 'white' : disabled ? colors.n6 : colors.n1,
        transition: 'box-shadow .25s',
        ...styles.smallText
      },
      { ':hover': !disabled && hoveredStyle },
      { ':active': !disabled && activeStyle },
      hover && hoveredStyle,
      pressed && activeStyle,
      style
    ];

    return (
      <Component
        ref={ref}
        {...(typeof as === 'string'
          ? css(buttonStyle)
          : { style: buttonStyle })}
        disabled={disabled}
        {...nativeProps}
      >
        {children}
      </Component>
    );
  }
);

export const ButtonWithLoading = React.forwardRef((props, ref) => {
  let { loading, children, ...buttonProps } = props;
  return (
    <Button
      {...buttonProps}
      style={[{ position: 'relative' }, buttonProps.style]}
    >
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Loading
            color="currentColor"
            style={{ width: 20, height: 20, color: 'currentColor' }}
          />
        </View>
      )}
      <View
        style={{
          opacity: loading ? 0 : 1,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        {children}
      </View>
    </Button>
  );
});

const defaultInputStyle = {
  outline: 0,
  backgroundColor: 'white',
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid #d0d0d0'
};

export function Input({
  style,
  inputRef,
  onEnter,
  onUpdate,
  focused,
  ...nativeProps
}) {
  let ref = useRef();
  useProperFocus(ref, focused);

  return (
    <input
      ref={inputRef ? mergeRefs([inputRef, ref]) : ref}
      {...css(
        defaultInputStyle,
        {
          ':focus': {
            border: '1px solid ' + colors.b5,
            boxShadow: '0 1px 1px ' + colors.b7
          },
          '::placeholder': { color: colors.n7 }
        },
        styles.smallText,
        style
      )}
      {...nativeProps}
      onKeyDown={e => {
        if (e.keyCode === 13 && onEnter) {
          onEnter(e);
        }

        nativeProps.onKeyDown && nativeProps.onKeyDown(e);
      }}
      onChange={e => {
        if (onUpdate) {
          onUpdate(e.target.value);
        }
        nativeProps.onChange && nativeProps.onChange(e);
      }}
    />
  );
}

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
          alignItems: 'center'
        },
        focused && {
          border: '1px solid ' + colors.b5,
          boxShadow: '0 1px 1px ' + colors.b7
        },
        style,
        getStyle && getStyle(focused)
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
              color: 'inherit'
            }
          }
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
          paddingRight: 17
        },
        highlighted && { backgroundColor: colors.p6 },
        props.style
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
              outline: 'none'
            }
          },
          style
        )}
        {...nativeProps}
      >
        {children}
      </select>
    );
  }
);

export function CustomSelect({ options, value, onChange, style }) {
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
            <ListboxOption key={value} value={value}>
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
  let el = useRef(null);
  let items = allItems.filter(x => x);
  let [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    el.current.focus();

    let onKeyDown = e => {
      const UP = 38;
      const DOWN = 40;
      const ENTER = 13;

      let filteredItems = items.filter(
        item => item && item !== Menu.line && item.type !== Menu.label
      );
      let currentIndex = filteredItems.indexOf(items[hoveredIndex]);

      let transformIndex = idx => items.indexOf(filteredItems[idx]);

      switch (e.keyCode) {
        case UP:
          e.preventDefault();
          setHoveredIndex(
            hoveredIndex === null
              ? 0
              : transformIndex(Math.max(currentIndex - 1, 0))
          );
          break;
        case DOWN:
          e.preventDefault();
          setHoveredIndex(
            hoveredIndex === null
              ? 0
              : transformIndex(
                  Math.min(currentIndex + 1, filteredItems.length - 1)
                )
          );
          break;
        case ENTER:
          e.preventDefault();
          if (hoveredIndex !== null) {
            onMenuSelect && onMenuSelect(items[hoveredIndex].name);
          }
          break;
        default:
      }
    };

    el.current.addEventListener('keydown', onKeyDown);

    return () => {
      el.current.removeEventListener('keydown', onKeyDown);
    };
  }, [hoveredIndex]);

  return (
    <View
      style={{ outline: 'none', borderRadius: 4, overflow: 'hidden' }}
      tabIndex={1}
      innerRef={el}
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
              style={{
                color: colors.n6,
                fontSize: 11,
                lineHeight: '1em',
                textTransform: 'uppercase',
                margin: '3px 9px'
              }}
            >
              {item.name}
            </Text>
          );
        }

        let lastItem = items[idx - 1];

        return (
          <View
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
                alignItems: 'center'
              },
              item.disabled && { color: colors.n7 },
              !item.disabled &&
                hoveredIndex === idx && { backgroundColor: colors.n10 }
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
                  style: { marginRight: 7, width: 10 }
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
    overflow: 'hidden'
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
          leftStyle
        ]}
      >
        {left}
      </Block>
      <Block
        style={[
          { flex: 1, textAlign: 'right' },
          truncate === 'right' && truncateStyle,
          rightStyle
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

function ModalContent({
  style,
  size,
  noAnimation,
  isCurrent,
  stackIndex,
  children
}) {
  let contentRef = useRef(null);
  let mounted = useRef(false);
  let rotateFactor = useRef(Math.random() * 10 - 5);

  useLayoutEffect(() => {
    if (contentRef.current == null) {
      return;
    }

    function setProps() {
      if (isCurrent) {
        contentRef.current.style.transform = 'translateY(0px) scale(1)';
        contentRef.current.style.pointerEvents = 'auto';
      } else {
        contentRef.current.style.transform = `translateY(-40px) scale(.95) rotate(${rotateFactor.current}deg)`;
        contentRef.current.style.pointerEvents = 'none';
      }
    }

    if (!mounted.current) {
      if (noAnimation) {
        contentRef.current.style.opacity = 1;
        contentRef.current.style.transform = 'translateY(0px) scale(1)';

        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.style.transition =
              'opacity .1s, transform .1s cubic-bezier(.42, 0, .58, 1)';
          }
        }, 0);
      } else {
        contentRef.current.style.opacity = 0;
        contentRef.current.style.transform = 'translateY(10px) scale(1)';

        setTimeout(() => {
          if (contentRef.current) {
            mounted.current = true;
            contentRef.current.style.transition =
              'opacity .1s, transform .1s cubic-bezier(.42, 0, .58, 1)';
            contentRef.current.style.opacity = 1;
            setProps();
          }
        }, 0);
      }
    } else {
      setProps();
    }
  }, [noAnimation, isCurrent, stackIndex]);

  return (
    <View
      innerRef={contentRef}
      style={[
        style,
        size && { width: size.width, height: size.height },
        noAnimation && !isCurrent && { display: 'none' }
      ]}
    >
      {children}
    </View>
  );
}

export function Modal({
  title,
  isCurrent,
  isHidden,
  size,
  padding = 20,
  showHeader = true,
  showTitle = true,
  showClose = true,
  showOverlay = true,
  loading = false,
  noAnimation = false,
  focusAfterClose = true,
  stackIndex,
  parent,
  style,
  contentStyle,
  overlayStyle,
  children,
  onClose
}) {
  useEffect(() => {
    // This deactivates any key handlers in the "app" scope. Ideally
    // each modal would have a name so they could each have their own
    // key handlers, but we'll do that later
    let prevScope = hotkeys.getScope();
    hotkeys.setScope('modal');
    return () => hotkeys.setScope(prevScope);
  }, []);

  return (
    <ReactModal
      isOpen={true}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={false}
      shouldFocusAfterRender={!global.IS_DESIGN_MODE}
      shouldReturnFocusAfterClose={focusAfterClose}
      appElement={document.querySelector('#root')}
      parentSelector={parent && (() => parent)}
      style={{
        content: {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
          border: 0,
          fontSize: 14,
          backgroundColor: 'transparent',
          padding: 0,
          pointerEvents: 'auto',
          ...contentStyle
        },
        overlay: {
          zIndex: 3000,
          backgroundColor:
            showOverlay && stackIndex === 0 ? 'rgba(0, 0, 0, .1)' : 'none',
          pointerEvents: showOverlay ? 'auto' : 'none',
          ...overlayStyle,
          ...(parent
            ? {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }
            : {})
        }
      }}
    >
      <ModalContent
        noAnimation={noAnimation}
        isCurrent={isCurrent}
        size={size}
        style={[
          {
            willChange: 'opacity, transform',
            minWidth: '100%',
            minHeight: 0,
            borderRadius: 4,
            backgroundColor: 'white',
            opacity: isHidden ? 0 : 1,
            [`@media (min-width: ${tokens.breakpoint_narrow})`]: {
              minWidth: tokens.breakpoint_narrow
            }
          },
          styles.shadowLarge,
          style,
          styles.lightScrollbar
        ]}
      >
        {showHeader && (
          <View
            style={{
              padding: 20,
              position: 'relative',
              flexShrink: 0
            }}
          >
            {showTitle && (
              <View
                style={{
                  color: colors.n2,
                  flex: 1,
                  alignSelf: 'center',
                  textAlign: 'center',
                  // We need to force a width for the text-overflow
                  // ellipses to work because we are aligning center.
                  // This effectively gives it a padding of 20px
                  width: 'calc(100% - 40px)'
                }}
              >
                <Text
                  style={{
                    fontSize: 25,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {title}
                </Text>
              </View>
            )}

            <View
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  marginRight: 15
                }}
              >
                {showClose && (
                  <Button
                    bare
                    onClick={e => onClose()}
                    style={{ padding: '10px 10px' }}
                    aria-label="Close"
                  >
                    <Delete width={10} />
                  </Button>
                )}
              </View>
            </View>
          </View>
        )}
        <View style={{ padding, paddingTop: 0, flex: 1 }}>
          {typeof children === 'function' ? children() : children}
        </View>
        {loading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, .6)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <Loading style={{ width: 20, height: 20 }} color={colors.n1} />
          </View>
        )}
      </ModalContent>
    </ReactModal>
  );
}

export function ModalButtons({
  style,
  leftContent,
  focusButton = false,
  children
}) {
  let containerRef = useRef(null);

  useEffect(() => {
    if (focusButton && containerRef.current) {
      let button = containerRef.current.querySelector(
        'button:not([data-hidden])'
      );

      if (button) {
        button.focus();
      }
    }
  }, [focusButton]);

  return (
    <View
      innerRef={containerRef}
      style={[
        {
          flexDirection: 'row',
          marginTop: 30
        },
        style
      ]}
    >
      {leftContent}
      <View style={{ flex: 1 }} />
      {children}
    </View>
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
          width
        },
        style
      )}
    >
      <div
        style={{
          width: labelWidth || 75,
          textAlign: 'right',
          paddingRight: 10
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

export class HoverTarget extends React.Component {
  state = { hovered: false };

  onMouseEnter = () => {
    if (!this.props.disabled) {
      this.setState({ hovered: true });
    }
  };

  onMouseLeave = () => {
    if (!this.props.disabled) {
      this.setState({ hovered: false });
    }
  };

  componentDidUpdate(prevProps) {
    let { disabled } = this.props;
    if (disabled && this.state.hovered) {
      this.setState({ hovered: false });
    }
  }

  render() {
    let { style, contentStyle, children, renderContent } = this.props;
    return (
      <View style={style}>
        <View
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
          style={contentStyle}
        >
          {children}
        </View>
        {this.state.hovered && renderContent()}
      </View>
    );
  }
}

export class TooltipTarget extends React.Component {
  state = { clicked: false };

  render() {
    return (
      <View style={[{ position: 'relative' }, this.props.style]}>
        <View
          style={{ flex: 1 }}
          onClick={() => this.setState({ clicked: true })}
        >
          {this.props.children}
        </View>
        {this.state.clicked &&
          this.props.renderContent(() => this.setState({ clicked: false }))}
      </View>
    );
  }
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
          marginBottom: 2
        },
        style
      ]}
    >
      {title}
    </Text>
  );
}

export * from './tooltips';
export { useTooltip } from './tooltips';
