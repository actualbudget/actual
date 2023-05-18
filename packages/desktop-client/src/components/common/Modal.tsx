import React, {
  type ReactNode,
  useEffect,
  useRef,
  useLayoutEffect,
} from 'react';
import ReactModal from 'react-modal';

import type { CSSProperties } from 'glamor';
import hotkeys from 'hotkeys-js';

import Loading from '../../icons/AnimatedLoading';
import Delete from '../../icons/v0/Delete';
import { styles, colors } from '../../style';
import tokens from '../../tokens';

import Button from './Button';
import Text from './Text';
import View from './View';

export type ModalProps = {
  title: string;
  isCurrent?: boolean;
  isHidden?: boolean;
  children: ReactNode | (() => ReactNode);
  size?: { width?: number; height?: number };
  padding?: number;
  showHeader?: boolean;
  showTitle?: boolean;
  showClose?: boolean;
  showOverlay?: boolean;
  loading?: boolean;
  noAnimation?: boolean;
  focusAfterClose?: boolean;
  stackIndex?: number;
  parent?: HTMLElement;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  overlayStyle?: CSSProperties;
  onClose?: () => void;
};

const Modal = ({
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
  onClose,
}: ModalProps) => {
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
      appElement={document.querySelector('#root') as HTMLElement}
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
          ...contentStyle,
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
                bottom: 0,
              }
            : {}),
        },
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
            [`@media (min-width: ${tokens.breakpoint_small})`]: {
              minWidth: tokens.breakpoint_small,
            },
          },
          styles.shadowLarge,
          style,
          styles.lightScrollbar,
        ]}
      >
        {showHeader && (
          <View
            style={{
              padding: 20,
              position: 'relative',
              flexShrink: 0,
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
                  width: 'calc(100% - 40px)',
                }}
              >
                <Text
                  style={{
                    fontSize: 25,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
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
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  marginRight: 15,
                }}
              >
                {showClose && (
                  <Button
                    bare
                    onClick={onClose}
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
              zIndex: 1000,
            }}
          >
            <Loading style={{ width: 20, height: 20 }} color={colors.n1} />
          </View>
        )}
      </ModalContent>
    </ReactModal>
  );
};

type ModalContentProps = {
  style?: CSSProperties;
  size?: ModalProps['size'];
  noAnimation?: boolean;
  isCurrent?: boolean;
  stackIndex?: number;
  children: ReactNode;
};

const ModalContent = ({
  style,
  size,
  noAnimation,
  isCurrent,
  stackIndex,
  children,
}: ModalContentProps) => {
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
        noAnimation && !isCurrent && { display: 'none' },
      ]}
    >
      {children}
    </View>
  );
};

type ModalButtonsProps = {
  style?: CSSProperties;
  leftContent?: ReactNode;
  focusButton?: boolean;
  children: ReactNode;
};

export const ModalButtons = ({
  style,
  leftContent,
  focusButton = false,
  children,
}: ModalButtonsProps) => {
  let containerRef = useRef(null);

  useEffect(() => {
    if (focusButton && containerRef.current) {
      let button = containerRef.current.querySelector(
        'button:not([data-hidden])',
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
          marginTop: 30,
        },
        style,
      ]}
    >
      {leftContent}
      <View style={{ flex: 1 }} />
      {children}
    </View>
  );
};

export default Modal;
