/** Calculates the width of a text string in pixels
 * and returns the width rounded up to the nearest pixel.
 *
 * If the text is longer than the maxWidth, it will be split into multiple lines.
 * The width of the longest line will be returned.
 *
 * @param {string} [text] - The text string to calculate the width of.
 * @param {number} [maxWidth=0] - The maximum width of the text after which it will be split into multiple lines. `0` will not split.
 */
export function getTextWidth(text: string, maxWidth: number = 0): number {
  const textWidth = getStringWidth(text);

  if (maxWidth && textWidth > maxWidth) {
    const words = text.split(' ');
    const half = Math.ceil(words.length / 2);
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');

    return Math.max(getStringWidth(firstHalf), getStringWidth(secondHalf));
  }
  return textWidth;
}

export function getStringWidth(text: string): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = getComputedStyle(document.body).font;

  return Math.ceil(context.measureText(text).width);
}
