import { type Dispatch, type SetStateAction } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import {
  SvgCheveronDown,
  SvgCheveronUp,
} from '@actual-app/components/icons/v1';
import { Stack } from '@actual-app/components/stack';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type ReducerState } from './constants';
import { HistoricalAutomationReadOnly } from './editor/HistoricalAutomationReadOnly';
import { PercentageAutomationReadOnly } from './editor/PercentageAutomationReadOnly';
import { ScheduleAutomationReadOnly } from './editor/ScheduleAutomationReadOnly';
import { SimpleAutomationReadOnly } from './editor/SimpleAutomationReadOnly';
import { WeekAutomationReadOnly } from './editor/WeekAutomationReadOnly';

type BudgetAutomationReadOnlyProps = {
  state: ReducerState;
  categoryNameMap: Record<string, string>;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  onDelete?: () => void;
  style?: CSSProperties;
  inline?: boolean;
};

export function BudgetAutomationReadOnly({
  state,
  categoryNameMap,
  isEditing,
  setIsEditing,
  onDelete,
  style,
  inline,
}: BudgetAutomationReadOnlyProps) {
  const { t } = useTranslation();

  let automationReadOnly;
  switch (state.displayType) {
    case 'simple':
      automationReadOnly = (
        <SimpleAutomationReadOnly template={state.template} />
      );
      break;
    case 'week':
      automationReadOnly = <WeekAutomationReadOnly template={state.template} />;
      break;
    case 'schedule':
      automationReadOnly = (
        <ScheduleAutomationReadOnly template={state.template} />
      );
      break;
    case 'percentage':
      automationReadOnly = (
        <PercentageAutomationReadOnly
          template={state.template}
          categoryNameMap={categoryNameMap}
        />
      );
      break;
    case 'historical':
      automationReadOnly = (
        <HistoricalAutomationReadOnly template={state.template} />
      );
      break;
    default:
      automationReadOnly = (
        <Text>
          <Trans>Unrecognized automation type.</Trans>
        </Text>
      );
      break;
  }

  return (
    <Stack direction="row" align="center" spacing={2} style={style}>
      {inline && (
        <View
          style={{
            borderLeft: `1px solid ${theme.tableBorder}`,
            height: 'calc(100% - 4px)',
          }}
        />
      )}
      <Text style={{ color: theme.tableText, fontSize: 13 }}>
        {automationReadOnly}
      </Text>
      <View style={{ flex: 1 }} />
      <Button
        variant="bare"
        onPress={() => setIsEditing(prev => !prev)}
        style={{ padding: 2 }}
        aria-label={t('Edit template')}
      >
        {isEditing ? (
          <SvgCheveronUp style={{ width: 16, height: 16, color: 'inherit' }} />
        ) : (
          <SvgCheveronDown
            style={{ width: 16, height: 16, color: 'inherit' }}
          />
        )}
      </Button>
      <Button
        variant="bare"
        onPress={onDelete}
        style={{ padding: 5 }}
        aria-label={t('Delete template')}
      >
        <SvgDelete style={{ width: 8, height: 8, color: 'inherit' }} />
      </Button>
    </Stack>
  );
}
