import { useLayoutEffect } from 'react';

import { useNavigate } from '../hooks/useNavigate';

export function ExposeNavigate() {
  const navigate = useNavigate();
  useLayoutEffect(() => {
    window.__navigate = navigate;
  }, [navigate]);
  return null;
}
