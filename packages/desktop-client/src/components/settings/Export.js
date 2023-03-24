import React from 'react';

import { format } from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';

import { Text, Button } from '../common';

import { Setting } from './UI';

export default function ExportBudget({ prefs }) {
  async function onExport() {
    let data = await send('export-budget');
    window.Actual.saveFile(
      data,
      `${format(new Date(), 'yyyy-MM-dd')}-${prefs.id}.zip`,
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
      {prefs.encryptKeyId ? (
        <Text>
          Even though encryption is enabled, the exported zip file will not have
          any encryption.
        </Text>
      ) : null}
    </Setting>
  );
}
