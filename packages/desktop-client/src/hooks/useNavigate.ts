import { useCallback } from 'react';
import {
  type Location,
  type NavigateFunction,
  type NavigateOptions,
  type To,
  useLocation,
  useNavigate as useNavigateReactRouter,
} from 'react-router-dom';

export function useNavigate(): NavigateFunction {
  const location = useLocation();
  const navigate = useNavigateReactRouter();
  return useCallback(
    (to: To | number, options: NavigateOptions = {}) => {
      if (typeof to === 'number') {
        navigate(to);
      } else {
        const optionsWithPrevLocation: NavigateOptions = {
          replace: isSamePath(to, location) ? true : undefined,
          ...options,
        };

        navigate(to, optionsWithPrevLocation);
      }
    },
    [navigate, location],
  );
}

function isSamePath(to: To, location: Location) {
  return to === location.pathname + location.search + location.hash;
}
