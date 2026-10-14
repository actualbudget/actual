import { Trans, useTranslation } from 'react-i18next';

import { SvgDelete, SvgMerge } from '@actual-app/components/icons/v0';
import { SvgBookmark, SvgLightBulb } from '@actual-app/components/icons/v1';
import type { MenuItemObject } from '@actual-app/components/menu';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { PayeeEntity } from '@actual-app/core/types/models';

import { SelectedItemsButton } from '#components/table';
import { useSelectedItems } from '#hooks/useSelected';
import { useSyncedPref } from '#hooks/useSyncedPref';

type Actions = 'delete' | 'favorite' | 'merge' | 'learn';

type SelectedPayeesButtonProps = {
  payeesById: Record<PayeeEntity['id'], PayeeEntity>;
  onDelete: () => void;
  onMerge: () => Promise<void>;
  onFavorite: () => void;
  onLearn: () => void;
};

export function SelectedPayeesButton({
  payeesById,
  onDelete,
  onMerge,
  onFavorite,
  onLearn,
}: SelectedPayeesButtonProps) {
  const { t } = useTranslation();
  const selectedItems = useSelectedItems();
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  // Transfer accounts are never editable
  const isDisabled = [...selectedItems].some(
    id => payeesById[id] == null || payeesById[id].transfer_acct,
  );

  const selectedPayeeNames = [...selectedItems]
    .slice(0, 4)
    .map(id => payeesById[id]?.name)
    .filter(name => name != null)
    .join(', ');

  function handleSelect(name: Actions) {
    if (name === 'delete') {
      onDelete();
    } else if (name === 'merge') {
      void onMerge();
    } else if (name === 'favorite') {
      onFavorite();
    } else if (name === 'learn') {
      onLearn();
    }
  }

  return (
    <SelectedItemsButton<Actions>
      id="selected-payees"
      name={count => t('{{count}} payees', { count })}
      items={[
        {
          icon: SvgDelete,
          name: 'delete',
          text: t('Delete'),
          disabled: isDisabled,
        },
        {
          icon: SvgBookmark,
          iconSize: 9,
          name: 'favorite',
          text: t('Favorite'),
          disabled: isDisabled,
        },
        {
          icon: SvgMerge,
          iconSize: 9,
          name: 'merge',
          text: t('Merge'),
          disabled: isDisabled || selectedItems.size < 2,
        },
        ...(isLearnCategoriesEnabled
          ? [
              {
                icon: SvgLightBulb,
                iconSize: 9,
                name: 'learn',
                text: t('Category Learning'),
                disabled: isDisabled,
              } satisfies MenuItemObject<Actions>,
            ]
          : []),
      ]}
      onSelect={handleSelect}
      footer={
        <View
          style={{
            padding: spacing.xs,
            fontSize: 11,
            fontStyle: 'italic',
            color: theme.pageTextSubdued,
          }}
        >
          {selectedItems.size > 4 ? (
            <Trans>{{ selectedPayeeNames }}, and more</Trans>
          ) : (
            selectedPayeeNames
          )}
        </View>
      }
    />
  );
}
