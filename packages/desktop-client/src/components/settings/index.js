import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import Platform from 'loot-core/src/client/platform';
import { listen } from 'loot-core/src/platform/client/fetch';
import { View, Text } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import useServerVersion from '../../hooks/useServerVersion';
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
    <Section title="About">
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
  resetSync
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

export default connect(
  state => ({
    prefs: state.prefs.local,
    globalPrefs: state.prefs.global
  }),
  actions
)(Settings);
