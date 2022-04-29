import React, { useState, useEffect } from 'react';
import { View, Text, Linking, Platform } from 'react-native';
import { connect } from 'react-redux';
import Purchases from 'react-native-purchases';
import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import Loading from 'loot-design/src/svg/v1/AnimatedLoading';
import { once } from 'loot-core/src/shared/async';
import { captureException } from 'loot-core/src/platform/exceptions';
import { colors } from 'loot-design/src/style';
import { setupPurchases, getOfferings, purchase, restore } from '../util/iap';

function ExternalLink({ href, children }) {
  return (
    <Text
      style={{ textDecorationLine: 'underline' }}
      onPress={() => Linking.openURL(href)}
    >
      {children}
    </Text>
  );
}

function AccountButton({
  userData: originalUserData,
  isLoggedIn,
  navigation,
  loginUser,
  getUserData,
  closeBudget,
  darkMode,
  useDummyPurchaser
}) {
  let userData = originalUserData || { offline: true };

  let [purchaser, setPurchaser] = useState(
    useDummyPurchaser ? { entitlements: { active: {}, all: {} } } : null
  );

  let [packages, setPackages] = useState(null);
  let [initialized, setInitialized] = useState(useDummyPurchaser);
  let [loading, setLoading] = useState(useDummyPurchaser ? 'button' : null);
  let [activationFailure, setActivationFailure] = useState(false);

  useEffect(() => {
    async function run() {
      if (!userData.offline && userData.stripeId == null) {
        if (Platform.OS !== 'ios') {
          alert(
            'An error occurred loading your account. Please contact help@actualbudget.com for support'
          );
          return;
        }

        await setupPurchases(userData);

        let purchaser = await Purchases.getPurchaserInfo();
        setPurchaser(purchaser);

        setInitialized(true);
        setLoading('button');

        let packages = await getOfferings();
        if (packages) {
          setPackages(packages);
        }

        setLoading(null);
      } else {
        setInitialized(true);
      }
    }
    run();
  }, [userData.offline, userData.stripeId]);

  useEffect(() => {
    let listener = navigation.addListener('didFocus', async () => {
      if (!userData.offline && userData.stripeId == null) {
        await setupPurchases(userData);
        let purchaser = await Purchases.getPurchaserInfo();
        setPurchaser(purchaser);
      }
    });

    return () => listener.remove();
  }, []);

  if (!initialized || userData.offline) {
    return null;
  }

  async function onSubscribe() {
    if (loading) {
      return;
    } else if (!packages) {
      alert(
        'No subscriptions available, please contact help@actualbudget.com for support'
      );
      return;
    }

    setLoading('button');
    let result = await purchase(packages[0]);

    // A purchase was made, need to update their account
    if (result) {
      await onActivate(result.purchaser);
    } else {
      setLoading(null);
    }
  }

  async function onActivate(purchaser) {
    setLoading('button');

    let params = {};
    if (!isLoggedIn) {
      params = { userId: userData.id, userKey: userData.key };
    }

    let { error } = await send('subscribe-sync-mobile-subscription', params);

    if (error) {
      setActivationFailure(true);
      setLoading(null);

      // If passed a purchaser, set it. This is to optimize the UX of
      // signing up: if `onSubscribe` does this, the user will see a
      // confusing message because their account hasn't been set up
      // yet.
      if (purchaser) {
        setPurchaser(purchaser);
      }
    } else {
      setActivationFailure(false);

      // It's possible that the user isn't actually logged in yet (no
      // user registered in the backend) because they are creating an
      // account
      if (!isLoggedIn) {
        loginUser(userData.id, userData.key);
      } else {
        await getUserData();
        setLoading(null);

        if (purchaser) {
          setPurchaser(purchaser);
        }
      }
    }
  }

  function onManage() {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      alert(
        'Your subscription is managed through Google Play. Manage your subscription through the Play Store.'
      );
    }
  }

  async function onRestore() {
    if (loading) {
      return;
    }

    setLoading('button');
    let purchaser = await restore();
    if (purchaser) {
      setPurchaser(purchaser);
    }

    // In case the subscription has expired but the user's account
    // doesn't reflect it yet, this forces it to check subscription status
    await send('subscribe-sync-mobile-subscription', {});
    await getUserData();

    setLoading(null);
  }

  async function onManageWeb() {
    setLoading('button');
    let tempId = await send('make-user-temp-id');
    setLoading(null);

    let url = 'https://actualbudget.com/account?tempId=' + tempId;
    Linking.openURL(url);
  }

  let buttonProps = {
    primary: true,
    loading: loading === 'button',
    padding: 3,
    loadingColor: darkMode ? colors.n1 : 'white',
    style: darkMode ? { backgroundColor: 'white' } : null,
    contentStyle: darkMode ? { borderWidth: 0 } : null,
    textStyle: { color: darkMode ? colors.n1 : 'white', fontSize: 17 }
  };

  let store = Platform.OS === 'ios' ? 'Apple' : 'Google Play';
  let content;

  if (purchaser) {
    // A bunch of logic. Really annoying to have to sync mobile
    // subscriptions to our own accounts.
    if (
      userData.status === 'subscribed' ||
      userData.status === 'trial' ||
      userData.status === 'pending_payment'
    ) {
      if (
        purchaser.entitlements.active['Actual'] ||
        userData.status === 'pending_payment'
      ) {
        content = (
          <ButtonWithLoading {...buttonProps} onPress={onManage}>
            Manage subscription
          </ButtonWithLoading>
        );
      } else {
        content = (
          <ButtonWithLoading {...buttonProps} onPress={onRestore}>
            Restore purchase
          </ButtonWithLoading>
        );
      }
    } else if (activationFailure) {
      // Something went wrong while registering the subscription
      // with the server after purchasing it. Ask them to try
      // again
      content = (
        <View>
          <Text
            style={{
              fontSize: 15,
              color: darkMode ? colors.r9 : colors.r4,
              lineHeight: 22,
              marginBottom: 5
            }}
          >
            Something went wrong activating your subscription after purchase.
            You need to activate it.
          </Text>

          <ButtonWithLoading {...buttonProps} onPress={() => onActivate()}>
            Activate subscription
          </ButtonWithLoading>
        </View>
      );
    } else {
      // Note that we will show this even in the case where the user
      // has an active Actual entitlement (subscription). That is tied
      // to their device, but the source of truth is their Actual
      // account. In the case where they've already subscribed, we'll show a
      // subscribe button and when clicked the OS will tell them they've
      // already subscribe.

      let price = packages ? packages[0].product.price_string : '...';

      content = (
        <View>
          <ButtonWithLoading {...buttonProps} onPress={onSubscribe}>
            <Text
              style={{ fontSize: 16, color: darkMode ? colors.n1 : 'white' }}
            >
              Subscribe to Actual for {price} / month
            </Text>
          </ButtonWithLoading>

          <Text
            style={{
              marginTop: 15,
              color: darkMode ? colors.p9 : colors.n4
            }}
          >
            After 1 month, a {price} purchase will be applied to your iTunes
            account. Subscriptions will automatically renew unless canceled
            within 24-hours before the end of the current period. You can cancel
            anytime with your iTunes account setting. For more information, see
            our{' '}
            <ExternalLink href="https://actualbudget.com/terms-and-privacy/">
              Terms of Service
            </ExternalLink>{' '}
            and{' '}
            <ExternalLink href="https://actualbudget.com/terms-and-privacy/">
              Privacy Policy
            </ExternalLink>
            .
          </Text>
        </View>
      );
    }
  } else if (userData.stripeId) {
    content = (
      <ButtonWithLoading {...buttonProps} onPress={onManageWeb}>
        Manage subscription
      </ButtonWithLoading>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      {loading === 'global' ? (
        <View style={{ alignItems: 'center' }}>
          <Loading
            width={30}
            height={30}
            color={darkMode ? 'white' : colors.n1}
          />
        </View>
      ) : (
        <>
          {purchaser && purchaser.entitlements.active['Actual'] && (
            <Text
              style={{
                fontSize: 13,
                color: darkMode ? colors.n9 : colors.n4,
                marginBottom: 10,
                textAlign: 'center'
              }}
            >
              Your subscription is managed through {store}.
            </Text>
          )}

          {content}
        </>
      )}
    </View>
  );
}

export default connect(
  (state, props) => ({
    userData: props.userData || state.user.data,
    isLoggedIn: !!state.user.data
  }),
  actions
)(AccountButton);
