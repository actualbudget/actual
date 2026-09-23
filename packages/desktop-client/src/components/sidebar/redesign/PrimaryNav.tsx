import { useTranslation } from 'react-i18next';

import {
  SvgLibrary,
  SvgReports,
  SvgTag,
  SvgTuning,
  SvgUserGroup,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';

import { NavRow } from './NavRow';

export function PrimaryNav() {
  const { t } = useTranslation();
  const syncServerStatus = useSyncServerStatus();
  const isTestEnv = useIsTestEnv();
  const isUsingServer = syncServerStatus !== 'no-server' || isTestEnv;

  return (
    <View
      data-testid="sidebar-primary-buttons"
      style={{
        flexShrink: 0,
        padding: `${spacing.xs}px ${spacing.sm}px 0`,
      }}
    >
      <NavRow title={t('Budget')} Icon={SvgWallet} to="/budget" />
      <NavRow title={t('Reports')} Icon={SvgReports} to="/reports" />
      <NavRow title={t('Schedules')} Icon={SvgCalendar3} to="/schedules" />
      <NavRow title={t('Payees')} Icon={SvgUserGroup} to="/payees" />
      <NavRow title={t('Rules')} Icon={SvgTuning} to="/rules" />
      {isUsingServer && (
        <NavRow title={t('Bank Sync')} Icon={SvgLibrary} to="/bank-sync" />
      )}
      <NavRow title={t('Tags')} Icon={SvgTag} to="/tags" />
    </View>
  );
}
