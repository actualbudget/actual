import { useCallback, useMemo, useReducer, useState } from 'react';

import { Stack } from '@actual-app/components/stack';
import { type CSSProperties } from '@actual-app/components/styles';

import {
  type CategoryGroupEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';
import { type Template } from 'loot-core/types/models/templates';

import { type Action } from './actions';
import { BudgetAutomationEditor } from './BudgetAutomationEditor';
import { BudgetAutomationReadOnly } from './BudgetAutomationReadOnly';
import { getInitialState, templateReducer } from './reducer';

type BudgetAutomationProps = {
  categories: CategoryGroupEntity[];
  schedules: readonly ScheduleEntity[];
  template?: Template;
  onSave?: () => void;
  onDelete?: () => void;
  style?: CSSProperties;
  readOnlyStyle?: CSSProperties;
  inline?: boolean;
};

const DEFAULT_TEMPLATE: Template = {
  directive: '',
  type: 'simple',
  monthly: 0,
};

export const BudgetAutomation = ({
  onDelete,
  onSave,
  categories,
  schedules,
  readOnlyStyle,
  style,
  template,
  inline = false,
}: BudgetAutomationProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const [state, originalDispatch] = useReducer(
    templateReducer,
    getInitialState(template ?? DEFAULT_TEMPLATE),
  );
  const dispatch = useCallback(
    (action: Action) => {
      originalDispatch(action);
      onSave?.();
    },
    [originalDispatch, onSave],
  );

  const categoryNameMap = useMemo(() => {
    return categories.reduce(
      (acc, group) => {
        for (const category of group.categories ?? []) {
          acc[category.id] = category.name;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [categories]);

  return (
    <Stack
      direction="column"
      spacing={inline ? 0 : 1}
      style={{ ...style, minHeight: 'fit-content' }}
    >
      <BudgetAutomationReadOnly
        state={state}
        categoryNameMap={categoryNameMap}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onDelete={onDelete}
        style={readOnlyStyle}
        inline={inline}
      />
      {isEditing && (
        <BudgetAutomationEditor
          inline={inline}
          state={state}
          dispatch={dispatch}
          schedules={schedules}
          categories={categories}
        />
      )}
    </Stack>
  );
};
