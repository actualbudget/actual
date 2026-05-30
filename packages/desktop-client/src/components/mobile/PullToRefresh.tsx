import React from 'react';
import type { ComponentProps } from 'react';
import BasePullToRefresh from 'react-simple-pull-to-refresh';

import { css } from '@emotion/css';
import type { CSSProperties } from '@actual-app/components/styles';

type PullToRefreshProps = ComponentProps<typeof BasePullToRefresh> & {
  style?: CSSProperties;
};

export function PullToRefresh(props: PullToRefreshProps) {
  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <BasePullToRefresh
        pullDownThreshold={80}
        resistance={2}
        className={css({
          '& .ptr__pull-down': {
            textAlign: 'center',
          },
          '& .ptr__children': {
            overflow: 'hidden auto',
          },
          ...(props.style || {}),
        })}
        {...props}
        // Force async because the library errors out when a sync onRefresh method is provided.
        onRefresh={async () => {
          await props.onRefresh?.();
        }}
      />
    </div>
  );
}
