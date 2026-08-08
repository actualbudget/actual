import { useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
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

/**
 * The report's standard question-mark help icon. The explanation shows on
 * hover, and also while the trigger has keyboard focus - the shared
 * Tooltip only tracks the mouse, so focus is wired up here through its
 * triggerProps escape hatch.
 */
export function MonteCarloHelpTooltip({
  children,
  placement = 'bottom start',
}: MonteCarloHelpTooltipProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Tooltip
      content={
        <View style={{ maxWidth: 300 }}>
          <Text>{children}</Text>
        </View>
      }
      placement={placement}
      style={styles.tooltip}
      triggerProps={isFocused ? { isOpen: true } : {}}
    >
      <Button
        variant="bare"
        aria-label={t('Help')}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ padding: 0, minHeight: 'auto' }}
      >
        <SvgQuestion height={12} width={12} />
      </Button>
    </Tooltip>
  );
}
