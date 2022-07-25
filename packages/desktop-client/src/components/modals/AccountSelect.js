import React from 'react';
import GenericSearchableSelect from './GenericSearchableSelect';

export default function AccountSelect({ route, navigation }) {
  let { onSelect } = route.params || {};
  return (
    <GenericSearchableSelect
      title="Select an account"
      dataName="accounts"
      onSelect={id => {
        onSelect(id);
        // navigation.goBack();
      }}
    />
  );
}
