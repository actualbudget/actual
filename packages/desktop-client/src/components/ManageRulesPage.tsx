import React from 'react';

import { useResponsive } from '../ResponsiveProvider';
import { theme } from '../style';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

export function ManageRulesPage() {
  const { isNarrowWidth } = useResponsive();
  return (
    <Page
      title="Rules"
      titleStyle={{
        ...(isNarrowWidth && {
          backgroundColor: theme.mobileHeaderBackground,
          color: theme.mobileHeaderText,
        }),
      }}
    >
      <ManageRules isModal={false} payeeId={null} />
    </Page>
  );
}
