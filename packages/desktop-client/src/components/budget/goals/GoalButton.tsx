import React, { type ComponentProps, type CSSProperties } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { type Template } from 'loot-core/server/budget/types/templates';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { SvgChartPie } from '../../../icons/v1';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';

const arr = [];

type GoalButtonProps = {
  id: string;
  width?: number;
  height?: number;
  defaultColor?: string;
  tooltipPosition?: ComponentProps<typeof Tooltip>['placement'];
  style?: CSSProperties;
};
export function GoalButton({
  width = 12,
  height = 12,
  defaultColor = theme.buttonNormalText,
  tooltipPosition = 'bottom start',
  style,
}: GoalButtonProps) {
  const templates: Template[] = arr;
  const hasGoals = !!templates.length;

  const dispatch = useDispatch();

  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');

  if (!goalTemplatesEnabled || !goalTemplatesUIEnabled) {
    return null;
  }

  return (
    <Tooltip
      content={<View />}
      placement={tooltipPosition}
      triggerProps={{
        isDisabled: !hasGoals,
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <Button
          variant="bare"
          aria-label="Set category goals"
          className={!hasGoals ? 'hover-visible' : ''}
          style={{
            color: defaultColor,
            ...style,
            ...(hasGoals && { display: 'flex !important' }),
          }}
          onPress={() => {
            dispatch(pushModal('category-goals-edit'));
          }}
        >
          <SvgChartPie style={{ width, height, flexShrink: 0 }} />
        </Button>
      </View>
    </Tooltip>
  );
}
