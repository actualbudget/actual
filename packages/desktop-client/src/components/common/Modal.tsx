// @ts-strict-ignore
import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  type ReactNode,
  useState,
} from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import ReactModal from 'react-modal';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { SvgLogo } from '../../icons/logo';
import { SvgDelete } from '../../icons/v0';
import { useResponsive } from '../../ResponsiveProvider';
import { type CSSProperties, styles, theme } from '../../style';
import { tokens } from '../../tokens';

import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';
import { View } from './View';

export type ModalProps = {
  title?: ReactNode;
  isCurrent?: boolean;
  isHidden?: boolean;
  children: ReactNode | (() => ReactNode);
  size?: { width?: CSSProperties['width']; height?: CSSProperties['height'] };
  padding?: CSSProperties['padding'];
  showHeader?: boolean;
  leftHeaderContent?: ReactNode;
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

export const Modal = ({
  title,
  isCurrent,
  isHidden,
  size,
  padding = 20,
  showHeader = true,
  leftHeaderContent,
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
  const { isNarrowWidth } = useResponsive();
  const { enableScope, disableScope } = useHotkeysContext();

  // This deactivates any key handlers in the "app" scope
  const scopeId = `modal-${stackIndex}-${title}`;
  useEffect(() => {
    enableScope(scopeId);
    return () => disableScope(scopeId);
  }, [enableScope, disableScope, scopeId]);

  return (
    <ReactModal
      isOpen={true}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={true}
      shouldFocusAfterRender
      shouldReturnFocusAfterClose={focusAfterClose}
      appElement={document.querySelector('#root') as HTMLElement}
      parentSelector={parent && (() => parent)}
      style={{
        content: {
          display: 'flex',
          height: 'fit-content',
          width: 'fit-content',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
          border: 0,
          fontSize: 14,
          backgroundColor: 'transparent',
          padding: 0,
          pointerEvents: 'auto',
          margin: 'auto',
          ...contentStyle,
        },
        overlay: {
          display: 'flex',
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
        style={{
          willChange: 'opacity, transform',
          maxWidth: '90vw',
          minWidth: '90vw',
          minHeight: 0,
          borderRadius: 4,
          //border: '1px solid ' + theme.modalBorder,
          color: theme.pageText,
          backgroundColor: theme.modalBackground,
          opacity: isHidden ? 0 : 1,
          [`@media (min-width: ${tokens.breakpoint_small})`]: {
            minWidth: tokens.breakpoint_small,
          },
          ...styles.shadowLarge,
          ...style,
          ...styles.lightScrollbar,
        }}
      >
        {showHeader && (
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
              position: 'relative',
              height: 80,
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                marginRight: !isNarrowWidth ? 5 : undefined,
                marginLeft: !isNarrowWidth ? 15 : undefined,
              }}
            >
              {leftHeaderContent}
            </View>

            {showTitle && (
              <View
                style={{
                  textAlign: 'center',
                  // We need to force a width for the text-overflow
                  // ellipses to work because we are aligning center.
                  // This effectively gives it a padding of 20px
                  width: 'calc(100% - 40px)',
                }}
              >
                {!title ? (
                  <SvgLogo
                    width={30}
                    height={30}
                    style={{ justifyContent: 'center', alignSelf: 'center' }}
                  />
                ) : typeof title === 'string' || typeof title === 'number' ? (
                  <ModalTitle title={`${title}`} />
                ) : (
                  title
                )}
              </View>
            )}

            <View
              style={{
                position: 'absolute',
                right: 0,
                marginRight: !isNarrowWidth ? 15 : undefined,
                marginLeft: !isNarrowWidth ? 5 : undefined,
              }}
            >
              {showClose && (
                <Button
                  type="bare"
                  onClick={onClose}
                  style={{ padding: 10 }}
                  aria-label="Close"
                >
                  <SvgDelete width={10} style={{ color: 'inherit' }} />
                </Button>
              )}
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
              backgroundColor: theme.pageBackground,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <AnimatedLoading
              style={{ width: 20, height: 20 }}
              color={theme.pageText}
            />
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
  const contentRef = useRef(null);
  const mounted = useRef(false);
  const rotateFactor = useRef(Math.random() * 10 - 5);

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
      style={{
        ...style,
        ...(size && { width: size.width, height: size.height }),
        ...(noAnimation && !isCurrent && { display: 'none' }),
      }}
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
  const containerRef = useRef(null);

  useEffect(() => {
    if (focusButton && containerRef.current) {
      const button = containerRef.current.querySelector(
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
      style={{
        flexDirection: 'row',
        marginTop: 30,
        ...style,
      }}
    >
      {leftContent}
      <View style={{ flex: 1 }} />
      {children}
    </View>
  );
};

type ModalTitleProps = {
  title: string;
  isEditable?: boolean;
  getStyle?: (isEditing: boolean) => CSSProperties;
  onEdit?: (isEditing: boolean) => void;
  onTitleUpdate?: (newName: string) => void;
};

export function ModalTitle({
  title,
  isEditable,
  getStyle,
  onTitleUpdate,
}: ModalTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const style = getStyle?.(isEditing);

  const _onEdit = () => {
    if (!isEditable) {
      return;
    }

    setIsEditing(true);
  };

  const _onTitleUpdate = newTitle => {
    if (newTitle !== title) {
      onTitleUpdate?.(newTitle);
    }
    setIsEditing(false);
  };

  const inputRef = useRef<HTMLInputElement>();
  useEffect(() => {
    if (isEditing) {
      if (inputRef.current) {
        inputRef.current.scrollLeft = 0;
      }
    }
  }, [isEditing]);

  return isEditing ? (
    <Input
      inputRef={inputRef}
      style={{
        fontSize: 25,
        fontWeight: 700,
        textAlign: 'center',
        ...style,
      }}
      focused={isEditing}
      defaultValue={title}
      onUpdate={_onTitleUpdate}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          _onTitleUpdate?.(e.currentTarget.value);
        }
      }}
    />
  ) : (
    <Text
      style={{
        fontSize: 25,
        fontWeight: 700,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...(isEditable && styles.underlinedText),
        ...style,
      }}
      onClick={_onEdit}
    >
      {title}
    </Text>
  );
}
