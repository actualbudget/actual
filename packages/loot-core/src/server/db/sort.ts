export const SORT_INCREMENT = 16384;

// Smaller increment for transactions - allows more reordering within a date
// before needing to resequence. Used by moveTransaction().
export const TRANSACTION_SORT_INCREMENT = 1024;

function midpoint<T extends { sort_order: number }>(
  items: T[],
  to: number,
  sortIncrement: number = SORT_INCREMENT,
) {
  const below = items[to - 1];
  const above = items[to];

  if (!below) {
    return above.sort_order / 2;
  } else if (!above) {
    return below.sort_order + sortIncrement;
  } else {
    return (below.sort_order + above.sort_order) / 2;
  }
}

export function shoveSortOrders<T extends { id: string; sort_order: number }>(
  items: T[],
  targetId: string | null = null,
  sortIncrement: number = SORT_INCREMENT,
) {
  const to = items.findIndex(item => item.id === targetId);
  const target = items[to];
  const before = items[to - 1];
  const updates: Array<{ id: string; sort_order: number }> = [];

  // If no target is specified, append at the end
  if (!targetId || to === -1) {
    let order;
    if (items.length > 0) {
      // Add a new increment to whatever is the latest sort order
      order = items[items.length - 1].sort_order + sortIncrement;
    } else {
      // If no items exist, the default is to use the first increment
      order = sortIncrement;
    }

    return { updates, sort_order: order };
  } else {
    if (target.sort_order - (before ? before.sort_order : 0) <= 2) {
      let next = to;
      let order = Math.floor(items[next].sort_order) + sortIncrement;
      while (next < items.length) {
        // No need to update it if it's already greater than the current
        // order. This can happen because there may already be large
        // gaps
        if (order <= items[next].sort_order) {
          break;
        }

        updates.push({ id: items[next].id, sort_order: order });

        next++;
        order += sortIncrement;
      }
    }

    return { updates, sort_order: midpoint(items, to, sortIncrement) };
  }
}

/**
 * Midpoint calculation for descending-ordered lists.
 * Places the new item between the target and the next item (lower sort_order).
 *
 * @param items - Array of items sorted by sort_order descending
 * @param targetIdx - Index of the target item
 * @param sortIncrement - The increment to use when no next item exists
 * @param nextIdx - Optional index of the next item (to skip movingId)
 */
function midpointDescending<T extends { sort_order: number }>(
  items: T[],
  targetIdx: number,
  sortIncrement: number = SORT_INCREMENT,
  nextIdx: number | null = null,
): number {
  const target = items[targetIdx];
  const next = nextIdx === null ? items[targetIdx + 1] : items[nextIdx];

  if (!next) {
    // Target is at the bottom - place below it
    return target.sort_order - sortIncrement;
  } else {
    // Use midpoint between target and next
    return Math.round((target.sort_order + next.sort_order) / 2);
  }
}

/**
 * Calculate sort_order for placing an item after a target in a descending-ordered list.
 * Mirrors shoveSortOrders but for lists sorted by sort_order DESC (higher values first).
 *
 * Use this when:
 * - Items are displayed with highest sort_order at top
 * - You want to place an item AFTER the target (visually below it)
 * - Items need to be shoved DOWN (decreased sort_order) to make room
 *
 * @param items - Array of items sorted by sort_order descending
 * @param targetId - ID of the item to place after, or null to place at top
 * @param movingId - ID of the item being moved (skipped when shoving)
 * @param sortIncrement - The increment to use when shoving items
 * @returns Object with sort_order for the new position and updates array for shoved items
 */
export function shoveSortOrdersDescending<
  T extends { id: string; sort_order: number },
>(
  items: T[],
  targetId: string | null = null,
  movingId: string | null = null,
  sortIncrement: number = SORT_INCREMENT,
): {
  sort_order: number;
  updates: Array<{ id: string; sort_order: number }>;
} {
  const updates: Array<{ id: string; sort_order: number }> = [];

  // If no target is specified, place at the top (highest sort_order)
  if (!targetId) {
    let order;
    if (items.length > 0) {
      order = items[0].sort_order + sortIncrement;
    } else {
      order = sortIncrement;
    }
    return { updates, sort_order: order };
  }

  const targetIdx = items.findIndex(item => item.id === targetId);

  // Target not found, place at end (lowest sort_order)
  if (targetIdx === -1) {
    const order =
      items.length > 0
        ? items[items.length - 1].sort_order - sortIncrement
        : sortIncrement;
    return { updates, sort_order: order };
  }

  const target = items[targetIdx];
  // Find the next item, skipping the moving item to avoid computing gap against itself
  const nextIdx = items.findIndex(
    (item, idx) => idx > targetIdx && (!movingId || item.id !== movingId),
  );
  const next = nextIdx === -1 ? null : items[nextIdx];

  // Check if there's room between target and next item
  const gap = target.sort_order - (next ? next.sort_order : 0);
  if (gap > 2) {
    // There's room - use midpoint
    // When nextIdx === -1, there's no next item (excluding the moving item),
    // so place directly below target instead of calling midpointDescending
    // which would incorrectly use items[targetIdx + 1] (the moving item itself)
    const newSortOrder =
      nextIdx === -1
        ? target.sort_order - sortIncrement
        : midpointDescending(items, targetIdx, sortIncrement, nextIdx);
    return {
      updates,
      sort_order: newSortOrder,
    };
  }

  // Need to shove items down (decrease sort_order) to make room
  let newOrder = target.sort_order - sortIncrement;
  for (let i = targetIdx + 1; i < items.length; i++) {
    // Skip the item being moved
    if (movingId && items[i].id === movingId) continue;

    // Only update if we need to make room
    if (items[i].sort_order >= newOrder) {
      updates.push({ id: items[i].id, sort_order: newOrder });
      newOrder = newOrder - sortIncrement;
    } else {
      break;
    }
  }

  return {
    updates,
    sort_order: Math.round(target.sort_order - sortIncrement / 2),
  };
}
