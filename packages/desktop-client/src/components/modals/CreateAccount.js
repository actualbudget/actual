import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { View, Text, Modal, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { authorizeBank } from '../../plaid';

class CreateAccount extends React.Component {
  onConnect = async () => {
    authorizeBank(this.props.pushModal);
  };

  onCreateLocalAccount = () => {
    const { pushModal } = this.props;
    pushModal('add-local-account');
  };

  render() {
    const { modalProps } = this.props;

    return (
      <Modal title="Add Account" {...modalProps}>
        {() => (
          <View style={{ maxWidth: 500 }}>
            <Text
              style={{ marginBottom: 10, lineHeight: '1.4em', fontSize: 15 }}
            >
              <strong>Link your bank accounts</strong> to automatically download
              transactions. We offer hundreds of banks to sync with, and our
              service will provide reliable, up-to-date information.
            </Text>

            <Button
              primary
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10
              }}
              onClick={this.onConnect}
            >
              Link bank account
            </Button>

            <View
              style={{
                marginTop: 30,
                marginBottom: 10,
                lineHeight: '1.4em',
                fontSize: 15
              }}
            >
              You can also create a local account if you want to track
              transactions manually. You can add transactions manually or import
              QIF/OFX/QFX files.
            </View>

            <Button
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10,
                color: colors.n3
              }}
              onClick={this.onCreateLocalAccount}
            >
              Create local account
            </Button>
          </View>
        )}
      </Modal>
    );
  }
}

export default connect(
  state => ({
    currentModal: state.modals.currentModal
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(CreateAccount);
