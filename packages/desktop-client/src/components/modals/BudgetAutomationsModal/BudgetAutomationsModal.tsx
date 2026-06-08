import { useState } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { View } from '@actual-app/components/view';
import { currentMonth } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';
import type { Template } from '@actual-app/core/types/models/templates';

import { useBudgetAutomationCategories } from '#components/budget/goals/useBudgetAutomationCategories';
import { Modal } from '#components/common/Modal';
import { useBudgetAutomations } from '#hooks/useBudgetAutomations';
import { useCategory } from '#hooks/useCategory';
import { useCategoryCleanup } from '#hooks/useCategoryCleanup';
import { useSchedules } from '#hooks/useSchedules';

import { BudgetAutomationsBody } from './BudgetAutomationsBody';
import { BudgetAutomationsBodyMobile } from './BudgetAutomationsBodyMobile';
import { migrateTemplatesToAutomations } from './migrateTemplatesToAutomations';
import { UnsupportedDirectivesNotice } from './UnsupportedDirectivesNotice';

const MODAL_WIDTH = 960;
const MODAL_HEIGHT = 760;

export function BudgetAutomationsModal({
  categoryId,
  month,
}: {
  categoryId: string;
  month?: string;
}) {
  const { isNarrowWidth } = useResponsive();
  const [parsedTemplates, setParsedTemplates] = useState<Template[] | null>(
    null,
  );
  const [parsedCleanup, setParsedCleanup] = useState<CleanupTemplate[] | null>(
    null,
  );
  const effectiveMonth = month ?? currentMonth();

  const onLoaded = (result: Record<string, Template[]>) => {
    setParsedTemplates(result[categoryId] ?? []);
  };

  const { data: currentCategory } = useCategory(categoryId);
  // default to 'ui' while the category is still resolving so we don't fire a
  // notes-mode migration on a category that may turn out to be ui-managed
  const needsMigration =
    currentCategory != null &&
    currentCategory.template_settings?.source !== 'ui';
  const source = needsMigration ? 'notes' : 'ui';

  const { loading: templatesLoading } = useBudgetAutomations({
    categoryId,
    source,
    onLoaded,
  });

  const { schedules } = useSchedules({ query: q('schedules').select('*') });

  const categories = useBudgetAutomationCategories();

  const { loading: cleanupLoading } = useCategoryCleanup({
    categoryId,
    source,
    onLoaded: setParsedCleanup,
  });
  const loading = templatesLoading || cleanupLoading;

  const hasErrorTemplate =
    parsedTemplates?.some(t => t.type === 'error') ?? false;
  const hasUnsupportedDirective = hasErrorTemplate;

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
        style: isNarrowWidth
          ? {
              width: '90vw',
              maxWidth: '90vw',
              height: '90dvh',
              maxHeight: '90dvh',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }
          : {
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
          {loading || parsedTemplates === null || parsedCleanup === null ? (
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
            <UnsupportedDirectivesNotice onClose={() => state.close()} />
          ) : isNarrowWidth ? (
            <BudgetAutomationsBodyMobile
              categoryId={categoryId}
              categoryName={currentCategory?.name ?? ''}
              needsMigration={needsMigration}
              initialEntries={initialEntries ?? []}
              initialCleanup={parsedCleanup}
              schedules={schedules}
              categories={categories}
              month={effectiveMonth}
              onClose={() => state.close()}
            />
          ) : (
            <BudgetAutomationsBody
              categoryId={categoryId}
              categoryName={currentCategory?.name ?? ''}
              needsMigration={needsMigration}
              initialEntries={initialEntries ?? []}
              initialCleanup={parsedCleanup}
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
