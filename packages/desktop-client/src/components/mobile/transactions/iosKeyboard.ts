import * as Platform from '@actual-app/core/shared/platform';
import { t } from 'i18next';

// iOS (every browser there is WebKit) only opens the keyboard when focus()
// runs inside the tap itself. The new transaction screen mounts after the
// tap, so its amount field would get focus without a keyboard. A tap that
// opens the screen focuses a hidden field first; the amount field then takes
// focus over and iOS keeps the keyboard up.
let primed = false;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

export function primeIOSKeyboard() {
  // isIOS, not isIOSAgent: Firefox and Chrome on iOS are WebKit too.
  if (!Platform.isIOS) {
    return;
  }
  clearTimeout(fallbackTimer);
  const proxy = document.createElement('input');
  proxy.setAttribute('aria-label', t('Amount'));
  proxy.tabIndex = -1;
  proxy.inputMode = 'decimal';
  Object.assign(proxy.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    border: '0',
    padding: '0',
    fontSize: '16px',
  });
  document.body.appendChild(proxy);
  proxy.addEventListener('blur', () => proxy.remove(), { once: true });
  proxy.focus();
  primed = true;
  // The screen never took focus over (navigation failed): close the keyboard.
  fallbackTimer = setTimeout(() => {
    primed = false;
    proxy.blur();
  }, 3000);
}

/** True once per tap that primed the keyboard. */
export function takePrimedIOSKeyboard() {
  const was = primed;
  primed = false;
  return was;
}
