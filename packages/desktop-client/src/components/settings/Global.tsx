import React, { useState, useEffect, useRef } from 'react';

import { useGlobalPref } from '../../hooks/useGlobalPref';
import { theme } from '../../style';
import { Information } from '../alerts';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Setting } from './UI';

export function GlobalSettings() {
  const [documentDir, setDocumentDirPref] = useGlobalPref('documentDir');

  const [documentDirChanged, setDirChanged] = useState(false);
  const dirScrolled = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  async function onChooseDocumentDir() {
    const res = await window.Actual?.openFileDialog({
      properties: ['openDirectory'],
    });
    if (res) {
      setDocumentDirPref(res[0]);
      setDirChanged(true);
    }
  }

  return (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row' }}>
          <Button onPress={onChooseDocumentDir}>Change location</Button>
          {documentDirChanged && (
            <Information>
              A restart is required for this change to take effect
            </Information>
          )}
        </View>
      }
    >
      <Text>
        <strong>Actual’s files</strong> are stored in a folder on your computer.
        Currently, that’s:
      </Text>
      <Text
        innerRef={dirScrolled}
        style={{
          backgroundColor: theme.pageBackground,
          padding: '7px 10px',
          borderRadius: 4,
          overflow: 'auto',
          whiteSpace: 'nowrap',
          // TODO: When we update electron, we should be able to
          // remove this. In previous versions of Chrome, once the
          // scrollbar appears it never goes away
          '::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {documentDir}
      </Text>
    </Setting>
  );
}
