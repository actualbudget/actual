import React from 'react';
import { send } from 'loot-core/src/platform/client/fetch';
import GenericSearchableSelect from './GenericSearchableSelect';

export default function PayeeSelect({ route, navigation }) {
  let { onSelect } = route.params || {};
  return (
    <GenericSearchableSelect
      title="Select a payee"
      dataName="payees"
      canAdd={true}
      formatItem={item => (item.transfer_acct ? 'Transfer: ' : '') + item.name}
      onSelect={async id => {
        if (id.startsWith('new:')) {
          id = await send('payee-create', {
            name: id.slice('new:'.length)
          });
        }

        onSelect(id);
        navigation.goBack();
      }}
    />
  );
}
