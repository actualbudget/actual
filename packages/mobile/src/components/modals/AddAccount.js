import React from 'react';
import { View, Text } from 'react-native';
//import { openLink } from 'react-native-plaid-link-sdk';
import { Button } from 'loot-design/src/components/mobile/common';
import { colors, styles } from 'loot-design/src/style';
import { send } from 'loot-core/src/platform/client/fetch';
import Modal, { CloseButton } from './Modal';

let PLAID_CONFIG = {
  env: 'sandbox',
  publicKey: '25b3c7e18fa05f2bdbb0ad0640fdfe'
};

function normalizePlaidData(data) {
  // Normalize the data object. The plaid SDK returns it
  // differently on Android
  if (data.link_connection_metadata) {
    let metadata = data.link_connection_metadata;
    data = {
      public_token: data.public_token,
      institution: {
        institution_id: metadata.institution_id,
        name: metadata.institution_name
      },
      accounts: metadata.accounts.map(acct => ({
        type: acct.account_type,
        subtype: acct.account_sub_type,
        mask: acct.account_number,
        name: acct.account_name,
        id: acct.account_id
      }))
    };
  }
  return data;
}

export default function AddAccount({ navigation }) {
  function onLink() {
    // openLink({
    //   env: PLAID_CONFIG.env,
    //   publicKey: PLAID_CONFIG.publicKey,
    //   clientName: 'Actual',
    //   webviewRedirectUri: 'actual://plaid-redirect',
    //   product: ['transactions'],
    //   onSuccess: async data => {
    //     data = normalizePlaidData(data);
    //     navigation.navigate('SelectLinkedAccounts', {
    //       institution: data.institution,
    //       publicToken: data.public_token,
    //       accounts: data.accounts
    //     });
    //   },
    //   onExit: data => {}
    // });
  }

  function onCreateLocal() {
    navigation.navigate('AddLocalAccount');
  }

  return (
    <Modal
      title="Add Account"
      allowScrolling={true}
      rightButton={<CloseButton navigation={navigation} />}
      backgroundColor="white"
    >
      <View style={{ padding: 15, paddingTop: 20 }}>
        <Text style={styles.text}>
          <Text style={{ fontWeight: '700' }}>Link your bank accounts</Text> to
          automatically download transactions. We offer hundreds of banks to
          sync with and our service will provide reliable, up-to-date
          information.
        </Text>
        <Button
          primary
          style={{ marginTop: 15 }}
          onPress={onLink}
          textStyle={{ fontWeight: '700' }}
        >
          Link bank account
        </Button>

        <Text style={[styles.text, { marginTop: 30 }]}>
          You can also create a local account if you want to track transactions
          manually. You can add transactions manually or import QIF/OFX/QFX
          files in the desktop app.
        </Text>
        <Button style={{ marginVertical: 15 }} onPress={onCreateLocal}>
          Create local account
        </Button>
      </View>
    </Modal>
  );
}
