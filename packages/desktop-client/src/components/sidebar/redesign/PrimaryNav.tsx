import { useTranslation } from 'react-i18next';

import { SvgReports, SvgWallet } from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { NavRow } from './NavRow';

export function PrimaryNav() {
  const { t } = useTranslation();

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
    </View>
  );
}
