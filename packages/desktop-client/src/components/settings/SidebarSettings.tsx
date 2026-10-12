import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function SidebarSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <SettingsGroup title={t('Sidebar')}>
      <SettingsRow
        title={t('Sidebar menu')}
        description={t(
          'Choose which pages appear in the sidebar, their order and the page Actual shows when it opens. Pages you switch off can be found here in Settings.',
        )}
        control={
          <Button
            onPress={() =>
              dispatch(pushModal({ modal: { name: 'sidebar-menu' } }))
            }
          >
            <Trans>Customize</Trans>
          </Button>
        }
      />
    </SettingsGroup>
  );
}
