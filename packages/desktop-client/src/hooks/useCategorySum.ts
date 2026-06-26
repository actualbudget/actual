import { useEffect, useState } from 'react';

import { useSpreadsheet } from './useSpreadsheet';

export function useCategorySum(
  sheetName: string,
  categoryIds: string[],
  field: (categoryId: string) => string,
  enabled: boolean,
) {
  const spreadsheet = useSpreadsheet();
  const [sum, setSum] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setSum(0);
      return;
    }

    const values = new Map<string, number>();

    const updateSum = () => {
      const computedSum = [...values.values()].reduce(
        (total, value) => total + value,
        0,
      );
      setSum(computedSum === 0 ? 0 : computedSum);
    };

    const unbinds = categoryIds.map(categoryId =>
      spreadsheet.bind(sheetName, { name: field(categoryId) }, node => {
        values.set(categoryId, typeof node.value === 'number' ? node.value : 0);
        updateSum();
      }),
    );

    updateSum();

    return () => {
      unbinds.forEach(unbind => unbind());
    };
  }, [categoryIds, enabled, field, sheetName, spreadsheet]);

  return sum;
}
