import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';

import type { PayeeOrphanDisplayMode } from 'loot-core/types/prefs';

export function getPayeeOrphanDisplayModeTitle(
  t: (key: string) => string,
  mode: PayeeOrphanDisplayMode,
): string {
  return {
    'include-orphans': t('All Payees'),
    'only-orphans': t('Unused Payees Only'),
    'hide-orphans': t('Used Payees Only'),
  }[mode];
}

type PayeeOrphanDisplayModeMenuProps = {
  currentMode: PayeeOrphanDisplayMode;
  onDisplayMode: (mode: PayeeOrphanDisplayMode) => void;
  onClose: () => void;
};

export function PayeeOrphanDisplayModeMenu({
  currentMode,
  onDisplayMode,
  onClose,
}: PayeeOrphanDisplayModeMenuProps) {
  const { t } = useTranslation();

  const items: MenuItem<PayeeOrphanDisplayMode>[] = (
    [
      'include-orphans',
      'only-orphans',
      'hide-orphans',
    ] satisfies PayeeOrphanDisplayMode[]
  ).map(mode => ({
    name: mode,
    text: getPayeeOrphanDisplayModeTitle(t, mode),
    disabled: currentMode === mode,
  }));

  return (
    <Menu
      onMenuSelect={type => {
        onClose();
        onDisplayMode(type);
      }}
      items={items}
    />
  );
}
