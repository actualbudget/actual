import React from 'react';
import { View, Text } from 'react-native';
import { colors } from 'loot-design/src/style';
import GenericSearchableSelect from './GenericSearchableSelect';

export default function CategorySelect({ route, navigation }) {
  let { onSelect } = route.params || {};
  return (
    <GenericSearchableSelect
      title="Select a category"
      dataName="categories"
      formatItem={item => (
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ fontSize: 15 }}>{item.name}</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: colors.n6 }}>{item['group.name']}</Text>
        </View>
      )}
      onSelect={id => {
        onSelect(id);
        navigation.goBack();
      }}
    />
  );
}
