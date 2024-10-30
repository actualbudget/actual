import React, { type ReactNode, useEffect } from 'react';

import { css } from '@emotion/css';

import { isElectron } from 'loot-core/shared/environment';
import { listen } from 'loot-core/src/platform/client/fetch';

import { useActions } from '../../hooks/useActions';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useIsOutdated, useLatestVersion } from '../../hooks/useLatestVersion';
import { useMetadataPref } from '../../hooks/useMetadataPref';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { tokens } from '../../tokens';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { Page } from '../Page';
import { useServerVersion } from '../ServerContext';

import { Backups } from './Backups';
import { BudgetTypeSettings } from './BudgetTypeSettings';
import { EncryptionSettings } from './Encryption';
import { ExperimentalFeatures } from './Experimental';
import { ExportBudget } from './Export';
import { FixSplits } from './FixSplits';
import { FormatSettings } from './Format';
import { ResetCache, ResetSync } from './Reset';
import { ThemeSettings } from './Themes';
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
        className={css({
          [`@media (min-width: ${tokens.breakpoint_small})`]: {
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
            gridTemplateColumns: '50% 50%',
            columnGap: '2em',
            gridAutoFlow: 'column',
          },
        })}
        data-vrt-mask
      >
        <Text>Client version: v{window.Actual?.ACTUAL_VERSION}</Text>
        <Text>Server version: {version}</Text>
        {isOutdated ? (
          <Link
            variant="external"
            to="https://actualbudget.org/docs/releases"
            linkColor="purple"
          >
            New version available: {latestVersion}
          </Link>
        ) : (
          <Text style={{ color: theme.noticeText, fontWeight: 600 }}>
            You’re up to date!
          </Text>
        )}
        <Text>
          <Link
            variant="external"
            to="https://actualbudget.org/docs/releases"
            linkColor="purple"
          >
            Release Notes
          </Link>
        </Text>
      </View>
    </Setting>
  );
}

function IDName({ children }: { children: ReactNode }) {
  return <Text style={{ fontWeight: 500 }}>{children}</Text>;
}

function AdvancedAbout() {
  const [budgetId] = useMetadataPref('id');
  const [groupId] = useMetadataPref('groupId');

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

export function Settings() {
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const [budgetName] = useMetadataPref('budgetName');

  const { loadPrefs, closeBudget } = useActions();

  useEffect(() => {
    const unlisten = listen('prefs-updated', () => {
      loadPrefs();
    });

    loadPrefs();
    return () => unlisten();
  }, [loadPrefs]);

  const { isNarrowWidth } = useResponsive();

  return (
    <Page
      header="Settings"
      style={{
        marginInline: floatingSidebar && !isNarrowWidth ? 'auto' : 0,
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      <View
        style={{
          marginTop: 10,
          flexShrink: 0,
          maxWidth: 530,
          gap: 30,
        }}
      >
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
            <Button onPress={closeBudget}>Close Budget</Button>
          </View>
        )}
        <About />
        <ThemeSettings />
        <FormatSettings />
        <EncryptionSettings />
        {useFeatureFlag('reportBudget') && <BudgetTypeSettings />}
        {isElectron() && <Backups />}
        <ExportBudget />
        <AdvancedToggle>
          <AdvancedAbout />
          <ResetCache />
          <ResetSync />
          <FixSplits />
          <ExperimentalFeatures />
        </AdvancedToggle>
      </View>
    </Page>
  );
}
