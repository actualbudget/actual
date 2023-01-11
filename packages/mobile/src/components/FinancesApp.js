import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { connect } from 'react-redux';

import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import * as actions from 'loot-core/src/client/actions';
import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import checkForUpgradeNotifications from 'loot-core/src/client/upgrade-notifications';
import { AmountAccessoryView } from 'loot-design/src/components/mobile/AmountInput';
import { BudgetAccessoryView } from 'loot-design/src/components/mobile/budget';
import { Button } from 'loot-design/src/components/mobile/common';
import InputAccessoryView from 'loot-design/src/components/mobile/InputAccessoryView';
import { colors } from 'loot-design/src/style';
import Add from 'loot-design/src/svg/v1/Add';
import Cog from 'loot-design/src/svg/v1/Cog';
import PiggyBank from 'loot-design/src/svg/v1/PiggyBank';
import Wallet from 'loot-design/src/svg/v1/Wallet';

import Accounts from './accounts';
import Account from './accounts/Account';
import Budget from './budget';
import ModalListener from './ModalListener';
import AccountSelect from './modals/AccountSelect';
import AddAccount from './modals/AddAccount';
import AddCategory from './modals/AddCategory';
import AddLocalAccount from './modals/AddLocalAccount';
import CategorySelect from './modals/CategorySelect';
import CreateEncryptionKey from './modals/CreateEncryptionKey';
import GenericSearchableSelect from './modals/GenericSearchableSelect';
import GenericSelect from './modals/GenericSelect';
import ConfigureLinkedAccounts from './modals/link-accounts/ConfigureLinkedAccounts';
import SelectLinkedAccounts from './modals/link-accounts/SelectLinkedAccounts';
import PayeeSelect from './modals/PayeeSelect';
import Notifications from './Notifications';
import Settings from './Settings';
import Transaction from './transactions/Transaction';

function useForegroundSync(sync) {
  let appState = useRef(null);

  useEffect(() => {
    let onChange = nextAppState => {
      let state = appState.current;

      // Detect when the app is coming into the foreground
      if (state && state === 'background' && nextAppState === 'active') {
        sync();
      }

      appState.current = nextAppState;
    };

    AppState.addEventListener('change', onChange);

    return () => {
      AppState.removeEventListener('change', onChange);
    };
  }, [sync]);
}

const AddAccountStack = createNativeStackNavigator();
function AddAccountRoutes() {
  return (
    <AddAccountStack.Navigator
      initialRouteName="AddLocalAccount"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.b2 }
      }}
    >
      <AddAccountStack.Screen name="AddAccount" component={AddAccount} />
      <AddAccountStack.Screen
        name="AddLocalAccount"
        component={AddLocalAccount}
      />
      <AddAccountStack.Screen
        name="SelectLinkedAccounts"
        component={SelectLinkedAccounts}
      />
      <AddAccountStack.Screen
        name="ConfigureLinkedAccounts"
        component={ConfigureLinkedAccounts}
      />
    </AddAccountStack.Navigator>
  );
}

const AccountsStack = createNativeStackNavigator();
function AccountRoutes() {
  return (
    <AccountsStack.Navigator>
      <AccountsStack.Screen
        name="Accounts"
        component={Accounts}
        options={({ navigation }) => ({
          headerStyle: {
            backgroundColor: colors.b2
          },
          headerTintColor: '#fff',
          headerRight: () => (
            <Button
              bare
              style={{ padding: 10, backgroundColor: 'transparent' }}
              onPress={() => navigation.navigate('AddAccountModal')}
            >
              <Add width={20} height={20} style={{ color: 'white' }} />
            </Button>
          )
        })}
      />
      <AccountsStack.Screen
        name="Account"
        component={Account}
        options={({ route, navigation }) => ({
          title: route.params.title || 'Account',
          headerShadowVisible: false,
          headerRight: () => (
            <RectButton
              onPress={() => {
                navigation.navigate('Transaction', {
                  transactions: null,
                  accountId: route.params.id
                });
              }}
              style={{ padding: 10 }}
            >
              <Add width={20} height={20} color={colors.p4} />
            </RectButton>
          )
        })}
      />
    </AccountsStack.Navigator>
  );
}

const AppTabs = createBottomTabNavigator();
function AppRoutes() {
  return (
    <AppTabs.Navigator
      screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.p5 }}
    >
      <AppTabs.Screen
        name="BudgetStack"
        component={Budget}
        options={{
          title: 'Budget',
          tabBarIcon: ({ color }) => (
            <Wallet width={22} height={22} style={{ color }} />
          )
        }}
      />
      <AppTabs.Screen
        name="AccountsStack"
        component={AccountRoutes}
        listeners={({ navigation, route }) => ({
          tabLongPress: () => {
            navigation.navigate('Transaction', {
              transactions: null,
              accountId: null
            });
          }
        })}
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => (
            <PiggyBank width={22} height={22} style={{ color }} />
          )
        }}
      />
      <AppTabs.Screen
        name="Settings"
        component={Settings}
        options={{
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <Cog width={22} height={22} style={{ color }} />
          )
        }}
      />
    </AppTabs.Navigator>
  );
}

const RootStack = createNativeStackNavigator();
function Routes() {
  return (
    <RootStack.Navigator
      initialRouteName="App"
      screenOptions={{ headerShown: false }}
    >
      <AccountsStack.Screen
        name="Transaction"
        component={Transaction}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="AddAccountModal" component={AddAccountRoutes} />
      <RootStack.Screen
        name="AddCategoryModal"
        component={AddCategory}
        options={{ contentStyle: { backgroundColor: colors.b2 } }}
      />
      <RootStack.Screen
        name="GenericSelectModal"
        component={GenericSelect}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="GenericSearchableSelectModal"
        component={GenericSearchableSelect}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="PayeeSelect"
        component={PayeeSelect}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="CategorySelect"
        component={CategorySelect}
        options={{ presentation: 'modal' }}
      />
      <AccountsStack.Screen
        name="AccountSelect"
        component={AccountSelect}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="CreateEncryptionKeyModal"
        component={CreateEncryptionKey}
        options={{ contentStyle: { backgroundColor: colors.b2 } }}
      />
      <RootStack.Screen name="App" component={AppRoutes} />
    </RootStack.Navigator>
  );
}

function FinancesApp({ getAccounts, sync, addNotification, resetSync }) {
  let navigatorRef = useRef(null);

  useEffect(() => {
    // Get the accounts and check if any exist. If there are no
    // accounts, we want to redirect the user to the Accounts
    // screen which will prompt them to add an account
    getAccounts().then(accounts => {
      if (accounts.length === 0) {
        navigatorRef.current.navigate('App', { screen: 'AccountsStack' });
      }
    });

    // Check for upgrade notifications
    checkForUpgradeNotifications(addNotification, resetSync);

    sync();
  }, []);

  useForegroundSync(sync);

  return (
    <NavigationContainer ref={navigatorRef}>
      <ActionSheetProvider>
        <SpreadsheetProvider>
          <Routes />

          <Notifications />

          <ModalListener navigatorRef={navigatorRef} />

          <InputAccessoryView nativeID="amount">
            <AmountAccessoryView />
          </InputAccessoryView>

          <InputAccessoryView nativeID="budget">
            <BudgetAccessoryView />
          </InputAccessoryView>
        </SpreadsheetProvider>
      </ActionSheetProvider>
    </NavigationContainer>
  );
}

export default connect(null, actions)(FinancesApp);
