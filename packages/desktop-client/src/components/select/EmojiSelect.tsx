import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Trans } from 'react-i18next';

import data, { type EmojiMartData } from '@emoji-mart/data';

const emojiData = data as EmojiMartData;

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

type EmojiData = {
  id: string;
  name: string;
  native: string;
  keywords?: string[];
  shortcodes?: string;
};

type EmojiMartEmoji = {
  id: string;
  name: string;
  skins?: Array<{ native?: string }>;
  keywords?: string[];
  shortcodes?: string;
};

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
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiData | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const emojiGridRef = useRef<HTMLDivElement | null>(null);
  const popoverContentRef = useRef<HTMLDivElement | null>(null);

  // Grid layout constants
  const emojisPerRow = 7;
  const emojiSize = 24;
  const emojiGap = 4;
  const maxVisibleRows = 3;
  const gridPaddingY = 8; // 4px top + 4px bottom
  // Ensure 3 full rows are visible *inside* the grid, accounting for padding.
  const maxHeight =
    maxVisibleRows * emojiSize + (maxVisibleRows - 1) * emojiGap + gridPaddingY;
  // Fix width so hover (footer text) doesn't cause popover resizing/flicker
  const gridContentWidth =
    emojisPerRow * emojiSize +
    (emojisPerRow - 1) * emojiGap +
    // grid padding left+right
    8;
  // Keep things tight (user requested) but still leave a small margin.
  const popoverWidth = Math.max(225, gridContentWidth + 12);

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

  // Flatten all emojis into a single list
  const allEmojis = useMemo(() => {
    const emojis: EmojiData[] = [];
    if (emojiData && emojiData.emojis) {
      Object.values(emojiData.emojis).forEach(emoji => {
        const e = emoji as EmojiMartEmoji;
        // Get the base emoji (first skin tone or default)
        const baseSkin = e.skins?.[0];
        if (baseSkin?.native) {
          emojis.push({
            id: e.id,
            name: e.name,
            native: baseSkin.native,
            keywords: e.keywords || [],
            shortcodes: e.shortcodes,
          });
        }
      });
    }
    return emojis;
  }, []);

  // For commit 3, no search yet - just return all emojis
  const filteredEmojis = allEmojis;

  const handleRemove = useCallback(() => {
    onSelect(null);
    closePicker();
  }, [closePicker, onSelect]);

  const handleNavigate = useCallback(
    (key: string) => {
      const currentIndex = focusedIndex ?? -1;
      let newIndex = currentIndex;

      if (key === 'ArrowRight') {
        newIndex = Math.min(currentIndex + 1, filteredEmojis.length - 1);
      } else if (key === 'ArrowLeft') {
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (key === 'ArrowDown') {
        newIndex = Math.min(
          currentIndex + emojisPerRow,
          filteredEmojis.length - 1,
        );
      } else if (key === 'ArrowUp') {
        newIndex = Math.max(currentIndex - emojisPerRow, 0);
      }

      setFocusedIndex(newIndex);

      // Scroll focused emoji into view
      if (emojiGridRef.current && newIndex >= 0) {
        const emojiElement = emojiGridRef.current.querySelector(
          `[data-emoji-index="${newIndex}"]`,
        ) as HTMLElement | null;
        emojiElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    [emojisPerRow, filteredEmojis.length, focusedIndex],
  );

  const handleEmojiSelect = useCallback(
    (emoji: EmojiData) => {
      onSelect(emoji.native);
      closePicker();
    },
    [closePicker, onSelect],
  );

  // Keyboard navigation for emoji grid (arrow keys, enter)
  const handleGridKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleNavigate(e.key);
      } else if (e.key === 'Enter') {
        if (
          focusedIndex !== null &&
          focusedIndex >= 0 &&
          focusedIndex < filteredEmojis.length
        ) {
          e.preventDefault();
          e.stopPropagation();
          handleEmojiSelect(filteredEmojis[focusedIndex]);
        }
      }
    },
    [focusedIndex, filteredEmojis, handleEmojiSelect, handleNavigate],
  );

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

      if (open && e.key === 'Enter') {
        if (
          focusedIndex !== null &&
          focusedIndex >= 0 &&
          focusedIndex < filteredEmojis.length
        ) {
          e.preventDefault();
          e.stopPropagation();
          handleEmojiSelect(filteredEmojis[focusedIndex]);
          return;
        }
      }

      if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        handleNavigate(e.key);
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
    [closePicker, embedded, focusedIndex, filteredEmojis, handleEmojiSelect, handleNavigate, inputProps, open, shouldSaveFromKeyProp],
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
        style={{
          ...styles.popover,
          width: popoverWidth,
          minWidth: popoverWidth,
          maxWidth: popoverWidth,
        }}
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
          onMouseLeave={() => {
            setHoveredEmoji(null);
            setFocusedIndex(null);
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

          {/* Emoji grid */}
          <View
            ref={emojiGridRef}
            onKeyDown={handleGridKeyDown}
            tabIndex={0}
            style={{
              maxHeight: `${maxHeight}px`,
              overflowY: 'auto',
              padding: '4px',
              display: 'grid',
              gridTemplateColumns: `repeat(${emojisPerRow}, ${emojiSize}px)`,
              gap: `${emojiGap}px`,
              justifyContent: 'center',
              outline: 'none',
            }}
            onMouseMove={e => {
              const el = (e.target as HTMLElement).closest(
                'button[data-emoji-index]',
              ) as HTMLButtonElement | null;
              if (!el) {
                return;
              }

              const idxRaw = el.getAttribute('data-emoji-index');
              const idx = idxRaw ? Number(idxRaw) : NaN;
              if (
                !Number.isFinite(idx) ||
                idx < 0 ||
                idx >= filteredEmojis.length
              ) {
                return;
              }

              const emoji = filteredEmojis[idx];
              setHoveredEmoji(emoji);
              setFocusedIndex(idx);
            }}
            onMouseLeave={() => {
              setHoveredEmoji(null);
              setFocusedIndex(null);
            }}
          >
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji.id}-${index}`}
                data-emoji-index={index}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                onMouseEnter={() => setHoveredEmoji(emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
                style={{
                  width: `${emojiSize}px`,
                  height: `${emojiSize}px`,
                  fontSize: `${emojiSize}px`,
                  lineHeight: `${emojiSize}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    focusedIndex === index
                      ? theme.menuItemBackgroundHover
                      : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background-color 0.1s',
                }}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => {
                  // Only clear focus if not moving to another emoji
                  if (focusedIndex === index) {
                    setFocusedIndex(null);
                  }
                }}
              >
                {emoji.native}
              </button>
            ))}
          </View>

          {/* Footer with hovered emoji shortcode */}
          <View
            style={{
              padding: '0 8px',
              backgroundColor: theme.menuAutoCompleteBackground,
              color: theme.menuAutoCompleteText,
              ...styles.verySmallText,
              textAlign: 'center',
              height: '28px',
              minHeight: '28px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {hoveredEmoji
              ? `${hoveredEmoji.native} :${hoveredEmoji.id}:`
              : focusedIndex !== null &&
                  focusedIndex >= 0 &&
                  focusedIndex < filteredEmojis.length
                ? `${filteredEmojis[focusedIndex].native} :${filteredEmojis[focusedIndex].id}:`
                : ''}
          </View>
        </View>,
      )}
    </View>
  );
}
