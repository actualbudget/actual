import { useEffect } from 'react';

import * as Platform from '@actual-app/core/shared/platform';

import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';

import { nextWidthMode } from './sidebar/widthMode';

export function GlobalKeys() {
  const navigate = useNavigate();
  const [widthModePref, setWidthModePref] = useLocalPref('sidebar.widthMode');

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (Platform.isBrowser) {
        return;
      }

      if (e.metaKey) {
        switch (e.key) {
          case '1':
            void navigate('/budget');
            break;
          case '2':
            void navigate('/reports');
            break;
          case '3':
            void navigate('/accounts');
            break;
          case ',':
            if (Platform.OS === 'mac') {
              void navigate('/settings');
            }
            break;
          case '\\':
            setWidthModePref(nextWidthMode(widthModePref ?? 'full'));
            break;
          default:
        }
      }
    };

    document.addEventListener('keydown', handleKeys);

    return () => document.removeEventListener('keydown', handleKeys);
  }, [navigate, widthModePref, setWidthModePref]);

  return null;
}
