import React, { useState, useEffect, useRef } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { css } from 'glamor';
import { Route, Switch, Redirect } from 'react-router-dom';
import * as actions from 'loot-core/src/client/actions';
import {
  View,
  Text,
  Button,
  ButtonLink,
  ButtonWithLoading,
  AnchorLink,
  Link,
  Input
} from 'loot-design/src/components/common';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { numberFormats } from 'loot-core/src/shared/util';
import { styles, colors } from 'loot-design/src/style';
import { Information, Warning, Error } from 'loot-design/src/components/alerts';
import Checkmark from 'loot-design/src/svg/v1/Checkmark';
import CheveronDown from 'loot-design/src/svg/v1/CheveronDown';
import ExpandArrow from 'loot-design/src/svg/ExpandArrow';
import ExclamationSolid from 'loot-design/src/svg/v1/ExclamationSolid';
import Platform from 'loot-core/src/client/platform';

let dateFormats = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' }
];

function Title({ name, style }) {
  return (
    <View
      style={[
        { fontSize: 20, fontWeight: 500, marginBottom: 20, flexShrink: 0 },
        style
      ]}
    >
      {name}
    </View>
  );
}

function Advanced({ prefs, userData, pushModal, resetSync }) {
  let [expanded, setExpanded] = useState(true);
  let [resetting, setResetting] = useState(false);
  let [resettingCache, setResettingCache] = useState(false);

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

  return (
    <View style={{ alignItems: 'flex-start', marginTop: 55 }}>
      <View
        style={[
          {
            fontSize: 15,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center'
          },
          styles.staticText
        ]}
        onClick={() => setExpanded(!expanded)}
      >
        <ExpandArrow
          width={8}
          height={8}
          style={{
            marginRight: 5,
            transition: 'transform .2s',
            transform: !expanded && 'rotateZ(-90deg)'
          }}
        />
        Advanced
      </View>

      {expanded && (
        <View style={{ marginBottom: 20, alignItems: 'flex-start' }}>
          <Text>
            <strong>Budget ID</strong>: {prefs.id}
          </Text>

          <View
            style={{
              backgroundColor: colors.n9,
              alignItems: 'flex-start',
              padding: 15,
              borderRadius: 4,
              marginTop: 20,
              border: '1px solid ' + colors.n8
            }}
          >
            <Text style={{ marginBottom: 10, width: 500, lineHeight: 1.5 }}>
              <strong>Reset budget cache</strong> will clear all cached values
              for the budget and recalculate the entire budget. All values in
              the budget are cached for performance reasons, and if there is a
              bug in the cache you won't see correct values. There is no danger
              in resetting the cache. Hopefully you never have to do this.
            </Text>
            <ButtonWithLoading loading={resettingCache} onClick={onResetCache}>
              Reset budget cache
            </ButtonWithLoading>
          </View>

          <View
            style={{
              backgroundColor: colors.n9,
              alignItems: 'flex-start',
              padding: 15,
              borderRadius: 4,
              marginTop: 20,
              border: '1px solid ' + colors.n8
            }}
          >
            <Text style={{ marginBottom: 10, width: 500, lineHeight: 1.5 }}>
              <strong>Reset sync</strong> will remove all local data used to
              track changes for syncing, and create a fresh sync id on our
              server. This file on other devices will have to be re-downloaded
              to use the new sync id. Use this if there is a problem with
              syncing and you want to start fresh.
            </Text>

            <ButtonWithLoading loading={resetting} onClick={onResetSync}>
              Reset sync
            </ButtonWithLoading>
            <Text style={{ marginTop: 15, color: colors.n4, fontSize: 12 }}>
              Sync ID: {prefs.groupId || '(none)'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function GlobalSettings({
  globalPrefs,
  userData,
  saveGlobalPrefs,
  pushModal,
  closeBudget
}) {
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

  function onAutoUpdate(e) {
    saveGlobalPrefs({ autoUpdate: e.target.checked });
  }

  function onTrackUsage(e) {
    saveGlobalPrefs({ trackUsage: e.target.checked });
  }

  return (
    <View>
      <View>
        <Title name="General" />

        {!Platform.isBrowser && (
          <View
            style={{
              flexDirection: 'row',
              maxWidth: 550,
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

        <View
          style={{
            flexDirection: 'row',
            marginTop: 30,
            alignItems: 'flex-start'
          }}
        >
          <input
            type="checkbox"
            checked={globalPrefs.autoUpdate}
            style={{ marginRight: 5 }}
            onChange={onAutoUpdate}
          />

          <View>
            <Text style={{ fontSize: 15 }}>
              Automatically check for updates
            </Text>
            <View
              style={{
                color: colors.n2,
                marginTop: 10,
                maxWidth: 600,
                lineHeight: '1.4em'
              }}
            >
              By default, Actual will automatically apply new updates as they
              are available. Disabling this will avoid updating Actual. You will
              need to go to the About menu to manually check for updates.
            </View>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 30 }}>
        <Title name="Privacy" />

        <View
          style={{
            flexDirection: 'row',
            marginTop: 30,
            alignItems: 'flex-start'
          }}
        >
          <input
            type="checkbox"
            checked={globalPrefs.trackUsage}
            style={{ marginRight: 5 }}
            onChange={onTrackUsage}
          />

          <View>
            <Text style={{ fontSize: 15 }}>
              Send basic usage statistics back to Actual{"'"}s servers
            </Text>
            <View
              style={{
                color: colors.n2,
                marginTop: 10,
                maxWidth: 600,
                lineHeight: '1.4em'
              }}
            >
              We don{"'"}t track anything specific &mdash; only the fact that
              you{"'"}ve opened Actual. This helps by giving us important
              feedback about how popular new features are.
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function FileSettings({
  savePrefs,
  prefs,
  userData,
  localServerURL,
  pushModal,
  resetSync,
  setAppState,
  signOut
}) {
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
    <View>
      <View style={{ marginTop: 30 }}>
        <Title name="Formatting" />

        <Text>
          Date format:{' '}
          <select
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

        <Text style={{ marginTop: 20 }}>
          Number format:{' '}
          <select
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
      </View>

      <View style={{ marginTop: 30 }}>
        <Title name="Encryption" />
        <View style={{ flexDirection: 'row' }}>
          <View>
            <Text style={{ fontWeight: 700, fontSize: 15 }}>
              End-to-end encryption
            </Text>
            <View
              style={{
                color: colors.n2,
                marginTop: 10,
                maxWidth: 600,
                lineHeight: '1.4em'
              }}
            >
              {prefs.encryptKeyId ? (
                <Text>
                  <Text style={{ color: colors.g4, fontWeight: 600 }}>
                    Encryption is turned on.
                  </Text>{' '}
                  Your data is encrypted with a key that only you have before
                  sending it out to the cloud . Local data remains unencrypted
                  so if you forget your password you can re-encrypt it.
                  <Button
                    style={{ marginTop: 10 }}
                    onClick={() => onChangeKey()}
                  >
                    Generate new key
                  </Button>
                </Text>
              ) : (
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={{ lineHeight: '1.4em' }}>
                    Encryption is not enabled. Any data on our servers is still
                    stored safely and securely, but it's not end-to-end
                    encrypted which means we have the ability to read it (but we
                    won't). If you want, you can use a password to encrypt your
                    data on our servers.
                  </Text>
                  <Button
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      alert(
                        'End-to-end encryption is not supported on the self-hosted service yet'
                      );
                      // pushModal('create-encryption-key');
                    }}
                  >
                    Enable encryption
                  </Button>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 30, alignItems: 'flex-start' }}>
        <Title name="Export" />
        <Button onClick={onExport}>Export data</Button>
      </View>

      <Advanced
        prefs={prefs}
        userData={userData}
        pushModal={pushModal}
        resetSync={resetSync}
      />
    </View>
  );
}

function SettingsLink({ to, name, style, first, last }) {
  return (
    <AnchorLink
      to={to}
      style={[
        {
          fontSize: 14,
          padding: '6px 10px',
          borderBottom: '2px solid transparent',
          textDecoration: 'none',
          borderRadius: first ? '4px 0 0 4px' : last ? '0 4px 4px 0' : 4,
          border: '1px solid ' + colors.n4,
          color: colors.n3
        },
        style
      ]}
      activeStyle={{
        backgroundColor: colors.p6,
        borderColor: colors.p6,
        color: 'white'
      }}
    >
      {name}
    </AnchorLink>
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
    let { prefs, globalPrefs, localServerURL, userData, match } = this.props;

    return (
      <View style={[styles.page, { overflow: 'hidden', fontSize: 14 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'center',
            margin: '15px 0'
          }}
        >
          <SettingsLink to={`${match.path}/file`} name="File" first={true} />
          <SettingsLink to={`${match.path}/global`} name="Global" last={true} />
        </View>

        <View
          style={[
            styles.pageContent,
            {
              alignItems: 'flex-start',
              flex: 1,
              overflow: 'auto',
              paddingBottom: 20
            }
          ]}
        >
          <View style={{ flexShrink: 0 }}>
            <Switch>
              <Route path={`${match.path}/`} exact>
                <Redirect to={`${match.path}/file`} />
              </Route>
              <Route path={`${match.path}/global`}>
                <GlobalSettings
                  globalPrefs={globalPrefs}
                  userData={userData}
                  saveGlobalPrefs={this.props.saveGlobalPrefs}
                  pushModal={this.props.pushModal}
                  closeBudget={this.props.closeBudget}
                />
              </Route>
              <Route path={`${match.path}/file`}>
                <FileSettings
                  prefs={prefs}
                  localServerURL={localServerURL}
                  userData={userData}
                  pushModal={this.props.pushModal}
                  savePrefs={this.props.savePrefs}
                  setAppState={this.props.setAppState}
                  signOut={this.props.signOut}
                  resetSync={this.props.resetSync}
                />
              </Route>
            </Switch>
          </View>
        </View>
      </View>
    );
  }
}

export default connect(
  state => ({
    prefs: state.prefs.local,
    globalPrefs: state.prefs.global,
    localServerURL: state.account.localServerURL,
    userData: state.user.data
  }),
  actions
)(Settings);
