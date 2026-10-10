import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  CSSProperties,
  ReactNode,
} from 'react';
import {
  Dialog,
  Modal as ReactAriaModal,
  ModalOverlay as ReactAriaModalOverlay,
} from 'react-aria-components';
import { ErrorBoundary } from 'react-error-boundary';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgLogo } from '@actual-app/components/icons/logo';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { radius, spacing, tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css, keyframes } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useModalState } from '#hooks/useModalState';
import { useReducedMotion } from '#hooks/useReducedMotion';
import { useSwipeToDismiss } from '#hooks/useSwipeToDismiss';
import { collapseModals } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export const MODAL_Z_INDEX = 3000;

const mobileSheetContainerStyle: CSSProperties = {
  minWidth: '100%',
  maxWidth: '100%',
  borderRadius: `${radius.sheet}px ${radius.sheet}px 0 0`,
  ...styles.shadowSheet,
};

const SHEET_EXIT_MS = 180;

const sheetSlideIn = keyframes({
  from: { transform: 'translateY(100%)' },
  to: { transform: 'translateY(0)' },
});

const sheetSlideOut = keyframes({
  to: { transform: 'translateY(100%)' },
});

const overlayFadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const overlayFadeOut = keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });

const mobileSheetModalClassName = css({
  '&[data-entering]': {
    animation: `${sheetSlideIn} 240ms cubic-bezier(0.22, 1, 0.36, 1)`,
  },
  '&[data-exiting]': {
    animation: `${sheetSlideOut} ${SHEET_EXIT_MS}ms ease-in forwards`,
  },
});

const mobileSheetOverlayClassName = css({
  '&[data-entering]': { animation: `${overlayFadeIn} 180ms ease-out` },
  '&[data-exiting]': {
    animation: `${overlayFadeOut} ${SHEET_EXIT_MS}ms ease-in forwards`,
  },
});

const mobileSheetHandleStyle: CSSProperties = {
  width: 36,
  height: 4,
  borderRadius: radius.pill,
  backgroundColor: theme.pageTextSubdued,
  alignSelf: 'center',
  marginTop: spacing.sm,
  marginBottom: spacing.sm,
  flexShrink: 0,
};

type ModalProps = ComponentPropsWithRef<typeof ReactAriaModal> & {
  presentation?: 'dialog' | 'sheet';
  ariaLabelledBy?: string;
  name: string;
  isLoading?: boolean;
  noAnimation?: boolean;
  style?: CSSProperties;
  onClose?: () => void;
  wrapperProps?: {
    style?: CSSProperties;
  };
  containerProps?: {
    style?: CSSProperties;
  };
};

export const Modal = ({
  name,
  isLoading = false,
  noAnimation = false,
  style,
  children,
  onClose,
  wrapperProps,
  containerProps,
  presentation = 'dialog',
  ariaLabelledBy,
  ...props
}: ModalProps) => {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const isSheet = presentation === 'sheet' && isNarrowWidth;
  const { enableScope, disableScope } = useHotkeysContext();

  // This deactivates any key handlers in the "app" scope
  useEffect(() => {
    enableScope(name);
    return () => disableScope(name);
  }, [enableScope, disableScope, name]);

  const { isHidden, isActive, onClose: closeModal } = useModalState();
  const dispatch = useDispatch();
  const prefersReducedMotion = useReducedMotion();
  const isAnimatedSheet = isSheet && !prefersReducedMotion;
  const [isOpen, setIsOpen] = useState(true);
  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleOnClose = () => {
    if (isClosingRef.current) {
      return;
    }
    isClosingRef.current = true;
    const finishClose = () => {
      if (isSheet) {
        dispatch(collapseModals({ rootModalName: name }));
      } else {
        closeModal();
      }
      onClose?.();
    };
    if (isAnimatedSheet) {
      closeTimerRef.current = setTimeout(finishClose, SHEET_EXIT_MS);
      return;
    }
    finishClose();
  };

  const sheetRef = useSwipeToDismiss({
    isEnabled: isSheet,
    onDismiss: () => {
      setIsOpen(false);
      handleOnClose();
    },
  });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <ReactAriaModalOverlay
        data-testid={`${name}-modal`}
        className={isAnimatedSheet ? mobileSheetOverlayClassName : undefined}
        isDismissable
        isOpen={isOpen}
        onOpenChange={nextIsOpen => {
          setIsOpen(nextIsOpen);
          if (!nextIsOpen) {
            handleOnClose();
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: MODAL_Z_INDEX,
          fontSize: 14,
          // on mobile, we disable the blurred background for performance reasons
          ...(isNarrowWidth
            ? {
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }
            : {
                backdropFilter: 'blur(1px) brightness(0.9)',
              }),
          ...style,
        }}
        {...props}
      >
        {/* A container for positioning the modal relative to the visual viewport */}
        <View
          style={{
            display: 'flex',
            ...(isSheet
              ? { alignItems: 'stretch', justifyContent: 'flex-end' }
              : { alignItems: 'center', justifyContent: 'center' }),
            height: 'var(--visual-viewport-height)',
            overflowY: 'auto',
            ...wrapperProps?.style,
          }}
        >
          <ReactAriaModal
            ref={sheetRef}
            className={isAnimatedSheet ? mobileSheetModalClassName : undefined}
          >
            {modalProps => (
              <Dialog
                aria-label={ariaLabelledBy ? undefined : t('Modal dialog')}
                aria-labelledby={ariaLabelledBy}
                className={css(styles.lightScrollbar)}
                style={{
                  outline: 'none', // remove focus outline
                }}
              >
                <ModalContentContainer
                  noAnimation={noAnimation || isSheet}
                  isActive={isActive(name)}
                  {...containerProps}
                  style={{
                    flex: 1,
                    padding: 10,
                    willChange: isSheet ? undefined : 'opacity, transform',
                    maxWidth: '90vw',
                    minWidth: '90vw',
                    maxHeight: 'calc(var(--visual-viewport-height) * 0.9)',
                    minHeight: 0,
                    borderRadius: 6,
                    //border: '1px solid ' + theme.modalBorder,
                    color: theme.pageText,
                    backgroundColor: theme.modalBackground,
                    opacity: isHidden ? 0 : 1,
                    [`@media (min-width: ${tokens.breakpoint_small})`]: {
                      minWidth: tokens.breakpoint_small,
                    },
                    overflowY: 'auto',
                    ...styles.shadowLarge,
                    ...(isSheet && mobileSheetContainerStyle),
                    ...containerProps?.style,
                  }}
                >
                  {isSheet && <View style={mobileSheetHandleStyle} />}
                  <View style={{ paddingTop: 0, flex: 1, flexShrink: 0 }}>
                    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
                      {typeof children === 'function'
                        ? children(modalProps)
                        : children}
                    </ErrorBoundary>
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
                </ModalContentContainer>
              </Dialog>
            )}
          </ReactAriaModal>
        </View>
      </ReactAriaModalOverlay>
    </ErrorBoundary>
  );
};

type ModalContentContainerProps = {
  style?: CSSProperties;
  noAnimation?: boolean;
  isActive?: boolean;
  children: ReactNode;
};

const ModalContentContainer = ({
  style,
  noAnimation,
  isActive,
  children,
}: ModalContentContainerProps) => {
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

      if (isActive) {
        contentRef.current.style.transform = 'none';
        contentRef.current.style.willChange = 'auto';
        contentRef.current.style.pointerEvents = 'auto';
      } else {
        contentRef.current.style.transform = `translateY(-40px) scale(.95) rotate(${rotateFactor.current}deg)`;
        contentRef.current.style.pointerEvents = 'none';
      }
    }

    if (!mounted.current) {
      if (noAnimation) {
        contentRef.current.style.opacity = '1';
        contentRef.current.style.transform = 'none';

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
  }, [noAnimation, isActive]);

  return (
    <View
      innerRef={contentRef}
      style={{
        ...style,
        ...(noAnimation && !isActive && { display: 'none' }),
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
  const { t } = useTranslation();
  return (
    <h1
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        height: 60,
        flex: 'none',
        display: 'flex',
        margin: 0,
        padding: 0,
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
              aria-label={t('Modal logo')}
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
    </h1>
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
      ref={inputRef}
      style={{
        fontSize: 25,
        fontWeight: 700,
        textAlign: 'center',
        ...style,
      }}
      defaultValue={title}
      onUpdate={_onTitleUpdate}
      onEnter={(value, e) => {
        e.preventDefault();
        _onTitleUpdate?.(value);
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
  onPress: ComponentPropsWithoutRef<typeof Button>['onPress'];
  style?: CSSProperties;
};

export function ModalCloseButton({ onPress, style }: ModalCloseButtonProps) {
  const { t } = useTranslation();
  return (
    <Button
      variant="bare"
      onPress={onPress}
      style={{ padding: '10px 10px' }}
      aria-label={t('Close')}
    >
      <SvgDelete width={10} style={style} />
    </Button>
  );
}
