import React, { type CSSProperties } from 'react';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { type Template } from 'loot-core/server/budget/types/templates';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { SvgChartPie } from '../../../icons/v1';
import { useDispatch } from '../../../redux';

type CategoryAutomationButtonProps = {
  width?: number;
  height?: number;
  defaultColor?: string;
  style?: CSSProperties;
};
export function CategoryAutomationButton({
  width = 12,
  height = 12,
  defaultColor = theme.buttonNormalText,
  style,
}: CategoryAutomationButtonProps) {
  const automations: Template[] = [];
  const hasAutomations = !!automations.length;

  const dispatch = useDispatch();

  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');

  if (!goalTemplatesEnabled || !goalTemplatesUIEnabled) {
    return null;
  }

  return (
    <Button
      variant="bare"
      aria-label="Change category automations"
      className={!hasAutomations ? 'hover-visible' : ''}
      style={{
        color: defaultColor,
        ...style,
        ...(hasAutomations && { display: 'flex !important' }),
      }}
      onPress={() => {
        dispatch(pushModal({ modal: { name: 'category-automations-edit' } }));
      }}
    >
      <SvgChartPie style={{ width, height, flexShrink: 0 }} />
    </Button>
  );
}
