import { FixedSizeList } from './FixedSizeList';

function centeredOffset(itemCount: number, height: number, index: number) {
  const list = new FixedSizeList({
    renderRow: () => null,
    itemCount,
    itemSize: 30,
    height,
    width: 500,
  });
  return list.getOffsetForIndexAndAlignment(index, 'center');
}

describe('FixedSizeList', () => {
  it('centers an item in the middle of a list', () => {
    expect(centeredOffset(100, 600, 50)).toBe(50 * 30 - (600 - 30) / 2);
  });

  it('scrolls to the last item of a list barely taller than the view', () => {
    // 27 items of 30px in a 718px view can scroll 92px
    expect(centeredOffset(27, 718, 26)).toBe(92);
  });
});
