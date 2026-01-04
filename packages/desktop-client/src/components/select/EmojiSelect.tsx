import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { SvgFlag } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

function defaultShouldSaveFromKey(e: KeyboardEvent<HTMLInputElement>) {
  return e.key === 'Enter';
}

type EmojiSelectProps = {
  value: string | null;
  isOpen?: boolean;
  embedded?: boolean;
  openOnFocus?: boolean;
  shouldSaveFromKey?: (e: KeyboardEvent<HTMLInputElement>) => boolean;
  clearOnBlur?: boolean;
  inputProps?: ComponentProps<typeof Input>;
  onUpdate?: (emoji: string | null) => void;
  onSelect: (emoji: string | null) => void;
};

export function EmojiSelect({
  value,
  isOpen: externalIsOpen,
  embedded = false,
  openOnFocus = true,
  shouldSaveFromKey: shouldSaveFromKeyProp = defaultShouldSaveFromKey,
  clearOnBlur = true,
  inputProps,
  onUpdate: _onUpdate,
  onSelect,
}: EmojiSelectProps) {
  const [open, setOpen] = useState(embedded);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const popoverContentRef = useRef<HTMLDivElement | null>(null);

  const closePicker = useCallback(() => {
    if (!embedded) {
      setOpen(false);
    }
  }, [embedded]);

  // Sync with external isOpen prop if provided (e.g. table cells)
  useEffect(() => {
    if (externalIsOpen === undefined) {
      return;
    }

    if (!externalIsOpen) {
      setOpen(false);
      return;
    }

    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [externalIsOpen]);

  // When a table cell becomes exposed, immediately focus our trigger input.
  useLayoutEffect(() => {
    if (embedded) {
      return;
    }
    if (externalIsOpen) {
      innerRef.current?.focus();
    }
  }, [embedded, externalIsOpen]);

  const handleRemove = useCallback(() => {
    onSelect(null);
    closePicker();
  }, [closePicker, onSelect]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        if (open) {
          if (!embedded) {
            e.stopPropagation();
          }
          closePicker();
        }
        return;
      }

      if (!open && shouldSaveFromKeyProp(e)) {
        // Let the table handle Enter if we're not open.
        inputProps?.onKeyDown?.(e);
        return;
      }

      if (!open) {
        // Any other key opens the picker.
        setOpen(true);
      }
    },
    [closePicker, embedded, inputProps, open, shouldSaveFromKeyProp],
  );

  const maybeWrapPopover = (content: ReactNode) => {
    if (embedded) {
      return open ? content : null;
    }

    return (
      <Popover
        triggerRef={innerRef}
        placement="bottom start"
        offset={2}
        isOpen={open}
        isNonModal
        onOpenChange={() => closePicker()}
        style={styles.popover}
        data-testid="emoji-select-popover"
      >
        {content}
      </Popover>
    );
  };

  const displayValue = value || '';
  const showPlaceholder = !value;

  return (
    <View style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Input
        {...inputProps}
        ref={innerRef}
        autoFocus={!embedded && externalIsOpen === true}
        value={displayValue}
        readOnly
        onPointerUp={() => {
          if (!embedded) {
            if (open) {
              closePicker();
            } else {
              setOpen(true);
            }
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={e => {
          if (!embedded && openOnFocus) {
            setOpen(true);
          }
          inputProps?.onFocus?.(e);
        }}
        onBlur={e => {
          const nextTarget = e.relatedTarget as Node | null;
          if (
            nextTarget &&
            popoverContentRef.current &&
            popoverContentRef.current.contains(nextTarget)
          ) {
            return;
          }

          if (!embedded) {
            closePicker();
          }
          inputProps?.onBlur?.(e);

          if (clearOnBlur && !value) {
            onSelect(null);
          }
        }}
        style={{
          ...inputProps?.style,
          textAlign: 'center',
          fontSize: showPlaceholder ? '14px' : '18px',
          color: showPlaceholder ? theme.tableTextSubdued : theme.tableText,
          cursor: 'pointer',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
          outline: 0,
          padding: 0,
          height: '100%',
          position: 'relative',
          zIndex: 1,
        }}
        aria-label="Flag"
      />

      {showPlaceholder && (
        <View
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <SvgFlag
            style={{
              width: 14,
              height: 14,
              color: theme.tableTextSubdued,
              opacity: 0.5,
            }}
          />
        </View>
      )}

      {maybeWrapPopover(
        <View
          data-emoji-picker
          innerRef={popoverContentRef}
          tabIndex={-1}
          onMouseDownCapture={e => {
            // Keep focus pinned to the cell input so the table stays in edit mode.
            e.preventDefault();
            innerRef.current?.focus();
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.menuAutoCompleteBackground,
            borderRadius: '4px',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Keep spacing/height but hide the label */}
            <View
              aria-hidden="true"
              style={{
                padding: '4px 9px',
                color: 'transparent',
                userSelect: 'none',
                ...styles.smallText,
              }}
            >
              <Trans>Flag</Trans>
            </View>
            <Button
              variant="bare"
              onPress={handleRemove}
              style={{
                padding: '4px 9px',
                color: theme.menuAutoCompleteTextHeader,
                ...styles.smallText,
              }}
            >
              <Trans>Remove</Trans>
            </Button>
          </View>

          <View style={{ padding: '8px' }}>
            <View
              style={{
                padding: '8px',
                color: theme.menuAutoCompleteText,
                ...styles.smallText,
              }}
            >
              <Trans>Emoji picker</Trans>
            </View>
          </View>
        </View>,
      )}
    </View>
  );
}
