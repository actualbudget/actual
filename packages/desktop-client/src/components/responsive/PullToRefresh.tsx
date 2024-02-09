import React, { type ComponentProps } from 'react';
import BasePullToRefresh from 'react-simple-pull-to-refresh';

import { ROW_HEIGHT as MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';

import { css } from 'glamor';

type PullToRefreshProps = ComponentProps<typeof BasePullToRefresh>;

export function PullToRefresh(props: PullToRefreshProps) {
  return (
    <div style={{ overflow: 'auto' }}>
      <BasePullToRefresh
        pullDownThreshold={80}
        resistance={2}
        className={String(
          css({
            '& .ptr__pull-down': {
              textAlign: 'center',
            },
            '& .ptr__children': {
              overflow: 'hidden auto',
              paddingBottom: MOBILE_NAV_HEIGHT,
            },
          }),
        )}
        {...props}
      />
    </div>
  );
}
