import type { ReactNode } from 'react';

import { pageTitleStyle } from '#components/Page';

type SettingsPageTitleProps = {
  children: ReactNode;
};

export function SettingsPageTitle({ children }: SettingsPageTitleProps) {
  return <h1 style={{ ...pageTitleStyle, margin: 0 }}>{children}</h1>;
}
