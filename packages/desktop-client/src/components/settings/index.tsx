import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';

import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { FormField, FormLabel } from '#components/forms';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { Page } from '#components/Page';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { loadPrefs, saveSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

import {
  AdvancedSection,
  ExperimentalSection,
  GeneralSection,
} from './sections';
import { SettingsNav } from './SettingsNav';
import {
  SettingsSubPageContext,
  useIsSettingsSubPage,
} from './SettingsSubPageContext';

const CONTENT_MAX_WIDTH = 530;

/**
 * Wraps one navigation entry's worth of settings. Sub-pages render their
 * sections inside this so they all share the same column width and spacing.
 */
export function SettingsSection({ children }: { children: ReactNode }) {
  // Inside the settings layout the shared content column supplies the top gap,
  // so every sub-page starts at the same height. On narrow layouts there is no
  // such column, so this keeps its own gap below the page header.
  const isSettingsSubPage = useIsSettingsSubPage();

  return (
    <View
      data-testid="settings"
      style={{
        marginTop: isSettingsSubPage ? 0 : 10,
        flexShrink: 0,
        maxWidth: CONTENT_MAX_WIDTH,
        width: '100%',
        gap: 30,
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      {children}
    </View>
  );
}

/**
 * The settings landing page. Wide layouts show one section at a time, chosen
 * from the settings navigation, so this is only the General section. Narrow
 * layouts have no navigation, so they keep the single scrolling page with
 * every section on it.
 */
export function SettingsIndex() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [budgetName] = useMetadataPref('budgetName');
  const dispatch = useDispatch();

  const onCloseBudget = () => {
    void dispatch(closeBudget());
  };

  if (!isNarrowWidth) {
    return (
      <SettingsSection>
        <GeneralSection />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection>
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
        <Button onPress={onCloseBudget} style={{ flexShrink: 0 }}>
          <Trans>Switch file</Trans>
        </Button>
      </View>
      <GeneralSection />
      <AdvancedSection />
      <ExperimentalSection />
    </SettingsSection>
  );
}

export function AdvancedSettings() {
  return (
    <SettingsSection>
      <AdvancedSection />
    </SettingsSection>
  );
}

export function ExperimentalSettings() {
  return (
    <SettingsSection>
      <ExperimentalSection />
    </SettingsSection>
  );
}

/**
 * Layout shared by every settings route. On wide layouts it renders the
 * settings navigation beside the active sub-page; on narrow layouts it gets
 * out of the way and renders the sub-page alone.
 */
export function Settings() {
  const { t } = useTranslation();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const dispatch = useDispatch();
  const isCurrencyExperimentalEnabled = useFeatureFlag('currency');
  const { isNarrowWidth } = useResponsive();

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
    return (
      <Page header={t('Settings')}>
        <Outlet />
      </Page>
    );
  }

  return (
    <Page
      header={t('Settings')}
      style={{
        marginInline: floatingSidebar ? 'auto' : 0,
      }}
    >
      {/* The content column scrolls on its own, so the navigation and the page
          title stay put on long pages such as Experimental. */}
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          // Gap below the page title. It sits on the row so the first nav
          // entry and the content start at the same height.
          paddingTop: 10,
        }}
      >
        <SettingsNav />
        <View style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <SettingsSubPageContext.Provider value>
            <Outlet />
          </SettingsSubPageContext.Provider>
        </View>
      </View>
    </Page>
  );
}
