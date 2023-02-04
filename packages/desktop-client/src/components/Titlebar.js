import React, { useState, useEffect, useRef, useContext } from 'react';
import { connect } from 'react-redux';
import { Switch, Route, withRouter } from 'react-router-dom';

import { css, media } from 'glamor';

import * as actions from 'loot-core/src/client/actions';
import Platform from 'loot-core/src/client/platform';
import * as queries from 'loot-core/src/client/queries';
import { listen } from 'loot-core/src/platform/client/fetch';
import {
  View,
  Text,
  ButtonLink,
  Button,
  ButtonWithLoading,
  Tooltip,
  P
} from 'loot-design/src/components/common';
import SheetValue from 'loot-design/src/components/spreadsheet/SheetValue';
import { colors } from 'loot-design/src/style';
import ArrowLeft from 'loot-design/src/svg/v1/ArrowLeft';
import AlertTriangle from 'loot-design/src/svg/v2/AlertTriangle';
import ArrowButtonRight1 from 'loot-design/src/svg/v2/ArrowButtonRight1';
import NavigationMenu from 'loot-design/src/svg/v2/NavigationMenu';
import tokens from 'loot-design/src/tokens';

import { useServerURL } from '../hooks/useServerURL';

import AccountSyncCheck from './accounts/AccountSyncCheck';
import AnimatedRefresh from './AnimatedRefresh';
import { MonthCountSelector } from './budget/MonthCountSelector';
import { useSidebar } from './FloatableSidebar';
import LoggedInUser from './LoggedInUser';

export let TitlebarContext = React.createContext();

export function TitlebarProvider({ children }) {
  let listeners = useRef([]);

  function sendEvent(msg) {
    listeners.current.forEach(func => func(msg));
  }

  function subscribe(listener) {
    listeners.current.push(listener);
    return () =>
      (listeners.current = listeners.current.filter(func => func !== listener));
  }

  return (
    <TitlebarContext.Provider
      value={{ sendEvent, subscribe }}
      children={children}
    />
  );
}

export function UncategorizedButton() {
  return (
    <SheetValue binding={queries.uncategorizedCount()}>
      {node => {
        const num = node.value;
        return (
          num !== 0 && (
            <ButtonLink
              bare
              to="/accounts/uncategorized"
              style={{ color: colors.r5 }}
            >
              {num} uncategorized {num === 1 ? 'transaction' : 'transactions'}
            </ButtonLink>
          )
        );
      }}
    </SheetValue>
  );
}

export function SyncButton({ localPrefs, style, onSync }) {
  let [syncing, setSyncing] = useState(false);
  let [syncState, setSyncState] = useState(null);

  useEffect(() => {
    let unlisten = listen('sync-event', ({ type, subtype, syncDisabled }) => {
      if (type === 'start') {
        setSyncing(true);
        setSyncState(null);
      } else {
        // Give the layout some time to apply the starting animation
        // so we always finish it correctly even if it's almost
        // instant
        setTimeout(() => {
          setSyncing(false);
        }, 200);
      }

      if (type === 'error') {
        // Use the offline state if either there is a network error or
        // if this file isn't a "cloud file". You can't sync a local
        // file.
        if (subtype === 'network') {
          setSyncState('offline');
        } else if (!localPrefs.cloudFileId) {
          setSyncState('local');
        } else {
          setSyncState('error');
        }
      } else if (type === 'success') {
        setSyncState(syncDisabled ? 'disabled' : null);
      }
    });

    return unlisten;
  }, []);

  return (
    <Button
      bare
      style={css(
        style,
        {
          WebkitAppRegion: 'none',
          color:
            syncState === 'error'
              ? colors.r7
              : syncState === 'disabled' ||
                syncState === 'offline' ||
                syncState === 'local'
              ? colors.n9
              : null
        },
        media(`(min-width: ${tokens.breakpoint_medium})`, {
          color:
            syncState === 'error'
              ? colors.r4
              : syncState === 'disabled' ||
                syncState === 'offline' ||
                syncState === 'local'
              ? colors.n6
              : null
        })
      )}
      onClick={onSync}
    >
      {syncState === 'error' ? (
        <AlertTriangle width={13} style={{ color: 'currentColor' }} />
      ) : (
        <AnimatedRefresh animating={syncing} />
      )}
      <Text style={{ marginLeft: 3 }}>
        {syncState === 'disabled'
          ? 'Disabled'
          : syncState === 'offline'
          ? 'Offline'
          : 'Sync'}
      </Text>
    </Button>
  );
}

function BudgetTitlebar({ globalPrefs, saveGlobalPrefs, localPrefs }) {
  let { sendEvent } = useContext(TitlebarContext);
  let [loading, setLoading] = useState(false);
  let [showTooltip, setShowTooltip] = useState(false);

  let reportBudgetEnabled = localPrefs['flags.reportBudget'];

  function onSwitchType() {
    setLoading(true);
    if (!loading) {
      sendEvent('budget/switch-type');
    }
  }

  useEffect(() => {
    setLoading(false);
  }, [localPrefs.budgetType]);

  let { budgetType } = localPrefs;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MonthCountSelector
        maxMonths={globalPrefs.maxMonths || 1}
        onChange={value => saveGlobalPrefs({ maxMonths: value })}
      />
      {reportBudgetEnabled && (
        <View style={{ marginLeft: -5 }}>
          <ButtonWithLoading
            bare
            loading={loading}
            style={{
              alignSelf: 'flex-start',
              padding: '4px 7px'
            }}
            title="Learn more about budgeting"
            onClick={() => setShowTooltip(true)}
          >
            {budgetType === 'report' ? 'Report budget' : 'Rollover budget'}
          </ButtonWithLoading>
          {showTooltip && (
            <Tooltip
              position="bottom-left"
              onClose={() => setShowTooltip(false)}
              style={{
                padding: 10,
                maxWidth: 400
              }}
            >
              <P>
                You are currently using a{' '}
                <Text style={{ fontWeight: 600 }}>
                  {budgetType === 'report'
                    ? 'Report budget'
                    : 'Rollover budget'}
                  .
                </Text>{' '}
                Switching will not lose any data and you can always switch back.
              </P>
              <P>
                <ButtonWithLoading
                  primary
                  loading={loading}
                  onClick={onSwitchType}
                >
                  Switch to a{' '}
                  {budgetType === 'report'
                    ? 'Rollover budget'
                    : 'Report budget'}
                </ButtonWithLoading>
              </P>
              <P isLast={true}>
                <a // eslint-disable-line
                  href="#"
                  style={{
                    color: colors.n4,
                    fontStyle: 'italic'
                  }}
                >
                  How do these types of budgeting work?
                </a>
              </P>
            </Tooltip>
          )}
        </View>
      )}
    </View>
  );
}

function Titlebar({
  location,
  globalPrefs,
  saveGlobalPrefs,
  localPrefs,
  userData,
  floatingSidebar,
  syncError,
  setAppState,
  style,
  sync
}) {
  let sidebar = useSidebar();
  const serverURL = useServerURL();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 15px',
          height: 36,
          pointerEvents: 'none',
          '& *': {
            pointerEvents: 'auto'
          }
        },
        !Platform.isBrowser &&
          Platform.OS === 'mac' &&
          floatingSidebar && { paddingLeft: 80 },
        style
      ]}
    >
      {floatingSidebar && (
        <Button
          bare
          style={{
            marginRight: 8,
            '& .arrow-right': { opacity: 0, transition: 'opacity .3s' },
            '& .menu': { opacity: 1, transition: 'opacity .3s' },
            '&:hover .arrow-right': { opacity: 1 },
            '&:hover .menu': { opacity: 0 }
          }}
          onMouseEnter={() => sidebar.show()}
          onMouseLeave={() => sidebar.hide()}
          onClick={() => {
            saveGlobalPrefs({ floatingSidebar: !floatingSidebar });
          }}
        >
          <View style={{ width: 15, height: 15 }}>
            <ArrowButtonRight1
              className="arrow-right"
              style={{
                width: 13,
                height: 13,
                color: colors.n5,
                position: 'absolute',
                top: 1,
                left: 1
              }}
            />
            <NavigationMenu
              className="menu"
              style={{
                width: 15,
                height: 15,
                color: colors.n5,
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
          </View>
        </Button>
      )}

      <Switch>
        <Route
          path="/accounts"
          exact
          children={props => {
            let state = props.location.state || {};
            return state.goBack ? (
              <Button onClick={() => props.history.goBack()} bare>
                <ArrowLeft
                  width={10}
                  height={10}
                  style={{ marginRight: 5, color: 'currentColor' }}
                />{' '}
                Back
              </Button>
            ) : null;
          }}
        />

        <Route
          path="/accounts/:id"
          exact
          children={props => {
            return (
              props.match && <AccountSyncCheck id={props.match.params.id} />
            );
          }}
        />

        <Route
          path="/budget"
          exact
          children={() => (
            <BudgetTitlebar
              globalPrefs={globalPrefs}
              saveGlobalPrefs={saveGlobalPrefs}
              localPrefs={localPrefs}
            />
          )}
        />
      </Switch>
      <View style={{ flex: 1 }} />
      <UncategorizedButton />
      {serverURL ? (
        <SyncButton
          style={{ marginLeft: 10 }}
          localPrefs={localPrefs}
          onSync={sync}
        />
      ) : null}
      <LoggedInUser style={{ marginLeft: 10 }} />
    </View>
  );
}

export default withRouter(
  connect(
    state => ({
      globalPrefs: state.prefs.global,
      localPrefs: state.prefs.local,
      userData: state.user.data,
      floatingSidebar: state.prefs.global.floatingSidebar
    }),
    actions
  )(Titlebar)
);
