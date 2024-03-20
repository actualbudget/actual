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
  onSubmit: (categoryId: string) => void;
  onClose: () => void;
};
export function CoverTooltip({
  tooltipProps,
  onSubmit,
  onClose,
}: CoverTooltipProps) {
  const _onSubmit = (categoryId: string) => {
    onSubmit?.(categoryId);
    onClose?.();
  };

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 10 }}
      {...tooltipProps}
      onClose={onClose}
    >
      <Cover onSubmit={_onSubmit} />
    </Tooltip>
  );
}

type CoverProps = {
  onSubmit: (categoryId: string) => void;
};

function Cover({ onSubmit }: CoverProps) {
  let { grouped: categoryGroups } = useCategories();
  categoryGroups = addToBeBudgetedGroup(
    categoryGroups.filter(g => !g.is_income),
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);

  function submit() {
    if (categoryId) {
      onSubmit(categoryId);
    }
  }
  return (
    <>
      <View style={{ marginBottom: 5 }}>Cover from category:</View>

      <InitialFocus>
        {node => (
          <CategoryAutocomplete
            categoryGroups={categoryGroups}
            value={categoryGroups.find(g => g.id === categoryId)}
            openOnFocus={true}
            onSelect={(id: string | undefined) => setCategoryId(id || null)}
            inputProps={{
              inputRef: node,
              onKeyDown: e => {
                if (e.key === 'Enter') {
                  submit();
                }
              },
              placeholder: '(none)',
            }}
            showHiddenCategories={false}
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
    </>
  );
}
