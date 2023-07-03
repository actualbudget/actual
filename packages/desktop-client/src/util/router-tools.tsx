import { type ReactNode, useCallback, useLayoutEffect } from 'react';
import {
  type Location,
  type To,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { ActiveLocationProvider } from '../components/ActiveLocation';
import { PageTypeProvider } from '../components/Page';

let VERSION = Date.now();

export function ExposeNavigate() {
  let navigate = useNavigate();
  let pushModal = usePushModal();
  useLayoutEffect(() => {
    window.__navigate = navigate;
    window.__pushModal = pushModal;
  }, [navigate, pushModal]);
  return null;
}

export function usePushModal() {
  let navigate = useNavigate();
  let location = useLocation();

  return useCallback(
    (path: To, stateProps: Record<string, unknown> = {}) =>
      navigate(path, {
        state: { parent: location, _version: VERSION, ...stateProps },
      }),
    [navigate, location],
  );
}

export function getParent(location: Location): Location | null {
  if (location.state?._version !== VERSION) {
    return null;
  }
  return location.state?.parent || null;
}

export function StackedRoutes({
  render,
}: {
  render: (loc: Location) => ReactNode;
}) {
  let location = useLocation();
  let parent = getParent(location);

  let locations = [location];
  while (parent) {
    locations.unshift(parent);
    parent = getParent(parent);
  }

  let base = locations[0];
  let stack = locations.slice(1);

  return (
    <ActiveLocationProvider location={locations[locations.length - 1]}>
      {render(base)}
      {stack.map((location, idx) => (
        <PageTypeProvider
          key={location.key}
          type="modal"
          current={idx === stack.length - 1}
        >
          {render(location)}
        </PageTypeProvider>
      ))}
    </ActiveLocationProvider>
  );
}
