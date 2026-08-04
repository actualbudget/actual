/**
 * Currency parsing shared by the QE exercise specs.
 *
 * The app renders money as comma-grouped decimal strings ("3,030.00",
 * "-158.06"). Tests compare amounts as integer cents so that assertions are
 * exact -- floating-point dollars would make `toEqual` unreliable on values
 * like 0.1 + 0.2.
 *
 * Note the comma strip: `parseInt('3,030.00', 10)` truncates at the comma and
 * returns 3. That exact bug existed in the page models' total-parsing helpers
 * and went unnoticed because the only test using them asserted
 * `expect.any(Number)` (see qe-exercise/AI_WORKFLOW.md). Everything here goes
 * through one implementation so it can only be got wrong in one place.
 */
export function parseAmountToCents(text: string) {
  return Math.round(parseFloat(text.replace(/,/g, '')) * 100);
}

/**
 * Read a locator's text and parse it as cents.
 *
 * Throws rather than returning NaN when the cell is empty -- a NaN silently
 * poisons every downstream arithmetic assertion and produces a confusing
 * "expected 1234, received NaN" far from the real cause.
 */
export async function readAmountInCents(locator: {
  textContent: () => Promise<string | null>;
}) {
  const text = await locator.textContent();

  if (text == null || text.trim() === '') {
    throw new Error('Expected an amount cell to have text, but it was empty.');
  }

  const cents = parseAmountToCents(text);

  if (Number.isNaN(cents)) {
    throw new Error(`Unable to parse "${text}" as a currency amount.`);
  }

  return cents;
}
