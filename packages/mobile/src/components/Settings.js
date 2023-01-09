import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { listen } from 'loot-core/src/platform/client/fetch';
import { numberFormats } from 'loot-core/src/shared/util';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import {
  FieldLabel,
  TapField,
  EDITING_PADDING
} from 'loot-design/src/components/mobile/forms';
import { colors, styles } from 'loot-design/src/style';
import ExpandArrow from 'loot-design/src/svg/ExpandArrow';

import AccountButton from './AccountButton';

let dateFormats = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' }
];

function getValueLabel(data, value) {
  let item = data.find(f => f.value === value);
  return item ? item.label : null;
}

class Settings extends React.Component {
  state = { loading: true, expanded: false, resetting: false };
  static navigationOptions = {
    title: 'Settings'
  };

  async componentDidMount() {
    this.unlisten = listen('prefs-updated', () => {
      this.props.loadPrefs();
    });

    await this.props.getUserData();
    this.setState({ loading: false });
    this.props.loadPrefs();
  }

  componentWillUnmount() {
    this.unlisten();
  }

  closeBudget = () => {
    this.props.closeBudget();
  };

  selectDateFormat = () => {
    this.props.navigation.navigate('GenericSelectModal', {
      title: 'Choose a date format',
      items: dateFormats,
      snapPoints: [450],
      onSelect: value => {
        this.props.savePrefs({ dateFormat: value });
      }
    });
  };

  selectNumberFormat = () => {
    this.props.navigation.navigate('GenericSelectModal', {
      title: 'Choose a number format',
      items: numberFormats,
      snapPoints: [450],
      onSelect: value => {
        this.props.savePrefs({ numberFormat: value });
      }
    });
  };

  resetSync = async () => {
    this.setState({ resetting: true });
    await this.props.resetSync();
    this.setState({ resetting: false });
  };

  render() {
    let { prefs, sync, userData, navigation } = this.props;
    let { loading, expanded, resetting } = this.state;
    let dateFormat = prefs.dateFormat || 'MM/dd/yyyy';
    let numberFormat = prefs.numberFormat || 'comma-dot';

    return (
      <ScrollView style={{ flex: 1 }}>
        <FocusAwareStatusBar barStyle="dark-content" />
        <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
          <Text
            style={[
              styles.text,
              { fontWeight: '600', marginTop: 20, fontSize: 17 }
            ]}
          >
            {prefs.budgetName}
          </Text>
          <Button onPress={this.closeBudget} style={{ marginTop: 10 }}>
            Close Budget
          </Button>
        </View>

        <FieldLabel title="DATE FORMAT" />
        <TapField
          onTap={this.selectDateFormat}
          value={getValueLabel(dateFormats, dateFormat)}
        />

        <FieldLabel title="NUMBER FORMAT" />
        <TapField
          onTap={this.selectNumberFormat}
          value={getValueLabel(numberFormats, numberFormat)}
        />

        {userData && (
          <View style={{ marginTop: 15 }}>
            <FieldLabel title="ACCOUNT" />
            <Text
              style={[
                styles.text,
                { marginTop: 5, marginLeft: EDITING_PADDING }
              ]}
            >
              {!userData.offline ? (
                <Text>
                  Signed in as{' '}
                  <Text style={{ fontWeight: '600' }}>{userData.email}</Text>
                </Text>
              ) : (
                <Text>Offline</Text>
              )}
            </Text>

            <View style={{ paddingHorizontal: EDITING_PADDING }}>
              {userData.status === 'trial' && (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: colors.y9,
                    borderRadius: 4,
                    padding: 10
                  }}
                >
                  <Text style={{ fontSize: 15, color: colors.y1 }}>
                    Trial ends in{' '}
                    <Text style={{ fontWeight: '600' }}>
                      {userData.trialDaysLeft} days
                    </Text>
                    .
                  </Text>
                </View>
              )}

              {userData.status === 'pending_payment' && (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: colors.r9,
                    borderRadius: 4,
                    padding: 10
                  }}
                >
                  <Text style={{ fontSize: 15, color: colors.r1 }}>
                    We had a problem with your latest payment. Please update
                    your payment method. Your subscription will be cancelled
                    after 2 weeks.
                  </Text>
                </View>
              )}

              <AccountButton navigation={navigation} />
            </View>
          </View>
        )}

        <FieldLabel title="ENCRYPTION" />
        {prefs.encryptKeyId ? (
          <View
            style={{
              alignItems: 'flex-start',
              marginHorizontal: EDITING_PADDING
            }}
          >
            <Text style={[styles.text, { marginTop: 5, color: colors.n2 }]}>
              <Text style={{ color: colors.g4, fontWeight: '600' }}>
                Encryption is turned on.
              </Text>{' '}
              Your data is encrypted with a key that only you have before
              sending it out to the cloud . Local data remains unencrypted so if
              you forget your password you can re-encrypt it.
            </Text>
            <Button
              style={{ marginTop: 10 }}
              onPress={() =>
                navigation.navigate('CreateEncryptionKeyModal', {
                  recreate: true
                })
              }
            >
              Generate new key
            </Button>
          </View>
        ) : (
          <View
            style={{
              alignItems: 'flex-start',
              marginHorizontal: EDITING_PADDING
            }}
          >
            <Text style={[styles.text, { marginTop: 5, color: colors.n2 }]}>
              Encryption is not enabled. Any data on our servers is still stored
              safely and securely, but it's not end-to-end encrypted which means
              we have the ability to read it (but we won't). If you want, you
              can use a password to encrypt your data on our servers.
            </Text>
            <Button
              style={{ marginTop: 10 }}
              onPress={() => {
                navigation.navigate('CreateEncryptionKeyModal');
              }}
            >
              Enable encryption
            </Button>
          </View>
        )}

        {userData && (
          <View style={{ marginTop: 35, marginBottom: 30 }}>
            <Button
              bare
              style={[
                {
                  flexDirection: 'row',
                  alignSelf: 'flex-start',
                  paddingHorizontal: 5,
                  paddingVertical: 10,
                  marginLeft: EDITING_PADDING,
                  backgroundColor: 'transparent'
                }
              ]}
              onPress={() => this.setState({ expanded: !expanded })}
            >
              <ExpandArrow
                width={8}
                height={8}
                style={{
                  marginRight: 5,
                  ...(!expanded && { transform: [{ rotateZ: '-90deg' }] })
                }}
              />
              <FieldLabel
                title="ADVANCED"
                style={{
                  textAlign: 'center',
                  marginTop: 0,
                  marginBottom: 0,
                  paddingLeft: 0
                }}
              />
            </Button>

            {expanded && (
              <View>
                <Text
                  style={[styles.text, { marginHorizontal: 15, fontSize: 14 }]}
                >
                  <Text style={{ fontWeight: '600' }}>Reset sync</Text> will
                  remove all local data used to track changes for syncing, and
                  create a fresh sync id on our server. This file on other
                  devices will have to be re-downloaded to use the new sync id.
                  Use this if there is a problem with syncing and you want to
                  start fresh.
                </Text>
                <View style={{ alignItems: 'center', marginVertical: 15 }}>
                  <ButtonWithLoading
                    loading={resetting}
                    loadingColor={colors.n1}
                    onPress={this.resetSync}
                  >
                    Reset sync
                  </ButtonWithLoading>
                </View>
                <Text
                  style={[styles.text, { fontSize: 13, textAlign: 'center' }]}
                >
                  Sync ID: {prefs.groupId || '(not synced)'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  }
}

export default connect(
  state => ({ prefs: state.prefs.local, userData: state.user.data }),
  actions
)(Settings);
