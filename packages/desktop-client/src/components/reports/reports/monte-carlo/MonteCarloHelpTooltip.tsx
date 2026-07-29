import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { SvgQuestion } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

type MonteCarloHelpTooltipProps = {
  /** The explanatory text, typically a Trans block */
  children: ReactNode;
  placement?: ComponentPropsWithoutRef<typeof Tooltip>['placement'];
};

/** The report's standard question-mark help icon with a hover explanation */
export function MonteCarloHelpTooltip({
  children,
  placement = 'bottom start',
}: MonteCarloHelpTooltipProps) {
  return (
    <Tooltip
      content={
        <View style={{ maxWidth: 300 }}>
          <Text>{children}</Text>
        </View>
      }
      placement={placement}
      style={styles.tooltip}
    >
      <SvgQuestion height={12} width={12} cursor="pointer" />
    </Tooltip>
  );
}
