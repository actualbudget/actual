import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import { isElectron } from '@actual-app/core/shared/environment';

import { getLatestAppVersion } from '#app/appSlice';
import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { Link } from '#components/common/Link';
import { Checkbox, FormField, FormLabel } from '#components/forms';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { MobilePageHeader, Page } from '#components/Page';
import { useServerVersion } from '#components/ServerContext';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { loadPrefs, saveSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch, useSelector } from '#redux';

import { AuthSettings } from './AuthSettings';
import { Backups } from './Backups';
import { BudgetTypeSettings } from './BudgetTypeSettings';
import { CurrencySettings } from './Currency';
import { EncryptionSettings } from './Encryption';
import { ExperimentalFeatures } from './Experimental';
import { ExportBudget } from './Export';
import { FormatSettings } from './Format';
import { LanguageSettings } from './LanguageSettings';
import { RepairTransactions } from './RepairTransactions';
import { ResetCache, ResetSync } from './Reset';
import { SettingsBackButton } from './SettingsBackButton';
import { SettingsGroup } from './SettingsGroup';
import { SettingsNav } from './SettingsNav';
import { SettingsRow } from './SettingsRow';
import { ThemeSettings } from './Themes';

function About() {
  const { t } = useTranslation();
  const version = useServerVersion();
  const versionInfo = useSelector(state => state.app.versionInfo);
  const [notifyWhenUpdateIsAvailable, setNotifyWhenUpdateIsAvailablePref] =
    useGlobalPref('notifyWhenUpdateIsAvailable', () => {
      void dispatch(getLatestAppVersion());
    });
  const dispatch = useDispatch();
  const [showNewsFeed, setShowNewsFeedPref] = useGlobalPref('showNewsFeed');
  const isNewsFeedEnabled = Boolean(showNewsFeed);

  return (
    <SettingsGroup
      title={t('About')}
      description={t(
        'Actual is a super fast, privacy-focused app for managing your finances.',
      )}
    >
      <SettingsRow
        title={t('Client version')}
        control={
          <Text data-vrt-mask style={styles.tnum}>
            {`v${window.Actual?.ACTUAL_VERSION}`}
          </Text>
        }
      />
      <SettingsRow
        title={t('Server version')}
        control={
          <Text data-vrt-mask style={styles.tnum}>
            {version}
          </Text>
        }
      />
      <SettingsRow
        title={t('Updates')}
        description={
          notifyWhenUpdateIsAvailable &&
          (versionInfo?.isOutdated ? (
            <Trans>New version available: {versionInfo.latestVersion}</Trans>
          ) : (
            <Text style={{ color: theme.noticeText, fontWeight: 600 }}>
              <Trans>You're up to date!</Trans>
            </Text>
          ))
        }
        control={
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Link
              variant="external"
              to="https://actualbudget.org/docs/releases"
              linkColor="purple"
            >
              <Trans>Release Notes</Trans>
            </Link>
            {isNewsFeedEnabled && (
              <Link variant="internal" to="/notifications">
                <Trans>Notifications</Trans>
              </Link>
            )}
          </View>
        }
      />
      <SettingsRow
        htmlFor="settings-notifyWhenUpdateIsAvailable"
        title={t('Update notifications')}
        description={t('Display a notification when updates are available.')}
        control={
          <Checkbox
            id="settings-notifyWhenUpdateIsAvailable"
            checked={notifyWhenUpdateIsAvailable}
            onChange={e =>
              setNotifyWhenUpdateIsAvailablePref(e.currentTarget.checked)
            }
            style={{ marginRight: 0 }}
          />
        }
      />
      <SettingsRow
        htmlFor="settings-showNewsFeed"
        title={t('In-app notifications')}
        description={t('Show release notes and announcements in the app.')}
        control={
          <Checkbox
            id="settings-showNewsFeed"
            checked={showNewsFeed}
            onChange={e => setShowNewsFeedPref(e.currentTarget.checked)}
            style={{ marginRight: 0 }}
          />
        }
      />
    </SettingsGroup>
  );
}

function AdvancedAbout() {
  const [budgetId] = useMetadataPref('id');
  const [groupId] = useMetadataPref('groupId');
  const { t } = useTranslation();
  const idStyle = { userSelect: 'text', wordBreak: 'break-all' } as const;

  return (
    <SettingsGroup
      title={t('Budget file')}
      description={t(
        'IDs are the names Actual uses to identify your budget internally.',
      )}
    >
      <SettingsRow
        title={t('Budget ID')}
        description={t('Identifies the budget file.')}
        control={<Text style={idStyle}>{budgetId}</Text>}
      />
      <SettingsRow
        title={t('Sync ID')}
        description={t('Used to access the budget on the server.')}
        control={<Text style={idStyle}>{groupId || t('(none)')}</Text>}
      />
    </SettingsGroup>
  );
}

type SettingsSectionsProps = {
  title: string;
  children: ReactNode;
};

function SettingsSections({ title, children }: SettingsSectionsProps) {
  const { isNarrowWidth } = useResponsive();

  const sections = (
    <View
      data-testid="settings"
      style={{
        marginTop: isNarrowWidth ? 10 : 0,
        flexShrink: 0,
        maxWidth: 640,
        width: '100%',
        gap: spacing.xl,
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      {children}
    </View>
  );

  if (!isNarrowWidth) {
    return sections;
  }

  return (
    <Page
      header={
        <MobilePageHeader title={title} leftContent={<SettingsBackButton />} />
      }
    >
      {sections}
    </Page>
  );
}

export function SettingsIndex() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [budgetName] = useMetadataPref('budgetName');
  const dispatch = useDispatch();

  if (!isNarrowWidth) {
    return <Navigate to="/settings/general" replace />;
  }

  return (
    <Page header={t('Settings')}>
      <View
        data-testid="settings"
        style={{
          marginTop: 10,
          flexShrink: 0,
          gap: 30,
          paddingBottom: MOBILE_NAV_HEIGHT,
        }}
      >
        <View
          style={{
            gap: 10,
            flexDirection: 'row',
            alignItems: 'flex-end',
            width: '100%',
          }}
        >
          {/* The only spot to close a budget on mobile */}
          <FormField style={{ flex: 1 }}>
            <FormLabel title={t('Budget name')} />
            <Input
              value={budgetName}
              disabled
              style={{ color: theme.buttonNormalDisabledText }}
            />
          </FormField>
          <Button
            onPress={() => void dispatch(closeBudget())}
            style={{ flexShrink: 0 }}
          >
            <Trans>Switch file</Trans>
          </Button>
        </View>
        <SettingsNav />
      </View>
    </Page>
  );
}

export function GeneralSettings() {
  const { t } = useTranslation();
  const isCurrencyExperimentalEnabled = useFeatureFlag('currency');

  return (
    <SettingsSections title={t('General')}>
      <About />
      <ThemeSettings />
      <FormatSettings />
      {isCurrencyExperimentalEnabled && <CurrencySettings />}
      <LanguageSettings />
      <SettingsGroup title={t('Budget')}>
        <BudgetTypeSettings />
      </SettingsGroup>
      <SettingsGroup title={t('Security')}>
        <AuthSettings />
        <EncryptionSettings />
      </SettingsGroup>
      <SettingsGroup title={t('Data')}>
        {isElectron() && <Backups />}
        <ExportBudget />
      </SettingsGroup>
    </SettingsSections>
  );
}

export function AdvancedSettings() {
  const { t } = useTranslation();

  return (
    <SettingsSections title={t('Advanced')}>
      <AdvancedAbout />
      <SettingsGroup title={t('Troubleshooting')}>
        <ResetCache />
        <ResetSync />
        <RepairTransactions />
      </SettingsGroup>
    </SettingsSections>
  );
}

export function ExperimentalSettings() {
  const { t } = useTranslation();

  return (
    <SettingsSections title={t('Experimental')}>
      <ExperimentalFeatures />
    </SettingsSections>
  );
}

export function Settings() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const dispatch = useDispatch();
  const isCurrencyExperimentalEnabled = useFeatureFlag('currency');

  useEffect(() => {
    const unlisten = listen('prefs-updated', () => {
      void dispatch(loadPrefs());
    });

    void dispatch(loadPrefs());
    return () => unlisten();
  }, [dispatch]);

  useEffect(() => {
    if (!isCurrencyExperimentalEnabled) {
      void dispatch(saveSyncedPrefs({ prefs: { defaultCurrencyCode: '' } }));
    }
  }, [dispatch, isCurrencyExperimentalEnabled]);

  if (isNarrowWidth) {
    return <Outlet />;
  }

  return (
    <Page header={t('Settings')}>
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          gap: spacing.xl,
          paddingTop: 10,
        }}
      >
        <SettingsNav />
        <View style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </View>
      </View>
    </Page>
  );
}
