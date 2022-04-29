import React from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import { Button } from 'loot-design/src/components/mobile/common';
import Modal from './Modal';
import {
  FieldLabel,
  InputField
} from 'loot-design/src/components/mobile/forms';

class AddCategory extends React.Component {
  state = { name: '' };

  onChange = e => {
    this.setState({ name: e.nativeEvent.text });
  };

  close = () => {
    this.props.navigation.goBack();
  };

  onAdd = () => {
    let { onAdd } = this.props.route.params || {};
    let { name } = this.state;

    onAdd(name);
    this.close();
  };

  render() {
    let { name } = this.state;

    return (
      <Modal title="Add a category">
        <FieldLabel title="Name" style={{ marginTop: 15 }} />
        <InputField
          value={name}
          onChange={this.onChange}
          onSubmitEditing={this.onAdd}
          autoFocus
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            padding: 15,
            marginTop: 5
          }}
        >
          <Button style={{ marginRight: 10 }} onPress={() => this.close()}>
            Close
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
)(AddCategory);
