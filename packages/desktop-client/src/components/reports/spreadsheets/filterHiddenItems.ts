import {
  type QueryDataEntity,
  type UncategorizedEntity,
} from '../ReportOptions';

type filterHiddenItemsProps = {
  item: UncategorizedEntity;
  data: QueryDataEntity[];
};

function filterHiddenItems({ item, data }: filterHiddenItemsProps) {
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
