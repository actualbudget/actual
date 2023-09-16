import React, { type ComponentProps } from 'react';
import BasePullToRefresh from 'react-simple-pull-to-refresh';

import { css } from 'glamor';

type PullToRefreshProps = ComponentProps<typeof BasePullToRefresh>;

export default function PullToRefresh(props: PullToRefreshProps) {
  return (
    <div style={{ overflow: 'auto', textAlign: 'center' }}>
      <BasePullToRefresh
        pullDownThreshold={80}
        resistance={2}
        className={String(
          css({
            '& .ptr__children': {
              overflow: 'hidden auto',
            },
          }),
        )}
        {...props}
      />
    </div>
  );
}
