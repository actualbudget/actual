import React, { type ReactNode, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { media } from 'glamor';

import * as Platform from 'loot-core/src/client/platform';
import { listen } from 'loot-core/src/platform/client/fetch';

import { useActions } from '../../hooks/useActions';
import useFeatureFlag from '../../hooks/useFeatureFlag';
import useLatestVersion, { useIsOutdated } from '../../hooks/useLatestVersion';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import tokens from '../../tokens';
import Button from '../common/Button';
import ExternalLink from '../common/ExternalLink';
import Input from '../common/Input';
import Text from '../common/Text';
import View from '../common/View';
import { FormField, FormLabel } from '../forms';
import { Page } from '../Page';
import { useServerVersion } from '../ServerContext';

import EncryptionSettings from './Encryption';
import ExperimentalFeatures from './Experimental';
import ExportBudget from './Export';
import FixSplitsTool from './FixSplits';
import FormatSettings from './Format';
import GlobalSettings from './Global';
import { ResetCache, ResetSync } from './Reset';
import ThemeSettings from './Themes';
import { AdvancedToggle, Setting } from './UI';

function About() {
  const version = useServerVersion();
  const latestVersion = useLatestVersion();
  const isOutdated = useIsOutdated();

  return (
    <Setting>
      <Text>
        <strong>Actual</strong> is a super fast privacy-focused app for managing
        your finances.
      </Text>
      <View
        style={{
          flexDirection: 'column',
          gap: 10,
        }}
        className={`${media(`(min-width: ${tokens.breakpoint_small})`, {
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: '50% 50%',
          columnGap: '2em',
          gridAutoFlow: 'column',
        })}`}
        data-vrt-mask
      >
        <Text>Client version: v{window.Actual.ACTUAL_VERSION}</Text>
        <Text>Server version: {version}</Text>
        {isOutdated ? (
          <ExternalLink
            to="https://actualbudget.org/docs/releases"
            linkColor="purple"
          >
            New version available: {latestVersion}
          </ExternalLink>
        ) : (
          <Text style={{ color: theme.alt2NoticeText, fontWeight: 600 }}>
            You’re up to date!
          </Text>
        )}
        <Text>
          <ExternalLink to="https://actualbudget.org/docs/releases">
            Release Notes
          </ExternalLink>
        </Text>
      </View>
    </Setting>
  );
}

function IDName({ children }: { children: ReactNode }) {
  return <Text style={{ fontWeight: 500 }}>{children}</Text>;
}

function AdvancedAbout() {
  let budgetId = useSelector(state => state.prefs.local.id);
  let groupId = useSelector(state => state.prefs.local.groupId);

  return (
    <Setting>
      <Text>
        <strong>IDs</strong> are the names Actual uses to identify your budget
        internally. There are several different IDs associated with your budget.
        The Budget ID is used to identify your budget file. The Sync ID is used
        to access the budget on the server.
      </Text>
      <Text>
        <IDName>Budget ID:</IDName> {budgetId}
      </Text>
      <Text style={{ color: theme.pageText }}>
        <IDName>Sync ID:</IDName> {groupId || '(none)'}
      </Text>
      {/* low priority todo: eliminate some or all of these, or decide when/if to show them */}
      {/* <Text>
        <IDName>Cloud File ID:</IDName> {prefs.cloudFileId || '(none)'}
      </Text>
      <Text>
        <IDName>User ID:</IDName> {prefs.userId || '(none)'}
      </Text> */}
    </Setting>
  );
}

export default function Settings() {
  let floatingSidebar = useSelector(
    state => state.prefs.global.floatingSidebar,
  );
  let budgetName = useSelector(state => state.prefs.local.budgetName);

  let { loadPrefs, closeBudget } = useActions();

  useEffect(() => {
    let unlisten = listen('prefs-updated', () => {
      loadPrefs();
    });

    loadPrefs();
    return () => unlisten();
  }, [loadPrefs]);

  const { isNarrowWidth } = useResponsive();
  const themesFlag = useFeatureFlag('themes');

  useSetThemeColor(theme.mobileSettingsViewTheme);
  return (
    <View
      style={{
        marginInline: floatingSidebar && !isNarrowWidth ? 'auto' : 0,
      }}
    >
      <Page
        title="Settings"
        titleStyle={
          isNarrowWidth
            ? {
                backgroundColor: theme.menuItemBackground,
                color: theme.menuItemText,
              }
            : undefined
        }
      >
        <View style={{ flexShrink: 0, gap: 30 }}>
          {isNarrowWidth && (
            <View
              style={{ gap: 10, flexDirection: 'row', alignItems: 'flex-end' }}
            >
              {/* The only spot to close a budget on mobile */}
              <FormField>
                <FormLabel title="Budget Name" />
                <Input
                  value={budgetName}
                  disabled
                  style={{ color: theme.buttonNormalDisabledText }}
                />
              </FormField>
              <Button onClick={closeBudget}>Close Budget</Button>
            </View>
          )}

          <About />

          {!Platform.isBrowser && <GlobalSettings />}

          {themesFlag && <ThemeSettings />}
          <FormatSettings />
          <EncryptionSettings />
          <ExportBudget />

          <AdvancedToggle>
            <AdvancedAbout />
            <ResetCache />
            <ResetSync />
            <FixSplitsTool />
            <ExperimentalFeatures />
          </AdvancedToggle>
        </View>
      </Page>
    </View>
  );
}
