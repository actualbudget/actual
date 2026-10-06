import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgCog,
  SvgColorPalette,
  SvgLibrary,
  SvgPylon,
  SvgTag,
  SvgTuning,
  SvgUserGroup,
} from '@actual-app/components/icons/v1';
import { SvgSettingsSliderAlternate } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';

import { SettingsNavLink } from './SettingsNavLink';

export function SettingsNav() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const syncServerStatus = useSyncServerStatus();
  const isTestEnv = useIsTestEnv();
  const isUsingServer = syncServerStatus !== 'no-server' || isTestEnv;

  return (
    <View
      role="navigation"
      aria-label={t('Settings')}
      style={
        isNarrowWidth
          ? {
              flexShrink: 0,
              backgroundColor: theme.settingsCardBackground,
              border: `1px solid ${theme.settingsCardBorder}`,
              borderRadius: 6,
            }
          : { width: 180, flexShrink: 0, gap: spacing.xxs }
      }
    >
      <SettingsNavLink
        title={t('General')}
        Icon={SvgCog}
        to="/settings/general"
      />
      <SettingsNavLink
        title={t('Appearance')}
        Icon={SvgColorPalette}
        to="/settings/appearance"
      />
      <SettingsNavLink
        title={t('Payees')}
        Icon={SvgUserGroup}
        to="/settings/payees"
      />
      {!isNarrowWidth && (
        <SettingsNavLink title={t('Tags')} Icon={SvgTag} to="/settings/tags" />
      )}
      <SettingsNavLink
        title={t('Rules')}
        Icon={SvgTuning}
        to="/settings/rules"
      />
      {isUsingServer && (
        <SettingsNavLink
          title={t('Bank Sync')}
          Icon={SvgLibrary}
          to="/settings/bank-sync"
        />
      )}
      <SettingsNavLink
        title={t('Advanced')}
        Icon={SvgSettingsSliderAlternate}
        to="/settings/advanced"
      />
      <SettingsNavLink
        title={t('Experimental')}
        Icon={SvgPylon}
        to="/settings/experimental"
      />
    </View>
  );
}
