import { useState } from 'react';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { View } from '@actual-app/components/view';
import { currentMonth } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Template } from '@actual-app/core/types/models/templates';

import { useBudgetAutomationCategories } from '#components/budget/goals/useBudgetAutomationCategories';
import { Modal } from '#components/common/Modal';
import { useBudgetAutomations } from '#hooks/useBudgetAutomations';
import { useCategory } from '#hooks/useCategory';
import { useNotes } from '#hooks/useNotes';
import { useSchedules } from '#hooks/useSchedules';

import { BudgetAutomationsBody } from './BudgetAutomationsBody';
import { migrateTemplatesToAutomations } from './migrateTemplatesToAutomations';
import {
  hasCleanupLine,
  UnsupportedDirectivesNotice,
} from './UnsupportedDirectivesNotice';

const MODAL_WIDTH = 960;
const MODAL_HEIGHT = 760;

export function BudgetAutomationsModal({
  categoryId,
  month,
}: {
  categoryId: string;
  month?: string;
}) {
  const [parsedTemplates, setParsedTemplates] = useState<Template[] | null>(
    null,
  );
  const effectiveMonth = month ?? currentMonth();

  const onLoaded = (result: Record<string, Template[]>) => {
    setParsedTemplates(result[categoryId] ?? []);
  };

  const { loading } = useBudgetAutomations({ categoryId, onLoaded });

  const { schedules } = useSchedules({ query: q('schedules').select('*') });

  const categories = useBudgetAutomationCategories();
  const { data: currentCategory } = useCategory(categoryId);
  const notes = useNotes(categoryId);

  const needsMigration = currentCategory?.template_settings?.source !== 'ui';

  const hasErrorTemplate =
    parsedTemplates?.some(t => t.type === 'error') ?? false;
  const hasSpendTemplate =
    parsedTemplates?.some(t => t.type === 'spend') ?? false;
  // Only surface stale `#cleanup` lines for categories that haven't been
  // migrated to UI-managed automations; once `source === 'ui'`, the notes
  // are no longer the source of truth.
  const hasCleanupDirective = needsMigration && hasCleanupLine(notes);
  const hasUnsupportedDirective =
    hasErrorTemplate || hasSpendTemplate || hasCleanupDirective;

  const incomeNameToId = new Map<string, string>();
  for (const group of categories) {
    for (const cat of group.categories ?? []) {
      if (cat.name) incomeNameToId.set(cat.name.toLowerCase(), cat.id);
    }
  }
  const resolved = parsedTemplates?.map(t => {
    if (t.type !== 'percentage' || !t.category) return t;
    const id = incomeNameToId.get(t.category.toLowerCase());
    return id ? { ...t, category: id } : t;
  });
  const initialEntries =
    resolved && !hasUnsupportedDirective
      ? migrateTemplatesToAutomations(resolved)
      : null;

  return (
    <Modal
      name="category-automations-edit"
      containerProps={{
        style: {
          width: MODAL_WIDTH,
          maxWidth: '95vw',
          height: MODAL_HEIGHT,
          maxHeight: '90vh',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {({ state }) => (
        <View style={{ flex: 1, minHeight: 0 }}>
          {loading || parsedTemplates === null ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLoading style={{ width: 20, height: 20 }} />
            </View>
          ) : hasUnsupportedDirective ? (
            <UnsupportedDirectivesNotice
              hasErrorTemplate={hasErrorTemplate}
              hasSpendTemplate={hasSpendTemplate}
              onClose={() => state.close()}
            />
          ) : (
            <BudgetAutomationsBody
              categoryId={categoryId}
              categoryName={currentCategory?.name ?? ''}
              needsMigration={needsMigration}
              initialEntries={initialEntries ?? []}
              schedules={schedules}
              categories={categories}
              month={effectiveMonth}
              onClose={() => state.close()}
            />
          )}
        </View>
      )}
    </Modal>
  );
}
