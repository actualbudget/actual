export function findSortDown(
  arr: { id: string }[],
  pos: 'top' | 'bottom',
  targetId: string,
) {
  if (pos === 'top') {
    return { targetId };
  } else {
    const idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    const newIdx = idx + 1;
    if (newIdx <= arr.length - 1) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the end
      return { targetId: null };
    }
  }
}

export function findSortUp(
  arr: { id: string }[],
  pos: 'top' | 'bottom',
  targetId: string,
) {
  if (pos === 'bottom') {
    return { targetId };
  } else {
    const idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    const newIdx = idx - 1;
    if (newIdx >= 0) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the beginning
      return { targetId: null };
    }
  }
}

type Coordinates = {
  top: number;
  bottom: number;
};

export function getDropPosition(
  active: Coordinates,
  original: Coordinates,
): 'top' | 'bottom' {
  const { top: activeTop, bottom: activeBottom } = active;
  const { top: initialTop, bottom: initialBottom } = original;

  const activeCenter = (activeTop + activeBottom) / 2;
  const initialCenter = (initialTop + initialBottom) / 2;

  // top - the active item was dragged up
  // bottom - the active item was dragged down
  return activeCenter < initialCenter ? 'top' : 'bottom';
}
