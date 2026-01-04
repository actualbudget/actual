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
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiData | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isCaretVisible, setIsCaretVisible] = useState(true);
  // The search bar is "visual-only" (focus stays on the table cell input), so we
  // implement our own selection model (anchor + active caret) to behave like a
  // normal text input.
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const selectionAnchorRef = useRef<number | null>(null);
  const isDraggingSelectionRef = useRef(false);
  const searchQueryRef = useRef('');
  const [caretIndex, setCaretIndex] = useState(0);
  const caretIndexRef = useRef(0);
  const [caretLeft, setCaretLeft] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchTextRef = useRef<HTMLSpanElement | null>(null);
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
      setSearchQuery('');
    }
  }, [embedded]);

  // Sync with external isOpen prop if provided (e.g. table cells)
  useEffect(() => {
    if (externalIsOpen === undefined) {
      return;
    }

    if (!externalIsOpen) {
      setOpen(false);
      setSearchQuery('');
      return;
    }

    // Defer opening until after refs are assigned so Popover can position.
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [externalIsOpen]);

  // Blink caret while the picker is open (visual only; focus stays in table)
  useEffect(() => {
    if (!open) {
      selectionRef.current = null;
      selectionAnchorRef.current = null;
      setSelection(null);
      return;
    }

    setIsCaretVisible(true);
    const interval = setInterval(() => {
      setIsCaretVisible(v => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;

    // Keep caret within bounds whenever the query changes
    const len = Array.from(searchQuery).length;
    if (caretIndexRef.current > len) {
      caretIndexRef.current = len;
      setCaretIndex(len);
    }

    // Clamp selection within bounds, or clear if empty.
    if (selectionRef.current) {
      const start = Math.max(0, Math.min(selectionRef.current.start, len));
      const end = Math.max(0, Math.min(selectionRef.current.end, len));
      if (start === end) {
        selectionRef.current = null;
        setSelection(null);
        selectionAnchorRef.current = null;
      } else {
        const next = { start, end };
        selectionRef.current = next;
        setSelection(next);
      }
    }
  }, [searchQuery]);

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

  const setSelectionRange = useCallback((start: number, end: number) => {
    const len = Array.from(searchQueryRef.current).length;
    const s = Math.max(0, Math.min(start, len));
    const e = Math.max(0, Math.min(end, len));
    if (s === e) {
      selectionRef.current = null;
      selectionAnchorRef.current = null;
      setSelection(null);
      return;
    }
    const next = { start: s, end: e };
    selectionRef.current = next;
    setSelection(next);
  }, []);

  const clearSelection = useCallback(() => {
    selectionRef.current = null;
    selectionAnchorRef.current = null;
    setSelection(null);
  }, []);

  const setCaretIndexSafe = useCallback((next: number) => {
    const len = Array.from(searchQueryRef.current).length;
    const clamped = Math.max(0, Math.min(next, len));
    caretIndexRef.current = clamped;
    setCaretIndex(clamped);
  }, []);

  const replaceAllOrInsertAtCaret = useCallback(
    (text: string, { replaceSelection }: { replaceSelection: boolean }) => {
      const activeSelection = replaceSelection ? selectionRef.current : null;
      const range = activeSelection
        ? {
            start: Math.min(activeSelection.start, activeSelection.end),
            end: Math.max(activeSelection.start, activeSelection.end),
          }
        : null;
      const caretAtCall = caretIndexRef.current;

      setSearchQuery(current => {
        const chars = Array.from(current);
        const insertChars = Array.from(text);
        const shouldReplace = replaceSelection && !!range;

        let nextChars: string[];
        let nextCaret: number;

        if (shouldReplace) {
          nextChars = chars
            .slice(0, range.start)
            .concat(insertChars, chars.slice(range.end));
          nextCaret = range.start + insertChars.length;
        } else {
          const idx = Math.max(0, Math.min(caretAtCall, chars.length));
          nextChars = chars.slice();
          nextChars.splice(idx, 0, ...insertChars);
          nextCaret = idx + insertChars.length;
        }

        caretIndexRef.current = nextCaret;
        setCaretIndex(nextCaret);
        return nextChars.join('');
      });
      clearSelection();
      setIsSearchActive(true);
    },
    [clearSelection],
  );

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return allEmojis;
    }

    const query = searchQuery.toLowerCase().trim();
    return allEmojis.filter(emoji => {
      // Search by ID (shortcode)
      if (emoji.id.toLowerCase().includes(query)) {
        return true;
      }

      // Search by name
      if (emoji.name.toLowerCase().includes(query)) {
        return true;
      }

      // Search by keywords
      if (
        emoji.keywords?.some(keyword => keyword.toLowerCase().includes(query))
      ) {
        return true;
      }

      // Search by shortcode format (e.g., ":grinning:")
      if (`:${emoji.id}:`.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });
  }, [allEmojis, searchQuery]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(null);
    clearSelection();
  }, [searchQuery, clearSelection]);

  // Capture common text-field shortcuts while the picker is open so app-level and
  // table-level handlers don't swallow them before we can update `searchQuery`.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key !== 'a' && key !== 'c' && key !== 'x' && key !== 'v') {
        return;
      }

      const target = e.target as Node | null;
      const inPicker =
        (target && popoverContentRef.current?.contains(target)) ||
        target === innerRef.current;

      if (!inPicker) {
        return;
      }

      // Keep behavior identical to a normal input: prevent app shortcuts and
      // treat these keys as operating on the search bar.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (key === 'a') {
        const len = Array.from(searchQueryRef.current).length;
        if (len > 0) {
          selectionAnchorRef.current = 0;
          setSelectionRange(0, len);
          setCaretIndexSafe(len);
        }
        setIsSearchActive(true);
        return;
      }

      if (key === 'c') {
        const activeSelection = selectionRef.current;
        if (activeSelection) {
          const start = Math.min(activeSelection.start, activeSelection.end);
          const end = Math.max(activeSelection.start, activeSelection.end);
          const selectedText = Array.from(searchQueryRef.current)
            .slice(start, end)
            .join('');
          if (selectedText) {
            void navigator?.clipboard?.writeText(selectedText);
          }
        }
        return;
      }

      if (key === 'x') {
        const activeSelection = selectionRef.current;
        if (!activeSelection) {
          return;
        }
        const start = Math.min(activeSelection.start, activeSelection.end);
        const end = Math.max(activeSelection.start, activeSelection.end);
        const selectedText = Array.from(searchQueryRef.current)
          .slice(start, end)
          .join('');
        if (selectedText) {
          void navigator?.clipboard?.writeText(selectedText);
        }
        setSearchQuery(current => {
          const chars = Array.from(current);
          caretIndexRef.current = start;
          setCaretIndex(start);
          return chars.slice(0, start).concat(chars.slice(end)).join('');
        });
        clearSelection();
        setIsSearchActive(true);
        return;
      }

      // key === 'v'
      void navigator?.clipboard
        ?.readText()
        .then(text => {
          if (!text) {
            return;
          }
          replaceAllOrInsertAtCaret(text, { replaceSelection: true });
        })
        .catch(() => undefined);
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [
    open,
    clearSelection,
    replaceAllOrInsertAtCaret,
    setCaretIndexSafe,
    setSelectionRange,
  ]);

  const hasSelection = !!selection && selection.start !== selection.end;
  const selectionMin = selection ? Math.min(selection.start, selection.end) : 0;
  const selectionMax = selection ? Math.max(selection.start, selection.end) : 0;

  const getCaretIndexFromClientX = useCallback((clientX: number) => {
    const container = searchTextRef.current;
    const text = searchQueryRef.current;
    const len = Array.from(text).length;
    if (!container || !text) {
      return len;
    }

    const spans = Array.from(
      container.querySelectorAll('[data-search-char-index]'),
    ) as HTMLSpanElement[];
    if (spans.length === 0) {
      return 0;
    }

    for (const el of spans) {
      const idxAttr = el.getAttribute('data-search-char-index');
      const idx = idxAttr ? Number(idxAttr) : NaN;
      if (Number.isNaN(idx)) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (clientX < mid) {
        return idx;
      }
    }

    return spans.length;
  }, []);

  // Measure caret X offset so we can render it as an overlay (no layout shift).
  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const container = searchTextRef.current;
    if (!container) {
      return;
    }

    const raf = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const spans = Array.from(
        container.querySelectorAll('[data-search-char-index]'),
      ) as HTMLSpanElement[];

      if (spans.length === 0) {
        setCaretLeft(0);
        return;
      }

      const idx = Math.max(0, Math.min(caretIndexRef.current, spans.length));
      if (idx === spans.length) {
        const lastRect = spans[spans.length - 1].getBoundingClientRect();
        setCaretLeft(lastRect.right - containerRect.left);
      } else {
        const rect = spans[idx].getBoundingClientRect();
        setCaretLeft(rect.left - containerRect.left);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [open, searchQuery, caretIndex]);

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
        // If we're starting from no selection (currentIndex === -1), go to top-left (index 0)
        if (currentIndex === -1) {
          newIndex = 0;
        } else {
          newIndex = Math.min(
            currentIndex + emojisPerRow,
            filteredEmojis.length - 1,
          );
        }
      } else if (key === 'ArrowUp') {
        // If we're in the top row of the emoji grid, move "up" into the search
        // bar (caret at end) instead of wrapping within the grid.
        if (currentIndex >= 0 && currentIndex < emojisPerRow) {
          setFocusedIndex(null);
          setIsSearchActive(true);
          clearSelection();
          selectionAnchorRef.current = null;
          setCaretIndexSafe(Array.from(searchQueryRef.current).length);
          return;
        }
        newIndex = Math.max(currentIndex - emojisPerRow, 0);
      }

      setFocusedIndex(newIndex);
      clearSelection();

      // Scroll focused emoji into view
      if (emojiGridRef.current && newIndex >= 0) {
        const emojiElement = emojiGridRef.current.querySelector(
          `[data-emoji-index="${newIndex}"]`,
        ) as HTMLElement | null;
        emojiElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    [
      clearSelection,
      emojisPerRow,
      filteredEmojis.length,
      focusedIndex,
      setCaretIndexSafe,
    ],
  );

  const handleEmojiSelect = useCallback(
    (emoji: EmojiData) => {
      onSelect(emoji.native);
      closePicker();
    },
    [closePicker, onSelect],
  );

  const applySearchInputKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Keep focus in the cell input (like other pickers) so the table navigator
      // doesn't close editing when focus moves to the popover (which is portaled).
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return false;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        const activeSelection = selectionRef.current;
        const range = activeSelection
          ? {
              start: Math.min(activeSelection.start, activeSelection.end),
              end: Math.max(activeSelection.start, activeSelection.end),
            }
          : null;
        const caretAtCall = caretIndexRef.current;
        setSearchQuery(current => {
          const chars = Array.from(current);
          if (range) {
            caretIndexRef.current = range.start;
            setCaretIndex(range.start);
            return chars
              .slice(0, range.start)
              .concat(chars.slice(range.end))
              .join('');
          }
          const idx = Math.max(0, Math.min(caretAtCall, chars.length));
          if (idx === 0) {
            return current;
          }
          chars.splice(idx - 1, 1);
          caretIndexRef.current = idx - 1;
          setCaretIndex(idx - 1);
          return chars.join('');
        });
        clearSelection();
        setIsSearchActive(true);
        return true;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        const activeSelection = selectionRef.current;
        const range = activeSelection
          ? {
              start: Math.min(activeSelection.start, activeSelection.end),
              end: Math.max(activeSelection.start, activeSelection.end),
            }
          : null;
        const caretAtCall = caretIndexRef.current;
        setSearchQuery(current => {
          const chars = Array.from(current);
          if (range) {
            caretIndexRef.current = range.start;
            setCaretIndex(range.start);
            return chars
              .slice(0, range.start)
              .concat(chars.slice(range.end))
              .join('');
          }
          const idx = Math.max(0, Math.min(caretAtCall, chars.length));
          if (idx >= chars.length) {
            return current;
          }
          chars.splice(idx, 1);
          // caret stays at idx
          return chars.join('');
        });
        clearSelection();
        setIsSearchActive(true);
        return true;
      }

      if (e.key.length === 1) {
        // Printable character (includes space)
        e.preventDefault();
        e.stopPropagation();
        replaceAllOrInsertAtCaret(e.key, { replaceSelection: true });
        return true;
      }

      return false;
    },
    [clearSelection, replaceAllOrInsertAtCaret],
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

      if (open) {
        // If the user is actively editing the search, arrow keys should behave
        // like a normal text input (caret movement + shift-selection).
        if (
          isSearchActive &&
          (e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown')
        ) {
          e.preventDefault();
          e.stopPropagation();

          const len = Array.from(searchQueryRef.current).length;
          const activeSelection = selectionRef.current;
          const hasActiveSelection =
            !!activeSelection && activeSelection.start !== activeSelection.end;

          const collapseSelectionTo = (idx: number) => {
            clearSelection();
            selectionAnchorRef.current = idx;
            setCaretIndexSafe(idx);
          };

          const ensureAnchor = () => {
            if (selectionAnchorRef.current == null) {
              selectionAnchorRef.current = caretIndexRef.current;
            }
            return selectionAnchorRef.current;
          };

          const extendSelectionTo = (idx: number) => {
            const anchor = ensureAnchor();
            setSelectionRange(anchor, idx);
            setCaretIndexSafe(idx);
          };

          // If there's an existing selection and shift isn't held, collapse it
          // (left -> start, right -> end; up/down -> start/end of input).
          if (hasActiveSelection && !e.shiftKey) {
            const min = Math.min(activeSelection.start, activeSelection.end);
            const max = Math.max(activeSelection.start, activeSelection.end);
            if (e.key === 'ArrowLeft') {
              collapseSelectionTo(min);
            } else if (e.key === 'ArrowRight') {
              collapseSelectionTo(max);
            } else if (e.key === 'ArrowUp') {
              collapseSelectionTo(0);
            } else if (e.key === 'ArrowDown') {
              collapseSelectionTo(len);
            }
            return;
          }

          // Shift-selection
          if (e.shiftKey) {
            if (e.key === 'ArrowUp') {
              extendSelectionTo(0);
            } else if (e.key === 'ArrowDown') {
              extendSelectionTo(len);
            } else if (e.key === 'ArrowLeft') {
              extendSelectionTo(caretIndexRef.current - 1);
            } else if (e.key === 'ArrowRight') {
              extendSelectionTo(caretIndexRef.current + 1);
            }
            return;
          }

          // Plain caret movement
          clearSelection();
          selectionAnchorRef.current = null;
          if (e.key === 'ArrowDown' && caretIndexRef.current >= len) {
            // Hand off into the emoji grid once the caret is already at the end.
            setIsSearchActive(false);
            setFocusedIndex(0);
            return;
          }
          if (e.key === 'ArrowUp') {
            setCaretIndexSafe(0);
          } else if (e.key === 'ArrowDown') {
            setCaretIndexSafe(len);
          } else {
            setCaretIndexSafe(
              caretIndexRef.current + (e.key === 'ArrowLeft' ? -1 : 1),
            );
          }
          return;
        }

        // Search input handling (typing characters, backspace, delete)
        const handled = applySearchInputKey(e);
        if (handled) {
          return;
        }

        // Emoji grid navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          setIsSearchActive(false);
          handleNavigate(e.key);
          return;
        }
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
    [closePicker, clearSelection, embedded, focusedIndex, filteredEmojis, handleEmojiSelect, handleNavigate, isSearchActive, applySearchInputKey, setCaretIndexSafe, setSelectionRange, inputProps, open, shouldSaveFromKeyProp],
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

        {/* Search bar */}
        <View
          style={{
            padding: '8px',
          }}
        >
          {/* Visually match focused picker inputs (purple outline + caret),
              but keep actual focus in the table cell input to avoid closing
              editing (popover is portaled). */}
          <View
            style={{
              outline: 0,
              backgroundColor: theme.tableBackground,
              color: theme.formInputText,
              margin: 0,
              padding: 5,
              borderRadius: 4,
              border: '1px solid ' + theme.formInputBorderSelected,
              boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
              width: '100%',
              cursor: 'text',
              userSelect: 'none',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 0,
              ...styles.smallText,
            }}
            onMouseDown={e => {
              e.preventDefault();
              innerRef.current?.focus();
              setIsSearchActive(true);

              const clickedIndex = getCaretIndexFromClientX(e.clientX);

              if (e.shiftKey) {
                // Shift+click selects between the existing caret (anchor) and click.
                if (selectionAnchorRef.current == null) {
                  selectionAnchorRef.current = caretIndexRef.current;
                }
                setSelectionRange(selectionAnchorRef.current, clickedIndex);
                setCaretIndexSafe(clickedIndex);
              } else {
                // Plain click moves caret and clears selection.
                clearSelection();
                selectionAnchorRef.current = clickedIndex;
                setCaretIndexSafe(clickedIndex);
              }

              // Click-drag selection
              const dragAnchor = selectionAnchorRef.current ?? clickedIndex;
              isDraggingSelectionRef.current = true;
              const onMove = (ev: MouseEvent) => {
                if (!isDraggingSelectionRef.current) {
                  return;
                }
                const idx = getCaretIndexFromClientX(ev.clientX);
                selectionAnchorRef.current = dragAnchor;
                setSelectionRange(dragAnchor, idx);
                setCaretIndexSafe(idx);
              };
              const onUp = () => {
                isDraggingSelectionRef.current = false;
                window.removeEventListener('mousemove', onMove, true);
                window.removeEventListener('mouseup', onUp, true);
              };
              window.addEventListener('mousemove', onMove, true);
              window.addEventListener('mouseup', onUp, true);
            }}
          >
            {searchQuery ? (
              <span
                ref={searchTextRef}
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  lineHeight: '16px',
                }}
              >
                {Array.from(searchQuery).map((ch, i) => (
                  <span key={i} data-search-char-index={i}>
                    <span
                      style={
                        hasSelection && i >= selectionMin && i < selectionMax
                          ? {
                              backgroundColor:
                                theme.formInputBackgroundSelection,
                              color: theme.formInputTextSelected,
                            }
                          : undefined
                      }
                    >
                      {ch}
                    </span>
                  </span>
                ))}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: caretLeft,
                    top: '50%',
                    transform: 'translate(-0.5px, -50%)',
                    width: 1,
                    height: 16,
                    backgroundColor: theme.formInputText,
                    opacity: isCaretVisible ? 1 : 0,
                    pointerEvents: 'none',
                  }}
                />
              </span>
            ) : (
              <>
                {/* Fake caret (blinking) at the start of the placeholder */}
                <span
                  style={{
                    // Zero-width caret so it doesn't shift placeholder text
                    width: 0,
                    height: 16,
                    borderLeft: '1px solid ' + theme.formInputText,
                    opacity: isCaretVisible ? 1 : 0,
                    flexShrink: 0,
                    marginRight: 0,
                  }}
                />
                <span style={{ color: theme.formInputTextPlaceholder }}>
                  <Trans>Search emojis...</Trans>
                </span>
              </>
            )}
          </View>
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
