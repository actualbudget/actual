import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function ExposeNavigate() {
  let navigate = useNavigate();
  useLayoutEffect(() => {
    window.__navigate = navigate;
  }, [navigate]);
  return null;
}
