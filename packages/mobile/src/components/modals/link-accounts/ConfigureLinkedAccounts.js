import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import { colors, styles } from 'loot-design/src/style';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import Checkmark from 'loot-design/src/svg/v1/Checkmark';
import { useScrollFlasher } from 'loot-design/src/components/mobile/hooks';
import {
  determineOffBudget,
  fromPlaidAccountType
} from 'loot-core/src/shared/accounts';
import Modal, { CloseButton } from '../Modal';
import Account from './Account';

function ConfigureLinkedAccounts({ route, navigation, connectAccounts }) {
  let { institution, publicToken, accounts } = route.params || {};

  let scrollRef = useScrollFlasher();
  let [offbudgetAccounts, setOffbudgetAccounts] = useState(() =>
    accounts
      .filter(acct =>
        determineOffBudget(fromPlaidAccountType(acct.type, acct.subtype))
      )
      .map(acct => acct.id)
  );
  let [loading, setLoading] = useState(false);

  function onBack() {
    navigation.goBack();
  }

  async function onNext() {
    setLoading(true);
    await connectAccounts(
      institution,
      publicToken,
      accounts.map(acct => acct.id),
      offbudgetAccounts
    );
    setLoading(false);

    navigation.goBack('modal');
  }

  function onToggleAccount(id) {
    if (offbudgetAccounts.includes(id)) {
      setOffbudgetAccounts(offbudgetAccounts.filter(x => x !== id));
    } else {
      setOffbudgetAccounts([...offbudgetAccounts, id]);
    }
  }

  return (
    <Modal
      title="Link Accounts"
      allowScrolling={false}
      rightButton={<CloseButton navigation={navigation} />}
    >
      <View style={{ padding: 15, paddingBottom: 0 }}>
        <Text style={[styles.text, { fontSize: 15 }]}>
          A <Text style={{ fontWeight: '700' }}>budgeted account</Text> is one
          where expenses and income affect the budget. Usually things like
          investments are off budget. We{"'"}ve chosen some defaults here, but
          you can change the status if you like.
        </Text>
      </View>

      {accounts.length === 0 ? (
        <View style={{ padding: 15 }}>
          <EmptyMessage />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, marginTop: 10 }} ref={scrollRef}>
          <View style={{ paddingHorizontal: 15, paddingTop: 5 }}>
            {accounts.map(acct => {
              let offbudget = offbudgetAccounts.includes(acct.id);

              return (
                <Account
                  account={acct}
                  rightContent={
                    <View
                      style={{
                        alignItems: 'center',
                        marginRight: 8,
                        flexDirection: 'row'
                      }}
                    >
                      {offbudget ? (
                        <Text style={[styles.text, { color: colors.n8 }]}>
                          Off budget
                        </Text>
                      ) : (
                        <>
                          <Checkmark
                            style={{
                              width: 15,
                              height: 15,
                              color: colors.g4,
                              marginRight: 5
                            }}
                          />
                          <Text style={[styles.text, { color: colors.g4 }]}>
                            Budgeted
                          </Text>
                        </>
                      )}
                    </View>
                  }
                  onPress={() => onToggleAccount(acct.id)}
                />
              );
            })}
          </View>
        </ScrollView>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          padding: 15
        }}
      >
        <Button style={{ marginRight: 10 }} onPress={onBack}>
          Back
        </Button>
        <ButtonWithLoading primary loading={loading} onPress={onNext}>
          Next
        </ButtonWithLoading>
      </View>
    </Modal>
  );
}

export default connect(null, actions)(ConfigureLinkedAccounts);
