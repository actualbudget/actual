import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';

import {
  MOBILE_TAB_PAGES,
  parseMobileStartPage,
} from '#components/mobile/mobileStartPage';
import { useMobileTabPageDetails } from '#components/mobile/useMobileTabPageDetails';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function MobileStartPageSettings() {
  const { t } = useTranslation();
  const [startPagePref, setStartPagePref] = useSyncedPref('mobile-start-page');
  const tabPageDetails = useMobileTabPageDetails();

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
            options={MOBILE_TAB_PAGES.map(({ id }) => [
              id,
              tabPageDetails[id].title,
            ])}
          />
        }
      />
    </SettingsGroup>
  );
}
