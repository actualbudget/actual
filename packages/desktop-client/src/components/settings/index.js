import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import Platform from 'loot-core/src/client/platform';
import { listen } from 'loot-core/src/platform/client/fetch';
import { View, Text, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';
import { mobileStyles } from 'loot-design/src/style';
import { withThemeColor } from 'loot-design/src/util/withThemeColor';

import useServerVersion from '../../hooks/useServerVersion';
import { isMobile } from '../../util';
import { Page } from '../Page';
import EncryptionSettings from './Encryption';
import Export from './Export';
import FormatSettings from './Format';
import GlobalSettings from './Global';
import { ResetCache, ResetSync } from './Reset';
import { Section, AdvancedToggle } from './UI';

function About() {
  const version = useServerVersion();

  return (
    <Section title="About" style={{ gap: 5 }}>
      <Text>Client version: v{window.Actual.ACTUAL_VERSION}</Text>
      <Text>Server version: {version}</Text>
    </Section>
  );
}

function AdvancedAbout({ prefs }) {
  return (
    <>
      <Text>Budget ID: {prefs.id}</Text>
      <Text style={{ color: colors.n6 }}>
        Sync ID: {prefs.groupId || '(none)'}
      </Text>
    </>
  );
}

function Settings({
  loadPrefs,
  savePrefs,
  prefs,
  globalPrefs,
  pushModal,
  resetSync,
  closeBudget
}) {
  useEffect(() => {
    let unlisten = listen('prefs-updated', () => {
      loadPrefs();
    });

    loadPrefs();
    return () => unlisten();
  }, [loadPrefs]);

  return (
    <Page title="Settings">
      {/* The only spot to close a budget on mobile */}
      {isMobile() && (
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text
            style={[mobileStyles.text, { fontWeight: '600', fontSize: 17 }]}
          >
            {prefs.budgetName}
          </Text>
          <Button onClick={closeBudget} style={{ marginTop: 10 }}>
            Close Budget
          </Button>
        </View>
      )}

      <View style={{ flexShrink: 0, gap: 30, maxWidth: 600 }}>
        <About />

        {!Platform.isBrowser && (
          <GlobalSettings
            globalPrefs={globalPrefs}
            saveGlobalPrefs={this.props.saveGlobalPrefs}
          />
        )}

        <FormatSettings prefs={prefs} savePrefs={savePrefs} />
        <EncryptionSettings prefs={prefs} pushModal={pushModal} />
        <Export prefs={prefs} />

        <AdvancedToggle>
          <AdvancedAbout prefs={prefs} />
          <ResetCache />
          <ResetSync resetSync={resetSync} />
        </AdvancedToggle>
      </View>
    </Page>
  );
}

export default withThemeColor(colors.n10)(
  connect(
    state => ({
      prefs: state.prefs.local,
      globalPrefs: state.prefs.global
    }),
    actions
  )(Settings)
);
