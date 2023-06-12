import { useEffect } from 'react';

import { setThemeColor } from '../util/withThemeColor';

export function useSetThemeColor(color) {
  useEffect(() => {
    setThemeColor(color);
  }, [color, setThemeColor]);
}
