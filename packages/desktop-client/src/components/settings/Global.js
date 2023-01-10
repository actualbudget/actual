import React, { useState, useEffect, useRef } from 'react';

import { Information } from 'loot-design/src/components/alerts';
import { View, Text, Button } from 'loot-design/src/components/common';

import { Section } from './UI';

export default function GlobalSettings({ globalPrefs, saveGlobalPrefs }) {
  let [documentDirChanged, setDirChanged] = useState(false);
  let dirScrolled = useRef(null);

  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  async function onChooseDocumentDir() {
    let res = await window.Actual.openFileDialog({
      properties: ['openDirectory']
    });
    if (res) {
      saveGlobalPrefs({ documentDir: res[0] });
      setDirChanged(true);
    }
  }

  return (
    <Section title="General">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <Text style={{ flexShrink: 0 }}>Store files here: </Text>
        <Text
          innerRef={dirScrolled}
          style={{
            backgroundColor: 'white',
            padding: '7px 10px',
            borderRadius: 4,
            marginLeft: 5,
            overflow: 'auto',
            whiteSpace: 'nowrap',
            // TODO: When we update electron, we should be able to
            // remove this. In previous versions of Chrome, once the
            // scrollbar appears it never goes away
            '::-webkit-scrollbar': { display: 'none' }
          }}
        >
          {globalPrefs.documentDir}
        </Text>
        <Button
          primary
          onClick={onChooseDocumentDir}
          style={{
            fontSize: 14,
            marginLeft: 5,
            flexShrink: 0,
            alignSelf: 'flex-start'
          }}
        >
          Change location
        </Button>
      </View>
      {documentDirChanged && (
        <Information style={{ marginTop: 10 }}>
          A restart is required for this change to take effect
        </Information>
      )}
    </Section>
  );
}
