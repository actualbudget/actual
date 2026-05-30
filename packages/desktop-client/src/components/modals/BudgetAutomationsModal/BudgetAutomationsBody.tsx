import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgInformationCircle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { css } from '@emotion/css';
import debounce from 'lodash/debounce';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';

import {
  createAutomationEntry,
  getAutomationExamples,
} from '#components/budget/goals/automationExamples';
import {
  cleanupDefToEditor,
  editorToCleanupDef,
  emptyCleanupConfig,
  isCleanupConfigured,
} from '#components/budget/goals/cleanupModel';
import { CleanupAutomation } from '#components/budget/goals/editor/CleanupAutomation';
import { formatMonthLabel } from '#components/budget/goals/formatMonthLabel';
import {
  validateAutomation,
  validatePercentageAllocation,
} from '#components/budget/goals/validateAutomation';
import { Link } from '#components/common/Link';
import { useCleanupGroups } from '#hooks/useCleanupGroups';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import type { CleanupConfig } from '#components/budget/goals/cleanupModel';

import { AutomationEditorPane } from './AutomationEditorPane';
import { AutomationListRow } from './AutomationListRow';
import { BudgetAutomationMigrationWarning } from './BudgetAutomationMigrationWarning';
import { CleanupListRow } from './CleanupListRow';
import { ConflictBanner } from './ConflictBanner';
import { EmptyState } from './EmptyState';
import { NON_CONTRIBUTION_TYPES } from './TypePicker';

const RULE_LIST_WIDTH = 310;

const ALWAYS_SCROLL_CLASS = css({
  scrollbarGutter: 'stable',
  '&::-webkit-scrollbar': {
    width: 11,
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    width: 7,
    minHeight: 24,
    borderRadius: 30,
    backgroundClip: 'padding-box',
    border: '2px solid rgba(0, 0, 0, 0)',
    backgroundColor: theme.tableBorder,
  },
});

function SidebarSectionHeader({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <View
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        fontSize: 11,
        textTransform: 'uppercase',
        color: theme.pageTextLight,
        fontWeight: 600,
        letterSpacing: '0.05em',
        ...style,
      }}
    >
      <Text>{children}</Text>
    </View>
  );
}

function SidebarAddButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="bare"
      onPress={onPress}
      style={{
        flexShrink: 0,
        width: '100%',
        padding: 10,
        border: `1px dashed ${theme.tableBorder}`,
        borderRadius: 6,
        color: theme.pageTextPositive,
        fontWeight: 600,
        fontSize: 12,
        justifyContent: 'center',
      }}
    >
      {children}
    </Button>
  );
}

type BudgetAutomationsBodyProps = {
  categoryId: string;
  categoryName: string;
  needsMigration: boolean;
  initialEntries: AutomationEntry[];
  initialCleanup: CleanupTemplate[];
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  month: string;
  onClose: () => void;
};

type ActiveSelection = { kind: 'entry'; idx: number } | { kind: 'cleanup' };

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

export function BudgetAutomationsBody({
  categoryId,
  categoryName,
  needsMigration,
  initialEntries,
  initialCleanup,
  schedules,
  categories,
  month,
  onClose,
}: BudgetAutomationsBodyProps) {
  const dispatch = useDispatch();
  const format = useFormat();
  const locale = useLocale();
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
  const conflict = validatePercentageAllocation(templates);

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
  const setActiveIdx = (idx: number) => setActive({ kind: 'entry', idx });

  return (
    <View style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
      <View
        style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${theme.tableBorder}`,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ minWidth: 0 }}>
          <Text style={{ fontSize: 12, color: theme.pageTextLight }}>
            <Trans>Budget automation</Trans>
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: theme.pageText,
              marginTop: 2,
            }}
          >
            {categoryName}
          </Text>
        </View>
        <View style={{ textAlign: 'right', flexShrink: 0, minWidth: 220 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                color: theme.pageTextLight,
                letterSpacing: '0.04em',
              }}
            >
              <Trans>
                Projected for {{ month: formatMonthLabel(month, locale) }}
              </Trans>
            </Text>
            <Tooltip
              content={
                <View style={{ maxWidth: 260 }}>
                  <Trans>
                    The projection shows the most that these automations could
                    budget on their own. The actual amount may be smaller when
                    To Budget is empty or when higher-priority categories run
                    first.
                  </Trans>
                </View>
              }
              placement="bottom end"
            >
              <SvgInformationCircle
                width={12}
                height={12}
                style={{ color: theme.pageTextLight, cursor: 'help' }}
              />
            </Tooltip>
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: theme.pageTextPositive,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
              display: 'block',
            }}
          >
            {format(totalMonthly, 'financial')}
          </Text>
        </View>
      </View>

      {needsMigration && (
        <BudgetAutomationMigrationWarning
          categoryId={categoryId}
          style={{ flexShrink: 0, margin: '12px 24px 0' }}
        />
      )}

      {conflict && <ConflictBanner conflict={conflict} />}

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          minHeight: 0,
        }}
      >
        <View
          className={ALWAYS_SCROLL_CLASS}
          style={{
            width: RULE_LIST_WIDTH,
            borderRight: `1px solid ${theme.tableBorder}`,
            padding: 10,
            overflowY: 'scroll',
            gap: 4,
          }}
        >
          <SidebarSectionHeader>
            <Trans>Automations</Trans>
          </SidebarSectionHeader>
          {contributionEntries.map(({ entry, idx }) => (
            <AutomationListRow
              key={entry.id}
              index={idx}
              entry={entry}
              isActive={idx === safeActiveIdx}
              error={automationErrors[idx]}
              contribution={contributions[idx]}
              categoryNameMap={categoryNameMap}
              onSelect={setActiveIdx}
            />
          ))}
          <SidebarAddButton onPress={() => onAddAutomation()}>
            + <Trans>Add an automation</Trans>
          </SidebarAddButton>

          <SidebarSectionHeader style={{ marginTop: 16 }}>
            <Trans>Options</Trans>
          </SidebarSectionHeader>
          {optionEntries.map(({ entry, idx }) => (
            <AutomationListRow
              key={entry.id}
              index={idx}
              entry={entry}
              isActive={idx === safeActiveIdx}
              error={automationErrors[idx]}
              contribution={contributions[idx]}
              categoryNameMap={categoryNameMap}
              onSelect={setActiveIdx}
            />
          ))}
          {!hasLimitAutomation && (
            <SidebarAddButton onPress={onAddLimitAutomation}>
              + <Trans>Add balance cap</Trans>
            </SidebarAddButton>
          )}
          {!hasGoalAutomation && (
            <SidebarAddButton onPress={onAddGoalAutomation}>
              + <Trans>Add long-term goal</Trans>
            </SidebarAddButton>
          )}
          {isCleanupConfigured(cleanup) ? (
            <CleanupListRow
              config={cleanup}
              groups={cleanupGroups}
              isActive={cleanupActive}
              onSelect={() => setActive({ kind: 'cleanup' })}
            />
          ) : (
            <SidebarAddButton onPress={onAddCleanup}>
              + <Trans>Add end of month cleanup</Trans>
            </SidebarAddButton>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          {cleanupActive ? (
            <View
              style={{
                flex: 1,
                padding: 20,
                overflowY: 'auto',
                gap: 14,
              }}
            >
              <CleanupAutomation
                config={cleanup}
                groups={cleanupGroups}
                onChange={setCleanup}
                onCreateGroup={createCleanupGroup}
              />
              <View
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
              >
                <View style={{ flex: 1 }} />
                <Button
                  variant="bare"
                  onPress={onDeleteCleanup}
                  style={{ color: theme.errorText }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <SvgDelete
                      width={10}
                      height={10}
                      style={{ color: 'inherit' }}
                    />
                    <Trans>Remove cleanup</Trans>
                  </span>
                </Button>
              </View>
            </View>
          ) : entries.length === 0 ? (
            <EmptyState onAdd={onAddAutomation} />
          ) : (
            <AutomationEditorPane
              entries={entries}
              activeIdx={safeActiveIdx}
              automationErrors={automationErrors}
              schedules={schedules}
              categories={categories}
              hasLimitAutomation={hasLimitAutomation}
              onAddLimitAutomation={onAddLimitAutomation}
              setEntries={setEntries}
              onDelete={onDelete}
            />
          )}
        </View>
      </View>

      <View
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${theme.tableBorder}`,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          backgroundColor: theme.tableBackground,
          flexShrink: 0,
        }}
      >
        {!needsMigration && (
          <Link variant="text" onClick={onUnmigrate}>
            <Trans>Un-migrate to text notes</Trans>
          </Link>
        )}
        <View style={{ flex: 1 }} />
        <Button onPress={onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          variant="primary"
          onPress={onSave}
          isDisabled={hasErrors || conflict !== null || saving}
        >
          <Trans>Save</Trans>
        </Button>
      </View>
    </View>
  );
}
