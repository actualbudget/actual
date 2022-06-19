import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Image, StatusBar } from 'react-native';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import * as actions from 'loot-core/src/client/actions';
import ModalListener from '../ModalListener';
import Background from '../../../assets/gradient-bg.png';
import Intro from './Intro';
import Subscribe from './Subscribe';
import SubscribeEmail from './SubscribeEmail';
import BudgetList from './BudgetList';
import Login from './Login';
import SetServer from './SetServer';
import PasswordPrompt from './PasswordPrompt';
import Confirm from './Confirm';
import DeleteFile from './DeleteFile';
import FixEncryptionKey from '../modals/FixEncryptionKey';

const LoggedInNavigator = createNativeStackNavigator();
const LoggedOutNavigator = createNativeStackNavigator();

function LoggedOutRoutes({ stack: Stack }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'none'
      }}
    >
      <Stack.Screen name="SetServer" component={SetServer} />
      <Stack.Screen name="PasswordPrompt" component={PasswordPrompt} />
      <Stack.Screen name="Intro" component={Intro} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Subscribe" component={Subscribe} />
      <Stack.Screen name="SubscribeEmail" component={SubscribeEmail} />
      <Stack.Screen name="Confirm" component={Confirm} />
    </Stack.Navigator>
  );
}

function LoggedInRoutes({ stack: Stack }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' }
      }}
    >
      <Stack.Screen name="BudgetList" component={BudgetList} />
      <Stack.Screen name="DeleteFile" component={DeleteFile} />
      <Stack.Screen name="FixEncryptionKeyModal" component={FixEncryptionKey} />
    </Stack.Navigator>
  );
}

function ManagementApp({
  userData,
  allFiles,
  isHidden,
  loadingText,
  managerHasInitialized,
  actions
}) {
  let [navigator, setNavigator] = useState(null);
  let [initializing, setInitializing] = useState(true);
  let navigatorRef = useRef(null);

  // On first render, update the user and file list
  useEffect(() => {
    async function run() {
      // An action may have been triggered from outside, and we don't
      // want to override its loading message so we only show the
      // initial loader if there isn't already a message
      let alreadyLoading = loadingText != null;

      // Only show the loading message if this is the first run. When
      // this is rendered subsequently, we should already have files
      // to show immediately (but this will still update them).
      // Remember, this component is re-mounted whenever the user
      // navigates to the manager, but `managerHasInitialized` is in
      // redux to persist across renders
      if (!managerHasInitialized && !alreadyLoading) {
        actions.setAppState({ loadingText: '' });
      }

      let userData = await actions.getUserData();
      if (userData) {
        await actions.loadAllFiles();
      }

      actions.setAppState({
        managerHasInitialized: true,
        ...(!alreadyLoading ? { loadingText: null } : null)
      });
    }
    run();
  }, []);

  // When certain things happen with the account, we want to swap out
  // different navigators to show different screens. For example, if
  // you login it should show your files. If your trial ends, we want
  // to force the user to see a trial ended screen. The reason we
  // don't use one router and navigate is to ensure that state is
  // always fresh and the user is never able to navigate back between
  // these states.
  useLayoutEffect(() => {
    if (managerHasInitialized) {
      let newNavigator = null;

      if (userData) {
        // Decide where to take the user when they have a valid
        // account and we've tried to load their files
        if (allFiles) {
          if (allFiles.length > 0) {
            // Files exist, so show the file select screen
            newNavigator = LoggedInNavigator;
          } else {
            // No files exist. We automatically create one for the
            // user and load it in, which will swap out the manager
            // automatically, so we don't need to do anything else
            actions.createBudget();
          }
        }
      } else {
        // The user hasn't logged in, show the landing page
        newNavigator = LoggedOutNavigator;
      }

      if (newNavigator && newNavigator !== navigator) {
        setNavigator(newNavigator);
      }
    }
  }, [userData, allFiles, managerHasInitialized]);

  let hidden = isHidden || loadingText;

  return (
    <NavigationContainer ref={navigatorRef}>
      <ActionSheetProvider>
        <View
          style={{ flex: 1, opacity: hidden ? 0 : 1 }}
          {...(hidden ? { pointerEvents: 'none' } : null)}
        >
          <StatusBar barStyle="light-content" />

          {navigator === LoggedOutNavigator && (
            <Image
              source={Background}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
            />
          )}

          {navigator === LoggedOutNavigator ? (
            <LoggedOutRoutes stack={LoggedOutNavigator} />
          ) : navigator === LoggedInNavigator ? (
            <LoggedInRoutes stack={LoggedInNavigator} />
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <ModalListener navigatorRef={navigatorRef} />
        </View>
      </ActionSheetProvider>
    </NavigationContainer>
  );
}

export default connect(
  state => ({
    allFiles: state.budgets.allFiles,
    isHidden: state.modals.isHidden,
    loadingText: state.app.loadingText,
    userData: state.user.data,
    managerHasInitialized: state.app.managerHasInitialized
  }),
  dispatch => ({
    actions: bindActionCreators(actions, dispatch)
  })
)(ManagementApp);
