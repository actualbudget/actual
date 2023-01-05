import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import { css } from 'glamor';

import * as actions from 'loot-core/src/client/actions';
import Platform from 'loot-core/src/client/platform';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { numberFormats } from 'loot-core/src/shared/util';
import { Information } from 'loot-design/src/components/alerts';
import {
  View,
  Text,
  Button,
  Link,
  ButtonWithLoading
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import useServerVersion from '../hooks/useServerVersion';
import { Page } from './Page';

let dateFormats = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' }
];

function Section({ title, children, style, titleProps, ...props }) {
  return (
    <View style={[{ gap: 20, alignItems: 'flex-start' }, style]} {...props}>
      <View
        style={[
          { fontSize: 20, fontWeight: 500, flexShrink: 0 },
          titleProps && titleProps.style
        ]}
        {...titleProps}
      >
        {title}
      </View>
      {children}
    </View>
  );
}

function ButtonSetting({ button, children, onClick }) {
  return (
    <View
      style={{
        backgroundColor: colors.n9,
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        padding: 15,
        borderRadius: 4,
        border: '1px solid ' + colors.n8
      }}
    >
      <View
        style={{ marginBottom: 10, maxWidth: 500, lineHeight: 1.5, gap: 10 }}
      >
        {children}
      </View>
      {button}
    </View>
  );
}

function Advanced({ prefs, resetSync }) {
  let [resetting, setResetting] = useState(false);
  let [resettingCache, setResettingCache] = useState(false);
  let [expanded, setExpanded] = useState(false);

  async function onResetSync() {
    setResetting(true);
    await resetSync();
    setResetting(false);
  }

  async function onResetCache() {
    setResettingCache(true);
    await send('reset-budget-cache');
    setResettingCache(false);
  }

  return expanded ? (
    <Section title="Advanced Settings" style={{ marginBottom: 25 }}>
      <Text>Budget ID: {prefs.id}</Text>
      <Text style={{ color: colors.n6 }}>
        Sync ID: {prefs.groupId || '(none)'}
      </Text>

      <ButtonSetting
        button={
          <ButtonWithLoading loading={resettingCache} onClick={onResetCache}>
            Reset budget cache
          </ButtonWithLoading>
        }
      >
        <Text>
          <strong>Reset budget cache</strong> will clear all cached values for
          the budget and recalculate the entire budget. All values in the budget
          are cached for performance reasons, and if there is a bug in the cache
          you won't see correct values. There is no danger in resetting the
          cache. Hopefully you never have to do this.
        </Text>
      </ButtonSetting>

      <ButtonSetting
        button={
          <ButtonWithLoading loading={resetting} onClick={onResetSync}>
            Reset sync
          </ButtonWithLoading>
        }
      >
        <Text>
          <strong>Reset sync</strong> will remove all local data used to track
          changes for syncing, and create a fresh sync ID on our server. This
          file on other devices will have to be re-downloaded to use the new
          sync ID. Use this if there is a problem with syncing and you want to
          start fresh.
        </Text>
      </ButtonSetting>
    </Section>
  ) : (
    <Link
      onClick={() => setExpanded(true)}
      style={{ flexShrink: 0, alignSelf: 'flex-start', color: colors.p4 }}
    >
      Show advanced settings
    </Link>
  );
}

function GlobalSettings({ globalPrefs, saveGlobalPrefs }) {
  let [documentDirChanged, setDirChanged] = useState(false);
  let dirScrolled = useRef(null);

  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  async function onChooseDocumentDir() {
    let res = await window.Actual.openFileDialog({
      properties: ['openDirectory']
    });
    if (res) {
      saveGlobalPrefs({ documentDir: res[0] });
      setDirChanged(true);
    }
  }

  return (
    <>
      {!Platform.isBrowser && (
        <Section title="General">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            <Text style={{ flexShrink: 0 }}>Store files here: </Text>
            <Text
              innerRef={dirScrolled}
              style={{
                backgroundColor: 'white',
                padding: '7px 10px',
                borderRadius: 4,
                marginLeft: 5,
                overflow: 'auto',
                whiteSpace: 'nowrap',
                // TODO: When we update electron, we should be able to
                // remove this. In previous versions of Chrome, once the
                // scrollbar appears it never goes away
                '::-webkit-scrollbar': { display: 'none' }
              }}
            >
              {globalPrefs.documentDir}
            </Text>
            <Button
              primary
              onClick={onChooseDocumentDir}
              style={{
                fontSize: 14,
                marginLeft: 5,
                flexShrink: 0,
                alignSelf: 'flex-start'
              }}
            >
              Change location
            </Button>
          </View>
          )}
          {documentDirChanged && (
            <Information style={{ marginTop: 10 }}>
              A restart is required for this change to take effect
            </Information>
          )}
        </Section>
      )}
    </>
  );
}

function FileSettings({ savePrefs, prefs, pushModal, resetSync }) {
  function onDateFormat(e) {
    let format = e.target.value;
    savePrefs({ dateFormat: format });
  }

  function onNumberFormat(e) {
    let format = e.target.value;
    savePrefs({ numberFormat: format });
  }

  function onChangeKey() {
    pushModal('create-encryption-key', { recreate: true });
  }

  async function onExport() {
    let data = await send('export-budget');
    window.Actual.saveFile(data, `${prefs.id}.zip`, 'Export budget');
  }

  let dateFormat = prefs.dateFormat || 'MM/dd/yyyy';
  let numberFormat = prefs.numberFormat || 'comma-dot';
  return (
    <>
      <Section title="Formatting">
        <Text>
          <label for="settings-numberFormat">Number format: </label>
          <select
            id="settings-numberFormat"
            {...css({ marginLeft: 5, fontSize: 14 })}
            onChange={onNumberFormat}
          >
            {numberFormats.map(f => (
              <option value={f.value} selected={f.value === numberFormat}>
                {f.label}
              </option>
            ))}
          </select>
        </Text>

        <Text>
          <label for="settings-dateFormat">Date format: </label>
          <select
            id="settings-dateFormat"
            {...css({ marginLeft: 5, fontSize: 14 })}
            onChange={onDateFormat}
          >
            {dateFormats.map(f => (
              <option value={f.value} selected={f.value === dateFormat}>
                {f.label}
              </option>
            ))}
          </select>
        </Text>
      </Section>

      {prefs.encryptKeyId ? (
        <ButtonSetting
          button={
            <Button onClick={() => onChangeKey()}>Generate new key</Button>
          }
        >
          <Text>
            <Text style={{ color: colors.g4, fontWeight: 600 }}>
              End-to-end Encryption is turned on.
            </Text>{' '}
            Your data is encrypted with a key that only you have before sending
            it out to the cloud . Local data remains unencrypted so if you
            forget your password you can re-encrypt it.
          </Text>
        </ButtonSetting>
      ) : (
        <ButtonSetting
          button={
            <Button
              onClick={() => {
                alert(
                  'End-to-end encryption is not supported on the self-hosted service yet'
                );
                // pushModal('create-encryption-key');
              }}
            >
              Enable encryption…
            </Button>
          }
        >
          <Text>
            <strong>End-to-end encryption</strong> is not enabled. Any data on
            our servers is still stored safely and securely, but it's not
            end-to-end encrypted which means we have the ability to read it (but
            we won't). If you want, you can use a password to encrypt your data
            on our servers.
          </Text>
        </ButtonSetting>
      )}

      <ButtonSetting button={<Button onClick={onExport}>Export data</Button>}>
        <Text>
          <strong>Export</strong> your data as a zip file containing{' '}
          <code>db.sqlite</code> and <code>metadata.json</code> files. It can be
          imported into another Actual instance by clicking the “Import file”
          button and then choosing “Actual” on the Files page.
        </Text>
        {prefs.encryptKeyId ? (
          <Text>
            Even though encryption is enabled, the exported zip file will not
            have any encryption.
          </Text>
        ) : null}
      </ButtonSetting>

      <Advanced prefs={prefs} resetSync={resetSync} />
    </>
  );
}

function About() {
  const version = useServerVersion();

  return (
    <Section title="About">
      <Text>Client version: v{window.Actual.ACTUAL_VERSION}</Text>
      <Text>Server version: {version}</Text>
    </Section>
  );
}

class Settings extends React.Component {
  componentDidMount() {
    this.unlisten = listen('prefs-updated', () => {
      this.props.loadPrefs();
    });

    this.props.getUserData();
    this.props.loadPrefs();
  }

  componentWillUnmount() {
    this.unlisten();
  }

  render() {
    let { prefs, globalPrefs, userData } = this.props;

    return (
      <Page title="Settings">
        <View style={{ flexShrink: 0, gap: 30, maxWidth: 600 }}>
          <About />

          <GlobalSettings
            globalPrefs={globalPrefs}
            saveGlobalPrefs={this.props.saveGlobalPrefs}
          />

          <FileSettings
            prefs={prefs}
            userData={userData}
            pushModal={this.props.pushModal}
            resetSync={this.props.resetSync}
          />
        </View>
      </Page>
    );
  }
}

export default connect(
  state => ({
    prefs: state.prefs.local,
    globalPrefs: state.prefs.global,
    userData: state.user.data
  }),
  actions
)(Settings);
