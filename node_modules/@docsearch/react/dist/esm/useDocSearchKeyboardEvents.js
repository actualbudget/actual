import React from 'react';

function isEditingContent(event) {
  var element = event.target;
  var tagName = element.tagName;
  return element.isContentEditable || tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA';
}

export function useDocSearchKeyboardEvents(_ref) {
  var isOpen = _ref.isOpen,
      onOpen = _ref.onOpen,
      onClose = _ref.onClose,
      onInput = _ref.onInput,
      searchButtonRef = _ref.searchButtonRef;
  React.useEffect(function () {
    function onKeyDown(event) {
      function open() {
        // We check that no other DocSearch modal is showing before opening
        // another one.
        if (!document.body.classList.contains('DocSearch--active')) {
          onOpen();
        }
      }

      if (event.keyCode === 27 && isOpen || // The `Cmd+K` shortcut both opens and closes the modal.
      event.key === 'k' && (event.metaKey || event.ctrlKey) || // The `/` shortcut opens but doesn't close the modal because it's
      // a character.
      !isEditingContent(event) && event.key === '/' && !isOpen) {
        event.preventDefault();

        if (isOpen) {
          onClose();
        } else if (!document.body.classList.contains('DocSearch--active')) {
          open();
        }
      }

      if (searchButtonRef && searchButtonRef.current === document.activeElement && onInput) {
        if (/[a-zA-Z0-9]/.test(String.fromCharCode(event.keyCode))) {
          onInput(event);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return function () {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onOpen, onClose, onInput, searchButtonRef]);
}