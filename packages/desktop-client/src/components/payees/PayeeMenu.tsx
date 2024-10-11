import { type PayeeEntity } from 'loot-core/src/types/models';

import { SvgDelete, SvgMerge } from '../../icons/v0';
import { SvgBookmark } from '../../icons/v1';
import { theme } from '../../style';
import { Menu } from '../common/Menu';
import { View } from '../common/View';

type PayeeMenuProps = {
  payeesById: Record<PayeeEntity['id'], PayeeEntity>;
  selectedPayees: Set<PayeeEntity['id']>;
  onDelete: () => void;
  onMerge: () => Promise<void>;
  onFavorite: () => void;
  onClose: () => void;
};

export function PayeeMenu({
  payeesById,
  selectedPayees,
  onDelete,
  onMerge,
  onFavorite,
  onClose,
}: PayeeMenuProps) {
  // Transfer accounts are never editable
  const isDisabled = [...selectedPayees].some(
    id => payeesById[id] == null || payeesById[id].transfer_acct,
  );

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
          {[...selectedPayees]
            .slice(0, 4)
            .map(id => payeesById[id].name)
            .join(', ') + (selectedPayees.size > 4 ? ', and more' : '')}
        </View>
      }
      items={[
        {
          icon: SvgDelete,
          name: 'delete',
          text: 'Delete',
          disabled: isDisabled,
        },
        {
          icon: SvgBookmark,
          iconSize: 9,
          name: 'favorite',
          text: 'Favorite',
          disabled: isDisabled,
        },
        {
          icon: SvgMerge,
          iconSize: 9,
          name: 'merge',
          text: 'Merge',
          disabled: isDisabled || selectedPayees.size < 2,
        },
        Menu.line,
      ]}
    />
  );
}
