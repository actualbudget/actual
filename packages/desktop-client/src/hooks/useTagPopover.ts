import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
} from 'react';

export function useTagPopover(
  initialValue: string,
  componentRef: MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>,
) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [hint, setHint] = useState('');
  const [content, setContent] = useState<string>(initialValue);
  const [keyPressed, setKeyPressed] = useState<string | null>(null);
  const edit = componentRef;

  const getCaretPosition = useCallback(
    (element: HTMLTextAreaElement | HTMLInputElement | null): number => {
      if (element) {
        return element.selectionStart || 0;
      }
      return 0;
    },
    [],
  );

  const handleSetCursorPosition = () => {
    const el = edit.current;
    if (!el) return;

    const range = document.createRange();
    const selection = window.getSelection();

    if (!selection) return;

    range.selectNodeContents(el);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const extractTagAtCursor = useCallback(
    (text: string, position: number): string => {
      let start = position;

      if (start >= text.length) {
        start = text.length - 1;
      }

      while (start >= 0 && !isWordBoundary(text[start])) {
        start--;
      }

      if (text[start] === '#' && text[start + 1] === '#') {
        return '';
      }

      if (text[start] !== '#' || (start > 0 && text[start - 1] === '#')) {
        return '';
      }

      let end = start + 1;

      while (end < text.length && !isWordBoundary(text[end])) {
        end++;
      }

      const tag = text.slice(start, end);
      if (tag.includes('#', 1)) {
        const tags = tag.split('#').filter(t => t.length > 0);
        for (let i = 0; i < tags.length; i++) {
          const tagStart = start + tag.indexOf(tags[i]);
          const tagEnd = tagStart + tags[i].length + 1;
          if (position >= tagStart && position <= tagEnd) {
            return `#${tags[i]}`;
          }
        }
      }

      return tag;
    },
    [],
  );

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (showAutocomplete) {
      if (isCommandKeys(e)) {
        setShowAutocomplete(false);
        e.stopPropagation();
        return;
      }

      if (['ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
        setKeyPressed(e.key);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    } else if (e.key === 'Escape') {
      if (content !== initialValue) {
        setContent(initialValue);
      }
    }
  };

  const handleKeyUp = (
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (isCommandKeys(e)) return;

    if (['ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      return;
    }

    const el = edit.current;
    if (!el) return;

    const cursorPosition = getCaretPosition(el);
    const tag = extractTagAtCursor(el.value, cursorPosition);

    if (tag) {
      setShowAutocomplete(true);
      setHint(tag?.replace('#', ''));
    } else {
      setShowAutocomplete(false);
    }
  };

  const isCommandKeys = (
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const { key, ctrlKey, altKey, metaKey } = e;

    const commandKeys = [
      'Control',
      'Alt',
      'Meta',
      'CapsLock',
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      'Insert',
      'Escape',
      'Pause',
      'PrintScreen',
      'ScrollLock',
      'NumLock',
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'F9',
      'F10',
      'F11',
      'F12',
      'ContextMenu',
    ];

    const isCommandKey =
      ctrlKey ||
      altKey ||
      metaKey || // Modifier keys
      commandKeys.includes(key);

    if (isCommandKey) {
      return true;
    }

    return false;
  };

  const handleMenuSelect = (item: { tag: string }) => {
    setShowAutocomplete(false);
    setHint('');

    if (!item) return;

    const el = edit.current;
    if (!el) return;

    const cursorPosition = getCaretPosition(el);
    const textBeforeCursor = el.value.slice(0, cursorPosition);
    const textAfterCursor = el.value.slice(cursorPosition);

    let tagStart = cursorPosition - 1;
    while (tagStart >= 0 && !isWordBoundary(textBeforeCursor[tagStart])) {
      tagStart--;
    }

    if (
      textBeforeCursor[tagStart] !== '#' ||
      (tagStart > 0 && textBeforeCursor[tagStart + 1] === '#')
    ) {
      setHint('');
      return;
    }

    let tagEnd = cursorPosition;
    while (
      tagEnd < el.value.length &&
      !isWordBoundary(textAfterCursor[tagEnd - cursorPosition])
    ) {
      tagEnd++;
    }

    const newContent =
      el.value.slice(0, tagStart) + item.tag + el.value.slice(tagEnd);

    setContent(newContent);

    const newCursorPosition = tagStart + item.tag.length + 1;
    el.setSelectionRange(newCursorPosition, newCursorPosition);
    el.focus();
  };

  const isWordBoundary = (char: string | undefined) => {
    return char === ' ' || char === '#' || char === undefined;
  };

  return {
    content,
    setContent,
    hint,
    showAutocomplete,
    keyPressed,
    handleKeyDown,
    handleKeyUp,
    handleMenuSelect,
    handleSetCursorPosition,
    setShowAutocomplete,
    setKeyPressed,
  };
}
