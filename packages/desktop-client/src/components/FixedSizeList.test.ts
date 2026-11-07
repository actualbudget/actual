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

describe('expanded editing row', () => {
  const list = new FixedSizeList({
    renderRow: () => null,
    itemCount: 20,
    itemSize: 30,
    height: 120,
    expandedItem: { index: 4, height: 100 },
  });
  it('reserves space below the selected row', () => {
    expect(list.getItemOffset(4)).toBe(120);
    expect(list.getItemSize(4)).toBe(130);
    expect(list.getItemOffset(5)).toBe(250);
    expect(list.getEstimatedTotalSize()).toBe(700);
  });
  it('keeps the expanded row rendered throughout its controls', () => {
    expect(list.getStartIndexForOffset(249)).toBe(4);
    expect(list.getStartIndexForOffset(250)).toBe(5);
    expect(list.getStopIndexForStartIndex(3, 90)).toBe(4);
    expect(list.getStopIndexForStartIndex(4, 180)).toBe(6);
    expect(list.getOffsetForIndexAndAlignment(5, 'start')).toBe(250);
    expect(list.getOffsetForIndexAndAlignment(19, 'end')).toBe(580);
  });
});
