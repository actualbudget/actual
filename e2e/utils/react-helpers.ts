import { type Locator } from '@playwright/test';

/**
 * Sets a React-controlled input value via the native value setter + input event.
 *
 * Playwright's `.fill()` dispatches multiple events on each character, causing
 * React Aria's controlled-input wrappers to re-render and detach mid-action under
 * parallel CI load. The native-setter pattern sets the value once and fires a
 * single synthetic `input` event that React processes in one update cycle.
 */
export async function fillReactInput(
  locator: Locator,
  value: string,
): Promise<void> {
  await locator.evaluate((element, inputValue) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );

    descriptor?.set?.call(element, inputValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/**
 * Clicks a React Aria button via a synchronous browser-side click.
 *
 * React Aria re-renders buttons on focus-state changes (`data-focused`,
 * `data-focus-visible`). Under parallel CI load, Playwright's `.click()`
 * stability check sees the node detach and re-mount between resolution and
 * action. Running `.click()` inside `evaluate` is one JS task with no CDP
 * round-trip, so React has no chance to re-render between the two steps.
 */
export async function clickReactAriaButton(locator: Locator): Promise<void> {
  await locator.evaluate(el => (el as HTMLElement).click());
}
