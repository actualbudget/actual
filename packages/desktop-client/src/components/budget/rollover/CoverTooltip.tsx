// @ts-strict-ignore
import React, { type ComponentProps, useState } from 'react';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button';
import { InitialFocus } from '../../common/InitialFocus';
import { View } from '../../common/View';
import { Tooltip } from '../../tooltips';
import { addToBeBudgetedGroup } from '../util';

type CoverTooltipProps = {
  tooltipProps?: ComponentProps<typeof Tooltip>;
  onSubmit: (category: unknown) => void;
  onClose: () => void;
};
export function CoverTooltip({
  tooltipProps,
  onSubmit,
  onClose,
}: CoverTooltipProps) {
  let { grouped: categoryGroups } = useCategories();
  categoryGroups = addToBeBudgetedGroup(
    categoryGroups.filter(g => !g.is_income),
  );
  const [category, setCategory] = useState(null);

  function submit() {
    if (category) {
      onSubmit(category);
      onClose();
    }
  }

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 10 }}
      {...tooltipProps}
      onClose={onClose}
    >
      <View style={{ marginBottom: 5 }}>Cover from category:</View>

      <InitialFocus>
        {node => (
          <CategoryAutocomplete
            categoryGroups={categoryGroups}
            value={null}
            openOnFocus={true}
            onUpdate={() => {}}
            onSelect={id => setCategory(id)}
            inputProps={{
              inputRef: node,
              onKeyDown: e => {
                if (e.key === 'Enter') {
                  submit();
                }
              },
            }}
          />
        )}
      </InitialFocus>

      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10,
        }}
      >
        <Button
          type="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
          }}
          onClick={submit}
        >
          Transfer
        </Button>
      </View>
    </Tooltip>
  );
}
