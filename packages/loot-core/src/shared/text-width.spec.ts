import { getTextWidth } from './text-width';

describe('InfoBubble', () => {
  beforeEach(() => {
    jest.spyOn(document, 'createElement');
  });
  describe('getTextWidth', () => {
    it('should return the correct width of the text rounded up to the nearest px', () => {
      const text = 'This text width should be 500px';
      const maxWidth = 500;
      const result = getTextWidth(text, maxWidth);
      expect(result).toBe(500);
    });
  });
  describe('getBubbleWidth', () => {
    it('should return the correct width of the bubble rounded up to the nearest px', () => {
      // Test implementation of getBubbleWidth
    });
  });
});
