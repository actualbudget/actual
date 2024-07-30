import { useLayoutEffect } from 'react';

import * as asyncStorage from 'loot-core/platform/server/asyncStorage';

import { useNavigate } from '../hooks/useNavigate';

export function ExposeNavigate() {
  const navigate = useNavigate();
  useLayoutEffect(() => {
    window.__navigate = navigate;
    window.__clearUserToken = () => asyncStorage.removeItem('user-token');
  }, [navigate]);
  return null;
}
