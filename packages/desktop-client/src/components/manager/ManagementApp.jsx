import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

import {
  getUserData,
  loadAllFiles,
  setAppState,
} from 'loot-core/client/actions';

import { SvgPencil1 } from '../../icons/v2';
import { theme } from '../../style';
import { tokens } from '../../tokens';
import { AppBackground } from '../AppBackground';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { LoggedInUser } from '../LoggedInUser';
import { Notifications } from '../Notifications';
import { useServerVersion } from '../ServerContext';

import { BudgetList } from './BudgetList';
import { ConfigServer } from './ConfigServer';
import { ServerURL } from './ServerURL';
import { Bootstrap } from './subscribe/Bootstrap';
import { ChangePassword } from './subscribe/ChangePassword';
import { Error } from './subscribe/Error';
import { Login } from './subscribe/Login';
import { WelcomeScreen } from './WelcomeScreen';

function Version() {
  const version = useServerVersion();

  const { t } = useTranslation();

  const changeClientVersion = async () => {
    console.info('changeClientVersion');
    await globalThis.window.Actual.changeClientVersion('v23.9.0');
    console.info('changeClientVersion done');
  };

  return (
    <Text
      style={{
        color: theme.pageTextSubdued,
        ':hover': { color: theme.pageText },
        margin: 15,
        marginLeft: 17,
        display: 'flex',
        alignItems: 'center',
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          position: 'absolute',
          bottom: 0,
          right: 0,
          marginLeft: 15,
          marginRight: 17,
          zIndex: 5001,
        },
      }}
    >
      {`App: v${window.Actual?.ACTUAL_VERSION}`}
      <Button
        variant="bare"
        aria-label={t('Change client version')}
        style={{ margin: '0px 5px', color: 'inherit' }}
        className="hover-visible"
        onPress={changeClientVersion}
      >
        <SvgPencil1
          style={{
            width: 11,
            height: 11,
          }}
        />
      </Button>
      {` | Server: ${version}`}
    </Text>
  );
}

export function ManagementApp() {
  const files = useSelector(state => state.budgets.allFiles);
  const isLoading = useSelector(state => state.app.loadingText !== null);
  const userData = useSelector(state => state.user.data);
  const managerHasInitialized = useSelector(
    state => state.app.managerHasInitialized,
  );

  const dispatch = useDispatch();

  // runs on mount only
  useEffect(() => {
    async function fetchData() {
      const userData = await dispatch(getUserData());
      if (userData) {
        await dispatch(loadAllFiles());
      }

      dispatch(setAppState({ managerHasInitialized: true }));
    }

    fetchData();
  }, []);

  return (
    <View style={{ height: '100%', color: theme.pageText }}>
      <AppBackground />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          WebkitAppRegion: 'drag',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          right: 15,
        }}
      >
        <Notifications
          style={{
            position: 'relative',
            left: 'initial',
            right: 'initial',
          }}
        />
      </View>

      {managerHasInitialized && !isLoading && (
        <View
          style={{
            alignItems: 'center',
            bottom: 0,
            justifyContent: 'center',
            left: 0,
            padding: 20,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        >
          {userData && files ? (
            <>
              <Routes>
                <Route path="/config-server" element={<ConfigServer />} />

                <Route path="/change-password" element={<ChangePassword />} />
                {files && files.length > 0 ? (
                  <Route path="/" element={<BudgetList />} />
                ) : (
                  <Route path="/" element={<WelcomeScreen />} />
                )}
                {/* Redirect all other pages to this route */}
                <Route path="/*" element={<Navigate to="/" />} />
              </Routes>

              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  padding: '6px 10px',
                  zIndex: 4000,
                }}
              >
                <Routes>
                  <Route path="/config-server" element={null} />
                  <Route
                    path="/*"
                    element={
                      <LoggedInUser
                        hideIfNoServer
                        style={{ padding: '4px 7px' }}
                      />
                    }
                  />
                </Routes>
              </View>
            </>
          ) : (
            <Routes>
              <Route path="/login/:method?" element={<Login />} />
              <Route path="/error" element={<Error />} />
              <Route path="/config-server" element={<ConfigServer />} />
              <Route path="/bootstrap" element={<Bootstrap />} />
              {/* Redirect all other pages to this route */}
              <Route path="/*" element={<Navigate to="/bootstrap" replace />} />
            </Routes>
          )}
        </View>
      )}

      <Routes>
        <Route path="/config-server" element={null} />
        <Route path="/*" element={<ServerURL />} />
      </Routes>
      <Version />
    </View>
  );
}
