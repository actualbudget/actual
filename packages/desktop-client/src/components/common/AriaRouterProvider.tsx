import type { ReactNode } from 'react';
import { RouterProvider } from 'react-aria-components';
import { useHref } from 'react-router';

import { useNavigate } from '#hooks/useNavigate';

type AriaRouterProviderProps = {
  children: ReactNode;
};

export function AriaRouterProvider({ children }: AriaRouterProviderProps) {
  const navigate = useNavigate();

  return (
    <RouterProvider navigate={path => navigate(path)} useHref={useHref}>
      {children}
    </RouterProvider>
  );
}
