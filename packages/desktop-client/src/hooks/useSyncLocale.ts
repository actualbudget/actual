import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGlobalPref } from './useGlobalPref';
import { fetchLocale } from 'loot-core/client/app/appSlice';

export const useSyncLocale = () => {
  const dispatch = useDispatch();
  const [language] = useGlobalPref('language');

  useEffect(() => {
    if (language) {
      dispatch(fetchLocale({ language }));
    }
  }, [language, dispatch]);
};
