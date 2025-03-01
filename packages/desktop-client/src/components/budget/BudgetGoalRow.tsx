import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type Template } from 'loot-core/server/budget/types/templates';
import {
  type ScheduleEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { BudgetAutomation } from './goals/BudgetAutomation';

type GoalRowProps = {
  template: Template;
  categories: CategoryGroupEntity[];
  schedules: readonly ScheduleEntity[];
  onSaveTemplate: () => void;
  onDeleteTemplate: () => void;
};

export function BudgetGoalRow({
  template,
  categories,
  schedules,
  onSaveTemplate,
  onDeleteTemplate,
}: GoalRowProps) {
  return (
    <View
      style={{
        flexDirection: 'column',
        backgroundColor: theme.tableBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        minHeight: 31,
      }}
    >
      <BudgetAutomation
        template={template}
        categories={categories}
        schedules={schedules}
        onSave={onSaveTemplate}
        onDelete={onDeleteTemplate}
        inline={true}
        readOnlyStyle={{
          minHeight: 31,
          padding: '4px 8px',
          paddingLeft: 30,
          flex: 1,
        }}
      />
    </View>
  );
}
