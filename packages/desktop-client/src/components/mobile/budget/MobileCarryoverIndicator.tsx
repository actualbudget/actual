import type { CSSProperties } from 'react';

import { SvgArrowThickRight } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

const PILL_SIZE = 12;

type MobileCarryoverIndicatorProps = {
  style?: CSSProperties;
};

export function MobileCarryoverIndicator({
  style,
}: MobileCarryoverIndicatorProps) {
  return (
    <View
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: -(PILL_SIZE + 2),
        top: 0,
        bottom: 0,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: PILL_SIZE,
          height: PILL_SIZE,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: style?.color ?? theme.pageText,
        }}
      >
        <SvgArrowThickRight
          width={9}
          height={9}
          style={{ color: theme.tableBackground }}
        />
      </View>
    </View>
  );
}
