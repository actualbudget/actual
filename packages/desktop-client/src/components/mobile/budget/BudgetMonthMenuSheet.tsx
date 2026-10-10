import { useTranslation } from 'react-i18next';

import type { MenuItemObject } from '@actual-app/components/menu';
import * as monthUtils from '@actual-app/core/shared/months';
import type { NoteEntity } from '@actual-app/core/types/models';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useUndo } from '#hooks/useUndo';
import type { Modal as ModalType } from '#modals/modalsSlice';

type BudgetMonthMenuSheetProps = {
  name: Extract<
    ModalType['name'],
    'envelope-budget-month-menu' | 'tracking-budget-month-menu'
  >;
  month: string;
  items: MenuItemObject<string>[];
  onMenuSelect: (name: string) => void;
  undoMessages: Record<string, string>;
  onEditNotes: (id: NoteEntity['id']) => void;
};

export function BudgetMonthMenuSheet({
  name,
  month,
  items,
  onMenuSelect,
  undoMessages,
  onEditNotes,
}: BudgetMonthMenuSheetProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const notes = useNotes(`budget-${month}`);
  const { showUndoNotification } = useUndo();

  return (
    <MobileSheet
      name={name}
      title={monthUtils.format(month, "MMMM ''yy", locale)}
    >
      {({ close }) => (
        <>
          {notes && <MobileSheetNotes notes={notes} />}

          <MobileSheetSection title={t('Month')}>
            <MobileSheetRow
              label={t('Edit notes')}
              onPress={() => onEditNotes(month)}
            />
          </MobileSheetSection>

          <MobileSheetSection title={t('Budget')}>
            <MobileSheetMenuRows
              items={items}
              onSelect={itemName => {
                onMenuSelect(itemName);
                close();
                const message = undoMessages[itemName];
                if (message) {
                  showUndoNotification({ message });
                }
              }}
            />
          </MobileSheetSection>
        </>
      )}
    </MobileSheet>
  );
}
