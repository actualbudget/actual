import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type State } from '../state';
import { getCategories } from '../state/actions';

export function useCategories() {
  const dispatch = useDispatch();
  const categoriesLoaded = useSelector(
    (state: State) => state.queries.categoriesLoaded,
  );

  useEffect(() => {
    if (!categoriesLoaded) {
      dispatch(getCategories());
    }
  }, []);

  return useSelector(state => state.queries.categories);
}
