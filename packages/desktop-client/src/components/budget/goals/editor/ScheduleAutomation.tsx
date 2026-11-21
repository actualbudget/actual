import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import type { ScheduleTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { AmountAdjustment } from '#components/budget/goals/editor/AmountAdjustment';
import {
  DESKTOP_FIELD_GAP,
  MOBILE_FIELD_GAP,
  STACKED_FIELD_FLEX,
} from '#components/budget/goals/editor/fieldLayout';
import { Link } from '#components/common/Link';
import { FormField, FormLabel } from '#components/forms';

type ScheduleAutomationProps = {
  schedules: readonly ScheduleEntity[];
  template: ScheduleTemplate;
  dispatch: (action: Action) => void;
};

export const ScheduleAutomation = ({
  schedules,
  template,
  dispatch,
}: ScheduleAutomationProps) => {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const fieldFlex = isNarrowWidth ? STACKED_FIELD_FLEX : 1;
  // Completed and tombstoned schedules can't be picked for a new automation,
  // so a category whose only schedules are completed falls through to the
  // "no schedules" state instead of showing an empty picker. A completed
  // schedule the automation already points at stays listed, though, so the
  // picker shows what the automation is budgeting for.
  const isSelected = (s: ScheduleEntity) =>
    template.scheduleId
      ? s.id === template.scheduleId
      : s.name === template.name;
  const selectableSchedules = schedules
    .filter(
      (s): s is typeof s & { name: string } =>
        !!s.name && !s.tombstone && (!s.completed || isSelected(s)),
    )
    .sort((a, b) =>
      a.name.trim().localeCompare(b.name.trim(), undefined, {
        ignorePunctuation: true,
      }),
    );

  return selectableSchedules.length ? (
    <>
      <SpaceBetween
        gap={isNarrowWidth ? MOBILE_FIELD_GAP : DESKTOP_FIELD_GAP}
        style={{ marginTop: 10 }}
      >
        <FormField style={{ flex: fieldFlex }}>
          <FormLabel title={t('Schedule')} htmlFor="schedule-field" />
          <Select
            id="schedule-field"
            key="schedule-picker"
            defaultLabel={t('Select a schedule')}
            value={
              template.scheduleId ??
              selectableSchedules.find(s => s.name === template.name)?.id
            }
            onChange={scheduleId => {
              const picked = selectableSchedules.find(s => s.id === scheduleId);
              dispatch(
                updateTemplate({
                  type: 'schedule',
                  scheduleId,
                  name: picked?.name ?? '',
                }),
              );
            }}
            options={selectableSchedules.map(
              s =>
                [
                  s.id,
                  s.completed
                    ? t('{{name}} (completed)', { name: s.name })
                    : s.name,
                ] as const,
            )}
          />
        </FormField>
        <FormField style={{ flex: fieldFlex }}>
          <FormLabel title={t('Savings mode')} htmlFor="schedule-full-field" />
          <Select
            id="schedule-full-field"
            key="schedule-full"
            options={[
              ['false', t('Save up for the next occurrence')],
              ['true', t('Cover each occurrence when it occurs')],
            ]}
            value={String(!!template.full)}
            onChange={full =>
              dispatch(
                updateTemplate({
                  type: 'schedule',
                  full: full === 'true',
                }),
              )
            }
          />
        </FormField>
      </SpaceBetween>
      <AmountAdjustment template={template} dispatch={dispatch} />
    </>
  ) : (
    <Text style={{ marginTop: 10 }}>
      <Trans>
        No schedules found, create one in the{' '}
        <Link variant="internal" to="/schedules">
          schedules
        </Link>{' '}
        page.
      </Trans>
    </Text>
  );
};
