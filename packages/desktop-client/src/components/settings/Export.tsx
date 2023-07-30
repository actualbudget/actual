import React from 'react';
import { useSelector } from 'react-redux';

import { format } from 'date-fns';

import {
  selectLocalPrefEncryptKeyId,
  selectLocalPrefId,
} from 'loot-core/src/client/selectors';
import { send } from 'loot-core/src/platform/client/fetch';

import Button from '../common/Button';
import Text from '../common/Text';

import { Setting } from './UI';

export default function ExportBudget() {
  let budgetId = useSelector(selectLocalPrefId);
  let encryptKeyId = useSelector(selectLocalPrefEncryptKeyId);

  async function onExport() {
    let data = await send('export-budget');
    window.Actual.saveFile(
      data,
      `${format(new Date(), 'yyyy-MM-dd')}-${budgetId}.zip`,
      'Export budget',
    );
  }

  return (
    <Setting primaryAction={<Button onClick={onExport}>Export data</Button>}>
      <Text>
        <strong>Export</strong> your data as a zip file containing{' '}
        <code>db.sqlite</code> and <code>metadata.json</code> files. It can be
        imported into another Actual instance by closing an open file (if any),
        then clicking the “Import file” button, then choosing “Actual.”
      </Text>
      {encryptKeyId ? (
        <Text>
          Even though encryption is enabled, the exported zip file will not have
          any encryption.
        </Text>
      ) : null}
    </Setting>
  );
}
