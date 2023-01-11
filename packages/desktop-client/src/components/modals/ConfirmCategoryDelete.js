import React from 'react';

import { NativeCategorySelect } from 'loot-design/src/components/CategorySelect';
import {
  View,
  Text,
  Block,
  Modal,
  Button
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

class ConfirmCategoryDelete extends React.Component {
  state = { transferCategory: null, error: null };

  componentDidMount() {
    // Hack: 200ms is the timing of the modal animation
    setTimeout(() => {
      this.input.focus();
    }, 200);
  }

  onDelete = () => {
    let { transferCategory } = this.state;
    let { onDelete } = this.props;

    if (!transferCategory) {
      this.setState({ error: 'required-transfer' });
    } else {
      onDelete(transferCategory);
      this.props.modalProps.onClose();
    }
  };

  renderError = error => {
    let msg;

    switch (error) {
      case 'required-transfer':
        msg = 'You must select a category';
        break;
      default:
        msg = 'Something bad happened, sorry!';
    }

    return <Text style={{ marginTop: 15, color: colors.r4 }}>{msg}</Text>;
  };

  render() {
    const { modalProps, category, group, categoryGroups } = this.props;
    const { transferCategory, error } = this.state;
    const isIncome = !!(category || group).is_income;

    return (
      <Modal title="Confirm Delete" {...modalProps} style={{ flex: 0 }}>
        {() => (
          <View style={{ lineHeight: 1.5 }}>
            {group ? (
              <Block>
                Categories in the group <strong>{group.name}</strong> are used
                by existing transaction
                {!isIncome &&
                  ' or it has a positive leftover balance currently'}
                . <strong>Are you sure you want to delete it?</strong> If so,
                you must select another category to transfer existing
                transactions and balance to.
              </Block>
            ) : (
              <Block>
                <strong>{category.name}</strong> is used by existing
                transactions
                {!isIncome &&
                  ' or it has a positive leftover balance currently'}
                . <strong>Are you sure you want to delete it?</strong> If so,
                you must select another category to transfer existing
                transactions and balance to.
              </Block>
            )}

            {error && this.renderError(error)}

            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center'
              }}
            >
              <Text>Transfer to:</Text>

              <View style={{ flex: 1, marginLeft: 10, marginRight: 30 }}>
                <NativeCategorySelect
                  ref={el => (this.input = el)}
                  categoryGroups={
                    group
                      ? categoryGroups.filter(
                          g => g.id !== group.id && !!g.is_income === isIncome
                        )
                      : categoryGroups
                          .filter(g => !!g.is_income === isIncome)
                          .map(g => ({
                            ...g,
                            categories: g.categories.filter(
                              c => c.id !== category.id
                            )
                          }))
                  }
                  name="category"
                  value={transferCategory}
                  onChange={e =>
                    this.setState({ transferCategory: e.target.value })
                  }
                />
              </View>

              <Button primary onClick={() => this.onDelete()}>
                Delete
              </Button>
            </View>
          </View>
        )}
      </Modal>
    );
  }
}

export default ConfirmCategoryDelete;
