import React from 'react';
import { View, Text, FlatList, Keyboard } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { ListItem } from 'loot-design/src/components/mobile/table';
class GenericSelect extends React.Component {
  onSelect = value => {
    const { navigation } = this.props;
    const { onSelect } = this.props.route.params || {};
    onSelect && onSelect(value);
    navigation.goBack();
  };

  renderItem = ({ item }) => {
    return (
      <RectButton
        onPress={() => this.onSelect(item.value)}
        underlayColor="#f0f0f0"
        activeOpacity={1}
        style={{ backgroundColor: 'white' }}
      >
        <ListItem
          style={{
            backgroundColor: 'transparent',
            borderColor: '#e0e0e0'
          }}
        >
          <Text style={{ fontSize: 15, flex: 1 }}>{item.label}</Text>
        </ListItem>
      </RectButton>
    );
  };

  render() {
    const { navigation } = this.props;
    const { title, items, snapPoints } = this.props.route.params || {};

    return (
      <View style={{ flex: 1 }}>
        <View style={{ padding: 10 }}>
          <Text
            style={{
              textAlign: 'center',
              color: '#505050',
              marginBottom: 10,
              fontSize: 15,
              fontWeight: '600',
              marginVertical: 10
            }}
          >
            {title}
          </Text>
        </View>
        <FlatList
          data={items}
          renderItem={this.renderItem}
          keyboardShouldPersistTaps={true}
          automaticallyAdjustContentInsets={false}
          keyExtractor={item => item.value}
          style={{ flex: 1, backgroundColor: 'white' }}
        />
      </View>
    );
  }
}

export default GenericSelect;
