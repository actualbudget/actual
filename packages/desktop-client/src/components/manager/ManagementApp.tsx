import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { BudgetFileSelection } from './BudgetFileSelection';
import { ConfigServer } from './ConfigServer';
import { ServerURL } from './ServerURL';
import { Bootstrap } from './subscribe/Bootstrap';
import { ChangePassword } from './subscribe/ChangePassword';
import { Error } from './subscribe/Error';
import { Login } from './subscribe/Login';
import { OpenIdCallback } from './subscribe/OpenIdCallback';
import { WelcomeScreen } from './WelcomeScreen';

import { setAppState } from '@desktop-client/app/appSlice';
import { ProtectedRoute } from '@desktop-client/auth/ProtectedRoute';
import { Permissions } from '@desktop-client/auth/types';
import {
  BackToFileListButton,
  UserDirectoryPage,
} from '@desktop-client/components/admin/UserDirectory/UserDirectoryPage';
import { AppBackground } from '@desktop-client/components/AppBackground';
import { LoggedInUser } from '@desktop-client/components/LoggedInUser';
import { Notifications } from '@desktop-client/components/Notifications';
import {
  useMultiuserEnabled,
  useServerVersion,
} from '@desktop-client/components/ServerContext';
import { useMetaThemeColor } from '@desktop-client/hooks/useMetaThemeColor';
import { useSelector, useDispatch } from '@desktop-client/redux';
import { loggedIn } from '@desktop-client/users/usersSlice';

function Version() {
  const version = useServerVersion();

  return (
    <Text
      style={{
        color: theme.pageTextSubdued,
        ':hover': { color: theme.pageText },
        margin: 15,
        marginLeft: 17,
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
      {`App: v${window.Actual.ACTUAL_VERSION} | Server: ${version}`}
    </Text>
  );
}

export function ManagementApp() {
  const { isNarrowWidth } = useResponsive();
  useMetaThemeColor(
    isNarrowWidth ? theme.mobileConfigServerViewTheme : undefined,
  );

  const files = useSelector(state => state.budgets.allFiles);
  const isLoading = useSelector(state => state.app.loadingText !== null);
  const userData = useSelector(state => state.user.data);
  const multiuserEnabled = useMultiuserEnabled();

  const managerHasInitialized = useSelector(
    state => state.app.managerHasInitialized,
  );

  const dispatch = useDispatch();

  // runs on mount only
  useEffect(() => {
    async function fetchData() {
      await dispatch(loggedIn());
      dispatch(setAppState({ managerHasInitialized: true }));
    }

    fetchData();
  }, [dispatch]);

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
                  <Route path="/" element={<BudgetFileSelection />} />
                ) : (
                  <Route path="/" element={<WelcomeScreen />} />
                )}

                {multiuserEnabled && (
                  <Route
                    path="/user-directory"
                    element={
                      <ProtectedRoute
                        permission={Permissions.ADMINISTRATOR}
                        element={
                          <UserDirectoryPage
                            bottomContent={<BackToFileListButton />}
                          />
                        }
                      />
                    }
                  />
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
              <Route path="/login" element={<Login />} />
              <Route path="/openid-cb" element={<OpenIdCallback />} />
              <Route path="/error" element={<Error />} />
              <Route path="/config-server" element={<ConfigServer />} />
              <Route path="/bootstrap" element={<Bootstrap />} />
              {multiuserEnabled && (
                <Route
                  path="/userdirectory"
                  element={
                    <ProtectedRoute
                      permission={Permissions.ADMINISTRATOR}
                      element={<UserDirectoryPage />}
                    />
                  }
                />
              )}

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
