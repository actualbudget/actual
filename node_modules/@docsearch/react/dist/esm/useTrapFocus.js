import React from 'react';
export function useTrapFocus(_ref) {
  var container = _ref.container;
  React.useEffect(function () {
    if (!container) {
      return undefined;
    }

    var focusableElements = container.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), input:not([disabled])');
    var firstElement = focusableElements[0];
    var lastElement = focusableElements[focusableElements.length - 1];

    function trapFocus(event) {
      if (event.key !== 'Tab') {
        return;
      }

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    container.addEventListener('keydown', trapFocus);
    return function () {
      container.removeEventListener('keydown', trapFocus);
    };
  }, [container]);
}