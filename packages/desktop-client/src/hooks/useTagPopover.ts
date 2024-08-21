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

  const updateHint = useCallback(
    newValue => {
      const el = edit.current;
      if (!el) return;

      const cursorPosition = getCaretPosition(el);
      const textBeforeCursor = newValue.slice(0, cursorPosition);

      const lastHashIndex = textBeforeCursor.lastIndexOf('#');
      if (lastHashIndex === -1 || textBeforeCursor.split(' ').length > 1) {
        setHint('');
        return;
      }

      setHint(textBeforeCursor.slice(lastHashIndex + 1, cursorPosition));
    },
    [edit, getCaretPosition, setHint],
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
      if (e.key === 'Escape') {
        setShowAutocomplete(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (['ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        setKeyPressed(e.key);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    if (e.key === '#') {
      setShowAutocomplete(!showAutocomplete);
    } else if (e.key === ' ') {
      setHint('');
    } else if (
      !['Shift', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      let cursorPosition = getCaretPosition(edit.current);
      if (cursorPosition !== 0) {
        const textBeforeCursor = content.slice(0, cursorPosition);
        let foundHashtag = false;
        while (cursorPosition >= 0) {
          if (textBeforeCursor[cursorPosition] === '#') {
            foundHashtag = true;
            break;
          }

          if (textBeforeCursor[cursorPosition] === ' ') {
            break;
          }

          cursorPosition--;
        }

        if (foundHashtag) {
          setShowAutocomplete(true);
        }
      }
    }
  };

  const handleMenuSelect = item => {
    if (!item) return;

    setContent('');

    const el = edit.current;
    const cursorPosition = getCaretPosition(el);
    const textBeforeCursor = el.value.slice(0, cursorPosition);

    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    if (lastHashIndex === -1) {
      setShowAutocomplete(false);
      setHint('');
      return;
    }

    const newContent =
      textBeforeCursor.slice(0, lastHashIndex) +
      item.tag +
      el.value.slice(cursorPosition) +
      ' ';

    setContent(newContent);
    handleSetCursorPosition();
    setShowAutocomplete(false);
    setHint('');
  };

  return {
    content,
    setContent,
    hint,
    showAutocomplete,
    keyPressed,
    handleKeyDown,
    handleMenuSelect,
    handleSetCursorPosition,
    setShowAutocomplete,
    setKeyPressed,
  };
}
