import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import { media } from 'glamor';

import * as actions from 'loot-core/src/client/actions';
import * as Platform from 'loot-core/src/client/platform';
import { listen } from 'loot-core/src/platform/client/fetch';

import useLatestVersion, { useIsOutdated } from '../../hooks/useLatestVersion';
import { useResponsive } from '../../ResponsiveProvider';
import { colors } from '../../style';
import tokens from '../../tokens';
import { withThemeColor } from '../../util/withThemeColor';
import { View, Text, Button, Input, ExternalLink } from '../common';
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
        style={[
          { flexDirection: 'column', gap: 10 },
          media(`(min-width: ${tokens.breakpoint_small})`, {
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
            gridTemplateColumns: '50% 50%',
            columnGap: '2em',
            gridAutoFlow: 'column',
          }),
        ]}
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
          <Text style={{ color: colors.g2, fontWeight: 600 }}>
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

function IDName({ children }) {
  return <Text style={{ fontWeight: 500 }}>{children}</Text>;
}

function AdvancedAbout({ prefs }) {
  return (
    <Setting>
      <Text>
        <strong>IDs</strong> are the names Actual uses to identify your budget
        internally. There are several different IDs associated with your budget.
        The Budget ID is used to identify your budget file. The Sync ID is used
        to access the budget on the server.
      </Text>
      <Text>
        <IDName>Budget ID:</IDName> {prefs.id}
      </Text>
      <Text style={{ color: colors.n5 }}>
        <IDName>Sync ID:</IDName> {prefs.groupId || '(none)'}
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

function Settings({
  loadPrefs,
  savePrefs,
  saveGlobalPrefs,
  prefs,
  globalPrefs,
  pushModal,
  resetSync,
  closeBudget,
}) {
  useEffect(() => {
    let unlisten = listen('prefs-updated', () => {
      loadPrefs();
    });

    loadPrefs();
    return () => unlisten();
  }, [loadPrefs]);

  const { isNarrowWidth } = useResponsive();

  return (
    <View
      style={{
        marginInline:
          globalPrefs.floatingSidebar && !isNarrowWidth ? 'auto' : 0,
      }}
    >
      <Page
        title="Settings"
        titleStyle={
          isNarrowWidth
            ? {
                backgroundColor: colors.n11,
                color: colors.n1,
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
                  value={prefs.budgetName}
                  disabled
                  style={{ color: '#999' }}
                />
              </FormField>
              <Button onClick={closeBudget}>Close Budget</Button>
            </View>
          )}

          <About />

          {!Platform.isBrowser && (
            <GlobalSettings
              globalPrefs={globalPrefs}
              saveGlobalPrefs={saveGlobalPrefs}
            />
          )}

          <FormatSettings prefs={prefs} savePrefs={savePrefs} />
          <EncryptionSettings prefs={prefs} pushModal={pushModal} />
          <ExportBudget prefs={prefs} />

          <AdvancedToggle>
            <AdvancedAbout prefs={prefs} />
            <ResetCache />
            <ResetSync isEnabled={!!prefs.groupId} resetSync={resetSync} />
            <FixSplitsTool />
            <ExperimentalFeatures prefs={prefs} savePrefs={savePrefs} />
          </AdvancedToggle>
        </View>
      </Page>
    </View>
  );
}

export default withThemeColor(colors.n11)(
  connect(
    state => ({
      prefs: state.prefs.local,
      globalPrefs: state.prefs.global,
    }),
    actions,
  )(Settings),
);
