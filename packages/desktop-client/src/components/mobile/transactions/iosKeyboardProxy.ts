/**
 * iOS Safari only opens the software keyboard when an input is focused
 * inside a synchronous user-gesture handler (tap/click).  When we navigate
 * to a new page and *then* try to focus the real input, the gesture chain
 * is broken and the keyboard stays closed.
 *
 * This module works around the limitation by creating a tiny off-screen
 * <input> that we focus synchronously during the tap.  The keyboard opens
 * for the proxy.  Once the destination page mounts its real input it calls
 * `transferIOSKeyboardFocus(realInput)` which moves focus — and the
 * already-open keyboard — to the real element.
 */

let proxy: HTMLInputElement | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

/** Call synchronously inside a tap/click handler. */
export function acquireIOSKeyboard(): void {
  releaseIOSKeyboard();

  proxy = document.createElement('input');
  proxy.type = 'text';
  proxy.inputMode = 'decimal';
  proxy.setAttribute('aria-hidden', 'true');
  proxy.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px;';
  document.body.appendChild(proxy);
  proxy.focus();
}

/** Transfer the already-open keyboard to a real input element. */
export function transferIOSKeyboardFocus(target: HTMLInputElement): void {
  target.focus();
  releaseIOSKeyboard();
}

/** Remove the proxy and cancel any pending safety timer (idempotent). */
export function releaseIOSKeyboard(): void {
  if (safetyTimer !== null) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  if (proxy) {
    proxy.remove();
    proxy = null;
  }
}

/** Schedule a safety cleanup in case focus transfer never happens. */
export function scheduleSafetyRelease(ms = 3000): void {
  if (safetyTimer !== null) {
    clearTimeout(safetyTimer);
  }
  safetyTimer = setTimeout(releaseIOSKeyboard, ms);
}
