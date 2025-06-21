import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgChartPie } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';

import { type Template } from 'loot-core/types/models/templates';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

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
  const { t } = useTranslation();

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
      aria-label={t('Change category automations')}
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
