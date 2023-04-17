import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import * as Platform from 'loot-core/src/client/platform';

export default function GlobalKeys() {
  let history = useHistory();
  useEffect(() => {
    const handleKeys = e => {
      if (Platform.isBrowser) {
        return;
      }

      if (e.metaKey) {
        switch (e.key) {
          case '1':
            history.push('/budget');
            break;
          case '2':
            history.push('/reports');
            break;
          case '3':
            history.push('/accounts');
            break;
          case ',':
            if (Platform.OS === 'mac') {
              history.push('/settings');
            }
            break;
          default:
        }
      }
    };

    document.addEventListener('keydown', handleKeys);

    return () => document.removeEventListener('keydown', handleKeys);
  }, []);

  return null;
}
