/**
 * @jest-environment jsdom
 */

import { getStringWidth, getTextWidth } from './text-width';

describe('InfoBubble', () => {
  let context: CanvasRenderingContext2D;
  const measureText = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    measureText.mockReturnValue({ width: 495.6 });
    context = {
      font: '',
      measureText,
    } as any;
    jest.spyOn(document, 'createElement').mockReturnValue({
      getContext: jest.fn().mockReturnValue(context),
    } as any);
  });
  describe('getStringWidth', () => {
    it('should return the correct width of the string rounded up to the nearest px', () => {
      const text = 'This text width should be 500px';
      const result = getStringWidth(text);
      expect(result).toBe(496);
    });
  });
  describe('getTextWidth', () => {
    it('should return the correct width of the text rounded up to the nearest px', () => {
      measureText.mockReturnValueOnce({ width: 595.6 });
      const text = 'This text should not be broken up.';
      const result = getTextWidth(text);
      expect(result).toBe(596);
    });
    it('should return the correct width of the text rounded up to the nearest px when the text is longer than the maxWidth', () => {
      measureText
        .mockReturnValueOnce({ width: 595.6 })
        .mockReturnValueOnce({ width: 495.6 });
      const text = 'This text should be broken up.';
      const result = getTextWidth(text, 500);
      expect(result).toBe(300);
    });
  });
});
