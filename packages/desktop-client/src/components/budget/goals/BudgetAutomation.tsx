import { useMemo, useReducer, useRef, useState } from 'react';

import { SpaceBetween } from '@actual-app/components/space-between';
import type { CSSProperties } from '@actual-app/components/styles';

import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from 'loot-core/types/models';
import type { Template } from 'loot-core/types/models/templates';

import { BudgetAutomationEditor } from './BudgetAutomationEditor';
import { BudgetAutomationReadOnly } from './BudgetAutomationReadOnly';
import { DEFAULT_PRIORITY, getInitialState, templateReducer } from './reducer';

import { useEffectAfterMount } from '@desktop-client/hooks/useEffectAfterMount';

type BudgetAutomationProps = {
  categories: CategoryGroupEntity[];
  schedules: readonly ScheduleEntity[];
  template?: Template;
  onSave?: (template: Template) => void;
  onDelete?: () => void;
  style?: CSSProperties;
  readOnlyStyle?: CSSProperties;
  inline?: boolean;
};

const DEFAULT_TEMPLATE: Template = {
  directive: 'template',
  type: 'simple',
  monthly: 0,
  priority: DEFAULT_PRIORITY,
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

  const [state, dispatch] = useReducer(
    templateReducer,
    getInitialState(template ?? DEFAULT_TEMPLATE),
  );

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffectAfterMount(() => {
    onSaveRef.current?.(state.template);
  }, [state]);

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
    <SpaceBetween
      direction="vertical"
      align="stretch"
      gap={inline ? 0 : 5}
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
    </SpaceBetween>
  );
};
