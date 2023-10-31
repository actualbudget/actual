import { useCallback } from 'react';
import {
  type Location,
  type NavigateFunction,
  type NavigateOptions,
  type To,
  useLocation,
  useNavigate as useNavigateReactRouter,
} from 'react-router-dom';

export default function useNavigate(): NavigateFunction {
  const location = useLocation();
  const navigate = useNavigateReactRouter();
  return useCallback(
    (to: To | number, options: NavigateOptions = {}) => {
      if (typeof to === 'number') {
        navigate(to);
      } else {
        const optionsWithPrevLocation: NavigateOptions = {
          replace:
            options.replace || isSamePath(to, location) ? true : undefined,
          ...options,
          state: {
            ...options?.state,
            previousLocation: location,
          },
        };

        let { previousLocation, ...previousOriginalState } =
          location.state || {};

        if (
          previousLocation == null ||
          !isSamePath(to, previousLocation) ||
          JSON.stringify(options?.state || {}) !==
            JSON.stringify(previousOriginalState)
        ) {
          navigate(to, optionsWithPrevLocation);
        } else {
          // `to` is the same as the previous location. Just go back.
          navigate(-1);
        }
      }
    },
    [navigate, location],
  );
}

function isSamePath(to: To, location: Location) {
  return to === location.pathname + location.search + location.hash;
}
