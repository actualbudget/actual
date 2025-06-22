import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';

import type { ScheduleEntity } from 'loot-core/types/models';
import type { ScheduleTemplate } from 'loot-core/types/models/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { Link } from '@desktop-client/components/common/Link';
import { FormField, FormLabel } from '@desktop-client/components/forms';

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

  return schedules.length ? (
    <Stack
      direction="row"
      align="center"
      spacing={10}
      style={{ marginTop: 10 }}
    >
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
          options={schedules.flatMap(schedule =>
            schedule.name ? [[schedule.name, schedule.name]] : [],
          )}
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
    </Stack>
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
