import React from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import { Button } from 'loot-design/src/components/mobile/common';
import { RectButton } from 'react-native-gesture-handler';
import Modal, { CloseButton } from './Modal';
import {
  FieldLabel,
  InputField,
  BooleanField,
  TapField,
  EDITING_PADDING,
  FIELD_HEIGHT
} from 'loot-design/src/components/mobile/forms';
import { toRelaxedNumber } from 'loot-core/src/shared/util';
import { colors } from 'loot-design/src/style';

let accountTypes = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit' },
  { value: 'investment', label: 'Investment' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'debt', label: 'Debt' },
  { value: 'other', label: 'Other' }
];

function getTypeLabel(value) {
  return accountTypes.find(type => type.value === value).label;
}

class AddLocalAccount extends React.Component {
  static navigationOptions = { header: null };
  state = {
    name: '',
    balance: '',
    offbudget: false,
    type: null
  };

  onChange = (name, value) => {
    this.setState({ [name]: value });
  };

  close = () => {
    this.props.navigation.goBack('modal');
  };

  selectType = () => {
    this.props.navigation.navigate('GenericSelectModal', {
      title: 'Choose an account type',
      items: accountTypes,
      snapPoints: [450],
      onSelect: value => {
        this.setState({ type: value });
      }
    });
  };

  onAdd = () => {
    let { name, type, balance, offbudget } = this.state;
    if (name !== '') {
      this.props.createAccount(
        name,
        type || 'checking',
        toRelaxedNumber(balance === '' ? '0' : balance),
        offbudget
      );
      this.close();
    }
  };

  render() {
    let { navigation } = this.props;
    let { name, balance, offbudget, type } = this.state;

    return (
      <Modal
        title="Add an account"
        rightButton={<CloseButton navigation={navigation} />}
      >
        <FieldLabel title="Name" style={{ marginTop: 15 }} />
        <InputField
          value={name}
          onChange={e => this.onChange('name', e.nativeEvent.text)}
          onSubmitEditing={this.onAdd}
          autoFocus
        />

        <FieldLabel title="Balance" />
        <InputField
          value={balance}
          onChange={e => this.onChange('balance', e.nativeEvent.text)}
          onSubmitEditing={this.onAdd}
          placeholder="0"
          keyboardType="numeric"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <FieldLabel title="Type" />
            <RectButton
              onPress={this.selectType}
              style={{
                marginLeft: EDITING_PADDING,
                backgroundColor: 'white',
                height: FIELD_HEIGHT,
                justifyContent: 'center',
                paddingHorizontal: 15,
                borderColor: colors.n9,
                borderWidth: 1,
                borderRadius: 4
              }}
            >
              <Text style={!type && { color: '#b0b0b0' }}>
                {type ? getTypeLabel(type) : 'Checking'}
              </Text>
            </RectButton>
          </View>

          <View style={{ marginHorizontal: 30 }}>
            <FieldLabel title="Off budget" />
            <BooleanField
              value={offbudget}
              onUpdate={value => this.onChange('offbudget', value)}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            padding: 15,
            marginTop: 5
          }}
        >
          <Button
            style={{ marginRight: 10 }}
            onPress={() => navigation.goBack(null)}
          >
            Back
          </Button>
          <Button primary onPress={this.onAdd}>
            Add
          </Button>
        </View>
      </Modal>
    );
  }
}

export default connect(
  null,
  actions
)(AddLocalAccount);
