import { useTranslation } from 'react-i18next';

import { Menu, type MenuItem } from '@actual-app/components/menu';

export type PayeeOrphanDisplayMode =
  | 'include-orphans'
  | 'hide-orphans'
  | 'only-orphans';

export function getPayeeOrphanDisplayModeTitle(
  t: (key: string) => string,
  mode: PayeeOrphanDisplayMode,
) {
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
    ] as PayeeOrphanDisplayMode[]
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
