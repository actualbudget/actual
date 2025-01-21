import { useEffect } from 'react';
import { useGlobalPref } from './useGlobalPref';
import { fetchLocale } from 'loot-core/client/app/appSlice';
import { useDispatch } from '../redux';

export const useSyncLocale = () => {
  const dispatch = useDispatch();
  const [language] = useGlobalPref('language');

  useEffect(() => {
    if (language) {
      dispatch(fetchLocale({ language }));
    }
  }, [language, dispatch]);
};
