import { useEffect, useMemo, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';
import debounce from 'lodash/debounce';

import {
  createAutomationEntry,
  getAutomationExamples,
} from '#components/budget/goals/automationExamples';
import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import {
  cleanupDefToEditor,
  editorToCleanupDef,
  emptyCleanupConfig,
  isCleanupConfigured,
} from '#components/budget/goals/cleanupModel';
import type { CleanupConfig } from '#components/budget/goals/cleanupModel';
import {
  validateAutomation,
  validatePercentageAllocation,
  validateSchedulePriorities,
} from '#components/budget/goals/validateAutomation';
import { useCleanupGroups } from '#hooks/useCleanupGroups';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { NON_CONTRIBUTION_TYPES } from './TypePicker';

export type ActiveSelection =
  | { kind: 'entry'; idx: number }
  | { kind: 'cleanup' };

function pickInitialSelection(
  entries: AutomationEntry[],
  cleanup: CleanupConfig,
): ActiveSelection {
  if (entries.length > 0) {
    const idx = entries.findIndex(
      e => !NON_CONTRIBUTION_TYPES.has(e.displayType),
    );
    return { kind: 'entry', idx: idx >= 0 ? idx : 0 };
  }
  if (isCleanupConfigured(cleanup)) return { kind: 'cleanup' };
  return { kind: 'entry', idx: 0 };
}

type UseBudgetAutomationsEditorArgs = {
  categoryId: string;
  initialEntries: AutomationEntry[];
  initialCleanup: CleanupTemplate[];
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  month: string;
  onClose: () => void;
};

export function useBudgetAutomationsEditor({
  categoryId,
  initialEntries,
  initialCleanup,
  schedules,
  categories,
  month,
  onClose,
}: UseBudgetAutomationsEditorArgs) {
  const dispatch = useDispatch();
  const { groups: cleanupGroups, createGroup: createCleanupGroup } =
    useCleanupGroups();

  const [entries, setEntries] = useState<AutomationEntry[]>(initialEntries);
  const initialCleanupConfig = cleanupDefToEditor(initialCleanup);
  const [cleanup, setCleanup] = useState<CleanupConfig>(initialCleanupConfig);
  const [active, setActive] = useState<ActiveSelection>(() =>
    pickInitialSelection(initialEntries, initialCleanupConfig),
  );
  const [saving, setSaving] = useState(false);
  const [dryRun, setDryRun] = useState<{
    budgeted: number;
    perTemplate: number[];
  } | null>(null);

  const onAddAutomation = (create?: () => AutomationEntry) => {
    const fallback = getAutomationExamples().find(
      e => e.displayType === 'fixed',
    );
    const entry = (create ?? fallback?.create)?.();
    if (!entry) return;
    setEntries(prev => {
      const next = [...prev, entry];
      setActive({ kind: 'entry', idx: next.length - 1 });
      return next;
    });
  };

  const onAddLimitAutomation = () => {
    const entry = createAutomationEntry(
      {
        directive: 'template',
        type: 'limit',
        amount: 500,
        period: 'monthly',
        hold: false,
        priority: null,
      },
      'limit',
    );
    setEntries(prev => {
      const next = [...prev, entry];
      setActive({ kind: 'entry', idx: next.length - 1 });
      return next;
    });
  };

  const onAddGoalAutomation = () => {
    const entry = createAutomationEntry(
      {
        directive: 'goal',
        type: 'goal',
        amount: 1000,
      },
      'goal',
    );
    setEntries(prev => {
      const next = [...prev, entry];
      setActive({ kind: 'entry', idx: next.length - 1 });
      return next;
    });
  };

  const onAddCleanup = () => {
    if (!isCleanupConfigured(cleanup)) setCleanup(emptyCleanupConfig());
    setActive({ kind: 'cleanup' });
  };

  const onDeleteCleanup = () => {
    setCleanup(emptyCleanupConfig());
    setActive({ kind: 'entry', idx: 0 });
  };

  const onDelete = (index: number) => {
    setEntries(prev => {
      const next = prev.filter((_, i) => i !== index);
      setActive(currentActive => {
        if (currentActive.kind !== 'entry') return currentActive;
        if (next.length === 0) return { kind: 'entry', idx: 0 };
        const idx = currentActive.idx;
        if (idx >= next.length) return { kind: 'entry', idx: next.length - 1 };
        if (idx > index) return { kind: 'entry', idx: idx - 1 };
        return currentActive;
      });
      return next;
    });
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const templatesToSave = entries.map(({ template }) => template);
      await send('budget/set-category-automations', {
        categoriesWithTemplates: [
          {
            id: categoryId,
            templates: templatesToSave,
            cleanup: editorToCleanupDef(cleanup),
          },
        ],
        source: 'ui',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const onUnmigrate = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-automations-unmigrate',
          options: {
            categoryId,
            templates: entries.map(({ template }) => template),
            cleanup: editorToCleanupDef(cleanup),
          },
        },
      }),
    );
  };

  // the react compiler wasn't memoising this properly and causing infinite
  // re-renders
  const templates = useMemo(() => entries.map(e => e.template), [entries]);

  const validPercentageSources = new Set<string>([
    'all income',
    'available funds',
  ]);
  for (const group of categories) {
    for (const cat of group.categories ?? []) {
      if (!cat.is_income) continue;
      validPercentageSources.add(cat.id);
      if (cat.name) validPercentageSources.add(cat.name.toLowerCase());
    }
  }

  const automationErrors = entries.map(entry =>
    validateAutomation(
      entry.template,
      entry.displayType,
      templates,
      schedules,
      new Date(),
      validPercentageSources,
    ),
  );

  useEffect(() => {
    if (templates.length === 0) {
      setDryRun({ budgeted: 0, perTemplate: [] });
      return;
    }
    let cancelled = false;
    const run = debounce(async () => {
      try {
        const result = await send('budget/dry-run-category-template', {
          month,
          categoryId,
          templates,
        });
        if (!cancelled) setDryRun(result);
      } catch {
        if (!cancelled) setDryRun(null);
      }
    }, 200);
    void run();
    return () => {
      cancelled = true;
      run.cancel();
    };
  }, [templates, month, categoryId]);

  const totalMonthly = dryRun?.budgeted ?? 0;
  const contributions: (number | null)[] = entries.map((_, i) =>
    dryRun?.perTemplate?.[i] != null ? dryRun.perTemplate[i] : null,
  );
  const hasErrors = automationErrors.some(error => error !== null);
  const conflicts = [
    validatePercentageAllocation(templates),
    validateSchedulePriorities(templates),
  ].filter(conflict => conflict !== null);

  const categoryNameMap: Record<string, string> = {};
  for (const group of categories) {
    for (const cat of group.categories ?? []) {
      categoryNameMap[cat.id] = cat.name;
    }
  }

  const hasLimitAutomation = entries.some(e => e.displayType === 'limit');
  const hasGoalAutomation = entries.some(e => e.displayType === 'goal');

  const isOption = (entry: AutomationEntry) =>
    entry.displayType === 'limit' || entry.displayType === 'goal';
  const indexedEntries = entries.map((entry, idx) => ({ entry, idx }));
  const contributionEntries = indexedEntries.filter(
    ({ entry }) => !isOption(entry),
  );
  const optionEntries = indexedEntries.filter(({ entry }) => isOption(entry));

  const safeActiveIdx =
    active.kind === 'entry'
      ? Math.min(active.idx, Math.max(0, entries.length - 1))
      : -1;
  const cleanupActive = active.kind === 'cleanup';

  return {
    entries,
    setEntries,
    cleanup,
    setCleanup,
    active,
    setActive,
    saving,
    onAddAutomation,
    onAddLimitAutomation,
    onAddGoalAutomation,
    onAddCleanup,
    onDeleteCleanup,
    onDelete,
    onSave,
    onUnmigrate,
    cleanupGroups,
    createCleanupGroup,
    automationErrors,
    totalMonthly,
    contributions,
    hasErrors,
    conflicts,
    categoryNameMap,
    hasLimitAutomation,
    hasGoalAutomation,
    indexedEntries,
    contributionEntries,
    optionEntries,
    safeActiveIdx,
    cleanupActive,
  };
}
