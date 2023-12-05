function filterHiddenItems(item, data) {
  let filtered = data.filter(asset =>
    item.uncat_id
      ? (item.transfer ? asset.transferAccount : !asset.transferAccount) &&
        (item.category ? true : !asset.category) &&
        (item.offBudget ? asset.accountOffBudget : !asset.accountOffBudget)
      : true,
  );

  return filtered;
}

export default filterHiddenItems;
