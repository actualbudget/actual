import type { MenuItemObject } from '@actual-app/components/menu';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategoryGroup } from '#hooks/useCategoryGroup';
import type { Modal as ModalType } from '#modals/modalsSlice';

type GroupBudgetMenuSheetProps = {
  name: Extract<
    ModalType['name'],
    'envelope-group-budget-menu' | 'tracking-group-budget-menu'
  >;
  groupId: CategoryGroupEntity['id'];
  items: MenuItemObject<string>[];
  onMenuSelect: (name: string) => void;
};

export function GroupBudgetMenuSheet({
  name,
  groupId,
  items,
  onMenuSelect,
}: GroupBudgetMenuSheetProps) {
  const { data: group } = useCategoryGroup(groupId);

  if (!group) {
    return null;
  }

  return (
    <MobileSheet name={name} title={group.name}>
      {({ close }) => (
        <MobileSheetSection>
          <MobileSheetMenuRows
            items={items}
            onSelect={itemName => {
              onMenuSelect(itemName);
              close();
            }}
          />
        </MobileSheetSection>
      )}
    </MobileSheet>
  );
}
