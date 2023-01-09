import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Modal, { CloseButton } from '../Modal';
import { colors, styles } from 'loot-design/src/style';
import { Button } from 'loot-design/src/components/mobile/common';
import Checkmark from 'loot-design/src/svg/v1/Checkmark';
import { useScrollFlasher } from 'loot-design/src/components/mobile/hooks';
import Account from './Account';

export default function SelectLinkedAccounts({ route, navigation }) {
  let { institution, publicToken, accounts } = route.params || {};

  let scrollRef = useScrollFlasher();
  let [selectedAccounts, setSelectedAccounts] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.flashScrollIndicators();
      }
    }, 1000);
  }, []);

  function onToggleAccount(id) {
    if (selectedAccounts.includes(id)) {
      setSelectedAccounts(selectedAccounts.filter(x => x !== id));
    } else {
      setSelectedAccounts([...selectedAccounts, id]);
    }
  }

  function onNext() {
    navigation.navigate('ConfigureLinkedAccounts', {
      institution,
      publicToken,
      accounts: selectedAccounts.map(id =>
        accounts.find(acct => acct.id === id)
      )
    });
  }

  return (
    <Modal
      title="Link Accounts"
      allowScrolling={false}
      rightButton={<CloseButton navigation={navigation} />}
    >
      <View style={{ padding: 15, paddingBottom: 0 }}>
        <Text style={styles.text}>Select which accounts you want to link:</Text>
      </View>

      {accounts.length === 0 ? (
        <View style={{ padding: 15 }}>
          <EmptyMessage />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, marginTop: 10 }} ref={scrollRef}>
          <View style={{ paddingHorizontal: 15, paddingTop: 5 }}>
            {accounts.map(acct => {
              let selected = selectedAccounts.includes(acct.id);
              return (
                <Account
                  account={acct}
                  style={selected ? { backgroundColor: colors.g10 } : null}
                  rightContent={
                    selected && (
                      <View
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                          marginRight: 8
                        }}
                      >
                        <Checkmark
                          style={{ width: 15, height: 15, color: colors.g4 }}
                        />
                      </View>
                    )
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
        <Button primary onPress={onNext}>
          Next
        </Button>
      </View>
    </Modal>
  );
}
