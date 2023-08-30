export const SORT_INCREMENT = 16384;
export const TRANSACTION_SORT_INCREMENT = 1024;

function midpoint(items, to) {
  const below = items[to - 1];
  const above = items[to];

  if (!below) {
    return above.sort_order / 2;
  } else if (!above) {
    return below.sort_order + SORT_INCREMENT;
  } else {
    return (below.sort_order + above.sort_order) / 2;
  }
}

export function shoveSortOrders(
  items,
  targetId?: string,
  sortIncrement = SORT_INCREMENT,
) {
  const to = items.findIndex(item => item.id === targetId);
  const target = items[to];
  const before = items[to - 1];
  const updates = [];

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

    return { updates, sort_order: midpoint(items, to) };
  }
}
