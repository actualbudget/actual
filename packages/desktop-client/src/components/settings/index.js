import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import { css, media } from 'glamor';

import * as actions from 'loot-core/src/client/actions';
import Platform from 'loot-core/src/client/platform';
import { listen } from 'loot-core/src/platform/client/fetch';
import { View, Text, Button, Input } from 'loot-design/src/components/common';
import { FormField, FormLabel } from 'loot-design/src/components/forms';
import { colors } from 'loot-design/src/style';
import tokens from 'loot-design/src/tokens';
import { withThemeColor } from 'loot-design/src/util/withThemeColor';

import useServerVersion from '../../hooks/useServerVersion';
import { isMobile } from '../../util';
import { Page } from '../Page';

import EncryptionSettings from './Encryption';
import ExperimentalFeatures from './Experimental';
import ExportBudget from './Export';
import FixSplitsTool from './FixSplits';
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
    <View
      style={{
        marginInline: globalPrefs.floatingSidebar && !isMobile() ? 'auto' : 0
      }}
    >
      <Page title="Settings">
        <View style={{ flexShrink: 0, gap: 30 }}>
          {/* The only spot to close a budget on mobile */}
          <Section
            title="Budget"
            style={css(
              media(`(min-width: ${tokens.breakpoint_medium})`, {
                display: 'none'
              })
            )}
          >
            <FormField>
              <FormLabel title="Name" />
              <Input
                value={prefs.budgetName}
                disabled
                style={{ color: '#999' }}
              />
            </FormField>
            <Button onClick={closeBudget}>Close Budget</Button>
          </Section>

          <About />

          {!Platform.isBrowser && (
            <GlobalSettings
              globalPrefs={globalPrefs}
              saveGlobalPrefs={this.props.saveGlobalPrefs}
            />
          )}

          <FormatSettings prefs={prefs} savePrefs={savePrefs} />
          <EncryptionSettings prefs={prefs} pushModal={pushModal} />
          <ExportBudget prefs={prefs} />

          <AdvancedToggle>
            <AdvancedAbout prefs={prefs} />
            <ResetCache />
            <ResetSync resetSync={resetSync} />
            <FixSplitsTool />
            <ExperimentalFeatures prefs={prefs} savePrefs={savePrefs} />
          </AdvancedToggle>
        </View>
      </Page>
    </View>
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
