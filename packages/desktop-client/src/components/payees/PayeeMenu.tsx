import { useTranslation, Trans } from 'react-i18next';

import { type PayeeEntity } from 'loot-core/src/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { SvgDelete, SvgMerge } from '../../icons/v0';
import { SvgBookmark, SvgLightBulb } from '../../icons/v1';
import { theme } from '../../style';
import { Menu, type MenuItem } from '../common/Menu';
import { View } from '../common/View';

type PayeeMenuProps = {
  payeesById: Record<PayeeEntity['id'], PayeeEntity>;
  selectedPayees: Set<PayeeEntity['id']>;
  onDelete: () => void;
  onMerge: () => Promise<void>;
  onFavorite: () => void;
  onLearn: () => void;
  onClose: () => void;
};

export function PayeeMenu({
  payeesById,
  selectedPayees,
  onDelete,
  onMerge,
  onFavorite,
  onLearn,
  onClose,
}: PayeeMenuProps) {
  const { t } = useTranslation();
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  // Transfer accounts are never editable
  const isDisabled = [...selectedPayees].some(
    id => payeesById[id] == null || payeesById[id].transfer_acct,
  );

  const selectedPayeeNames = [...selectedPayees]
    .slice(0, 4)
    .map(id => payeesById[id].name)
    .join(', ');

  const items: MenuItem[] = [
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
      disabled: isDisabled || selectedPayees.size < 2,
    },
  ];

  if (isLearnCategoriesEnabled) {
    items.push({
      icon: SvgLightBulb,
      iconSize: 9,
      name: 'learn',
      text: t('Category Learning'),
      disabled: isDisabled,
    });
  }

  items.push(Menu.line);

  return (
    <Menu
      onMenuSelect={type => {
        onClose();
        switch (type) {
          case 'delete':
            onDelete();
            break;
          case 'merge':
            onMerge();
            break;
          case 'favorite':
            onFavorite();
            break;
          case 'learn':
            onLearn();
            break;
          default:
        }
      }}
      footer={
        <View
          style={{
            padding: 3,
            fontSize: 11,
            fontStyle: 'italic',
            color: theme.pageTextSubdued,
          }}
        >
          {selectedPayees.size > 4 ? (
            <Trans>{{ selectedPayeeNames }}, and more</Trans>
          ) : (
            selectedPayeeNames
          )}
        </View>
      }
      items={items}
    />
  );
}
