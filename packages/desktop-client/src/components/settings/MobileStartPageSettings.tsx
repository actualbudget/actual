import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';

import { parseMobileStartPage } from '#components/mobile/mobileStartPage';
import type { MobileStartPageId } from '#components/mobile/mobileStartPage';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function MobileStartPageSettings() {
  const { t } = useTranslation();
  const [startPagePref, setStartPagePref] = useSyncedPref('mobile-start-page');

  const options: Array<[MobileStartPageId, string]> = [
    ['budget', t('Budget')],
    ['accounts', t('Accounts')],
    ['reports', t('Reports')],
  ];

  return (
    <SettingsGroup title={t('Navigation')}>
      <SettingsRow
        title={t('Start page')}
        description={t("Actual's home page.")}
        htmlFor="settings-mobileStartPage"
        control={
          <Select
            id="settings-mobileStartPage"
            value={parseMobileStartPage(startPagePref)}
            onChange={setStartPagePref}
            options={options}
          />
        }
      />
    </SettingsGroup>
  );
}
