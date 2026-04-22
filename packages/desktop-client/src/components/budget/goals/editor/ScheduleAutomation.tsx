import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import type { ScheduleTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
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
  // Match the filter applied to the Select options below — completed and
  // tombstoned schedules aren't selectable, so a category whose only
  // schedules are completed should fall through to the "no schedules" state
  // instead of showing an empty picker.
  const selectableSchedules = schedules.filter(
    (s): s is typeof s & { name: string } =>
      !!s.name && !s.completed && !s.tombstone,
  );

  return selectableSchedules.length ? (
    <SpaceBetween gap={50} style={{ marginTop: 10 }}>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Schedule')} htmlFor="schedule-field" />
        <Select
          id="schedule-field"
          key="schedule-picker"
          defaultLabel={t('Select a schedule')}
          value={template.name}
          onChange={schedule =>
            dispatch(
              updateTemplate({
                type: 'schedule',
                name: schedule,
              }),
            )
          }
          options={selectableSchedules.map(s => [s.name, s.name] as const)}
        />
      </FormField>
      <FormField style={{ flex: 1 }}>
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
