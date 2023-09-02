import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '../../hooks/useActions';
import { colors } from '../../style';
import { Information } from '../alerts';
import Button from '../common/Button';
import Text from '../common/Text';
import View from '../common/View';

import { Setting } from './UI';

export default function GlobalSettings() {
  let documentDir = useSelector(state => state.prefs.global.documentDir);
  let { saveGlobalPrefs } = useActions();

  let [documentDirChanged, setDirChanged] = useState(false);
  let dirScrolled = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (dirScrolled.current) {
      dirScrolled.current.scrollTo(10000, 0);
    }
  }, []);

  async function onChooseDocumentDir() {
    let res = await window.Actual.openFileDialog({
      properties: ['openDirectory'],
    });
    if (res) {
      saveGlobalPrefs({ documentDir: res[0] });
      setDirChanged(true);
    }
  }

  return (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row' }}>
          <Button onClick={onChooseDocumentDir}>Change location</Button>
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
          backgroundColor: colors.n10,
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
