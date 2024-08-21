import { useCallback, useEffect, useState } from 'react';

export function useTagPopover(initialValue, onUpdate, componentRef) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [hint, setHint] = useState('');
  const [content, setContent] = useState(initialValue);
  const [keyPressed, setKeyPressed] = useState(null);
  const edit = componentRef;

  const getCaretPosition = useCallback(element => {
    if (element) {
      return element.selectionStart;
    }
    return 0;
  }, []);

  const handleSetCursorPosition = () => {
    const el = edit.current;
    if (!el) return;

    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(el);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const extractTagAtCursor = useCallback((text, position) => {
    let start = position - 1;

    // Traverse backwards to find the start of the current word or tag
    while (start >= 0 && !isWordBoundary(text[start])) {
      start--;
    }

    // Handle double `##` escape case
    if (text[start] === '#' && text[start + 1] === '#') {
      return '';
    }

    // Check if the word is a tag, starting with a single #
    if (text[start] !== '#' || (start > 0 && text[start - 1] === '#')) {
      return '';
    }

    let end = start + 1;

    // Traverse forwards to find the end of the current tag
    while (end < text.length && !isWordBoundary(text[end])) {
      end++;
    }

    // Extract the tag
    const tag = text.slice(start, end);

    // Check if there are additional tags within the same word
    if (tag.includes('#', 1)) {
      const tags = tag.split('#').filter((t) => t.length > 0);
      for (let i = 0; i < tags.length; i++) {
        const tagStart = start + tag.indexOf(tags[i]);
        const tagEnd = tagStart + tags[i].length + 1;
        if (position >= tagStart && position <= tagEnd) {
          return `#${tags[i]}`;
        }
      }
    }

    return tag;
  }, []);

  const updateHint = useCallback(
    newValue => {
      const el = edit.current;
      if (!el) return;

      const cursorPosition = getCaretPosition(el);
      const tag = extractTagAtCursor(newValue, cursorPosition);
      setHint(tag?.replace("#",""));
    },
    [edit, getCaretPosition, extractTagAtCursor]
  );

  useEffect(() => {
    if (content !== undefined) {
      onUpdate?.(content);
      updateHint(content);
    } else {
      updateHint('');
    }
  }, [content, onUpdate, updateHint]);

  const handleKeyDown = e => {
    if (showAutocomplete) {
      if (['Escape', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
        setKeyPressed(e.key);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
  };

  const handleKeyUp = e => {
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      return;
    }

    const el = edit.current;
    if (!el) return;

    const cursorPosition = getCaretPosition(el);
    const tag = extractTagAtCursor(content, cursorPosition);

    if (tag) {
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleMenuSelect = item => {
    if (!item) return;
    debugger;

    const el = edit.current;
    const cursorPosition = getCaretPosition(el);
    const textBeforeCursor = el.value.slice(0, cursorPosition);
    const textAfterCursor = el.value.slice(cursorPosition);

    // Find the start of the current tag
    let tagStart = cursorPosition - 1;
    while (tagStart >= 0 && !isWordBoundary(textBeforeCursor[tagStart])) {
      tagStart--;
    }

    // Ensure it's a valid tag (starting with a single # and not double ##)
    if (
      textBeforeCursor[tagStart] !== '#' ||
      (tagStart > 0 && textBeforeCursor[tagStart + 1] === '#')
    ) {
      return;
    }

    // Find the end of the current tag
    let tagEnd = cursorPosition;
    while (tagEnd < el.value.length && !isWordBoundary(textAfterCursor[tagEnd - cursorPosition])) {
      tagEnd++;
    }

    // Replace the tag with the selected item
    const newContent =
      el.value.slice(0, tagStart) +
      item.tag +
      el.value.slice(tagEnd);

    // Update the content and reset the autocomplete state
    setContent(newContent);
    setShowAutocomplete(false);
    setHint('');

    // Reset the cursor position to the end of the newly inserted tag
    const newCursorPosition = tagStart + item.tag.length + 1;
    el.setSelectionRange(newCursorPosition, newCursorPosition);
    el.focus();
  };

  const isWordBoundary = (char) => {
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
    updateHint,
  };
}
