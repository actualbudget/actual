import React from 'react';

import { send } from 'loot-core/src/platform/client/fetch';
import { Text, Button } from 'loot-design/src/components/common';

import { Setting } from './UI';

export default function ExportBudget({ prefs }) {
  async function onExport() {
    let data = await send('export-budget');
    window.Actual.saveFile(data, `${prefs.id}.zip`, 'Export budget');
  }

  return (
    <Setting primaryAction={<Button onClick={onExport}>Export data</Button>}>
      <Text>
        <strong>Export</strong> your data as a zip file containing{' '}
        <code>db.sqlite</code> and <code>metadata.json</code> files. It can be
        imported into another Actual instance by clicking the “Import file”
        button and then choosing “Actual” on the Files page.
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
