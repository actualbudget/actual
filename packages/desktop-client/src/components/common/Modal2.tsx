import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
  type ReactNode,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
} from 'react';
import {
  ModalOverlay as ReactAriaModalOverlay,
  Modal as ReactAriaModal,
  Dialog,
} from 'react-aria-components';
import { useHotkeysContext } from 'react-hotkeys-hook';

import { AutoTextSize } from 'auto-text-size';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { SvgLogo } from '../../icons/logo';
import { SvgDelete } from '../../icons/v0';
import { type CSSProperties, styles, theme } from '../../style';
import { tokens } from '../../tokens';

import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';
import { TextOneLine } from './TextOneLine';
import { View } from './View';

export type ModalProps = ComponentPropsWithRef<typeof ReactAriaModal> & {
  children: ReactNode | (({ close }: { close: () => void }) => ReactNode);
  isCurrent?: boolean;
  isHidden?: boolean;
  isLoading?: boolean;
  stackIndex?: number;
  size?: { width?: CSSProperties['width']; height?: CSSProperties['height'] };
  padding?: CSSProperties['padding'];
  noAnimation?: boolean;
  style?: CSSProperties;
  onClose?: () => void;
};

export const Modal = ({
  isCurrent,
  isHidden,
  isLoading = false,
  stackIndex,
  size,
  padding = 10,
  noAnimation = false,
  style,
  children,
  onClose,
  ...props
}: ModalProps) => {
  const { enableScope, disableScope } = useHotkeysContext();

  // This deactivates any key handlers in the "app" scope
  const scopeId = `modal-${stackIndex}`;
  useEffect(() => {
    enableScope(scopeId);
    return () => disableScope(scopeId);
  }, [enableScope, disableScope, scopeId]);

  return (
    <ReactAriaModalOverlay
      isDismissable
      defaultOpen={true}
      onOpenChange={isOpen => !isOpen && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      {...props}
    >
      <ReactAriaModal>
        <Dialog aria-label="Modal Dialog">
          {({ close }) => (
            <ModalContent
              noAnimation={noAnimation}
              isCurrent={isCurrent}
              size={size}
              style={{
                flex: 1,
                padding,
                willChange: 'opacity, transform',
                maxWidth: '90vw',
                minWidth: '90vw',
                maxHeight: '90vh',
                minHeight: 0,
                borderRadius: 6,
                //border: '1px solid ' + theme.modalBorder,
                color: theme.pageText,
                backgroundColor: theme.modalBackground,
                opacity: isHidden ? 0 : 1,
                [`@media (min-width: ${tokens.breakpoint_small})`]: {
                  minWidth: tokens.breakpoint_small,
                },
                ...styles.shadowLarge,
                ...styles.lightScrollbar,
                ...style,
              }}
            >
              <View style={{ paddingTop: 0, flex: 1 }}>
                {typeof children === 'function'
                  ? children({ close })
                  : children}
              </View>
              {isLoading && (
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
          )}
        </Dialog>
      </ReactAriaModal>
    </ReactAriaModalOverlay>
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
  const contentRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const rotateFactor = useRef(Math.random() * 10 - 5);

  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    function setProps() {
      if (!contentRef.current) {
        return;
      }

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
        contentRef.current.style.opacity = '1';
        contentRef.current.style.transform = 'translateY(0px) scale(1)';

        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.style.transition =
              'opacity .1s, transform .1s cubic-bezier(.42, 0, .58, 1)';
          }
        }, 0);
      } else {
        contentRef.current.style.opacity = '0';
        contentRef.current.style.transform = 'translateY(10px) scale(1)';

        setTimeout(() => {
          if (contentRef.current) {
            mounted.current = true;
            contentRef.current.style.transition =
              'opacity .1s, transform .1s cubic-bezier(.42, 0, .58, 1)';
            contentRef.current.style.opacity = '1';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusButton && containerRef.current) {
      const button = containerRef.current.querySelector<HTMLButtonElement>(
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

type ModalHeaderProps = {
  leftContent?: ReactNode;
  showLogo?: boolean;
  title?: ReactNode;
  rightContent?: ReactNode;
};

export function ModalHeader({
  leftContent,
  showLogo,
  title,
  rightContent,
}: ModalHeaderProps) {
  return (
    <View
      aria-label="Modal Header"
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        height: 60,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
        }}
      >
        {leftContent}
      </View>

      {(title || showLogo) && (
        <View
          style={{
            textAlign: 'center',
            // We need to force a width for the text-overflow
            // ellipses to work because we are aligning center.
            width: 'calc(100% - 60px)',
          }}
        >
          {showLogo && (
            <SvgLogo
              width={30}
              height={30}
              style={{ justifyContent: 'center', alignSelf: 'center' }}
            />
          )}
          {title &&
            (typeof title === 'string' || typeof title === 'number' ? (
              <ModalTitle title={`${title}`} />
            ) : (
              title
            ))}
        </View>
      )}

      {rightContent && (
        <View
          style={{
            position: 'absolute',
            right: 0,
          }}
        >
          {rightContent}
        </View>
      )}
    </View>
  );
}

type ModalTitleProps = {
  title: string;
  isEditable?: boolean;
  getStyle?: (isEditing: boolean) => CSSProperties;
  onEdit?: (isEditing: boolean) => void;
  onTitleUpdate?: (newName: string) => void;
  shrinkOnOverflow?: boolean;
};

export function ModalTitle({
  title,
  isEditable,
  getStyle,
  onTitleUpdate,
  shrinkOnOverflow = false,
}: ModalTitleProps) {
  const [isEditing, setIsEditing] = useState(false);

  const onTitleClick = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };

  const _onTitleUpdate = (newTitle: string) => {
    if (newTitle !== title) {
      onTitleUpdate?.(newTitle);
    }
    setIsEditing(false);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) {
      if (inputRef.current) {
        inputRef.current.scrollLeft = 0;
      }
    }
  }, [isEditing]);

  const style = getStyle?.(isEditing);

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
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {shrinkOnOverflow ? (
        <AutoTextSize
          as={Text}
          minFontSizePx={15}
          maxFontSizePx={25}
          onClick={onTitleClick}
          style={{
            fontSize: 25,
            fontWeight: 700,
            textAlign: 'center',
            ...(isEditable && styles.underlinedText),
            ...style,
          }}
        >
          {title}
        </AutoTextSize>
      ) : (
        <TextOneLine
          onClick={onTitleClick}
          style={{
            fontSize: 25,
            fontWeight: 700,
            textAlign: 'center',
            ...(isEditable && styles.underlinedText),
            ...style,
          }}
        >
          {title}
        </TextOneLine>
      )}
    </View>
  );
}

type ModalCloseButtonProps = {
  onClick: ComponentPropsWithoutRef<typeof Button>['onClick'];
  style?: CSSProperties;
};

export function ModalCloseButton({ onClick, style }: ModalCloseButtonProps) {
  return (
    <Button
      type="bare"
      onClick={onClick}
      style={{ padding: '10px 10px' }}
      aria-label="Close"
    >
      <SvgDelete width={10} style={style} />
    </Button>
  );
}
