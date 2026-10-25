import { FixedSizeList } from './FixedSizeList';

function makeList(itemCount: number, height: number) {
  return new FixedSizeList({
    renderRow: () => null,
    itemCount,
    itemSize: 30,
    height,
    width: 500,
  });
}

describe('FixedSizeList', () => {
  describe('centering an item', () => {
    it.each([
      ['near the start', 2, 0],
      ['in the middle', 50, 50 * 30 - (600 - 30) / 2],
      ['near the end', 99, 100 * 30 - 600],
    ])('scrolls to an item %s of a long list', (_, index, expected) => {
      expect(
        makeList(100, 600).getOffsetForIndexAndAlignment(index, 'center'),
      ).toBe(expected);
    });

    it('scrolls to the last item of a list barely taller than the view', () => {
      // 27 items of 30px in a 718px view: the last one needs the whole
      // 92px the list can scroll
      expect(
        makeList(27, 718).getOffsetForIndexAndAlignment(26, 'center'),
      ).toBe(92);
    });
  });
});
