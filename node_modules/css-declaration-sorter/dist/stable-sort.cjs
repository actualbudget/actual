'use strict';

module.exports = function (items, comparator) {
  comparator = comparator
    ? comparator
    : (a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };
  let stabilizedItems = items.map((el, index) => [el, index]);
  const stableComparator = (a, b) => {
    let order = comparator(a[0], b[0]);
    if (order != 0) return order;
    return a[1] - b[1];
  };
  stabilizedItems.sort(stableComparator);
  for (let i = 0; i < items.length; i++) {
    items[i] = stabilizedItems[i][0];
  }
  return items;
};
