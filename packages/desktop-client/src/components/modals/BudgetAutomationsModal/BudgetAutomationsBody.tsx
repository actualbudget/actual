import type { CSSProperties, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgInformationCircle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';
import { css } from '@emotion/css';

import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import { isCleanupConfigured } from '#components/budget/goals/cleanupModel';
import { CleanupAutomation } from '#components/budget/goals/editor/CleanupAutomation';
import { formatMonthLabel } from '#components/budget/goals/formatMonthLabel';
import { Link } from '#components/common/Link';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

import { AutomationEditorPane } from './AutomationEditorPane';
import { AutomationListRow } from './AutomationListRow';
import { BudgetAutomationMigrationWarning } from './BudgetAutomationMigrationWarning';
import { CleanupListRow } from './CleanupListRow';
import { ConflictBanner } from './ConflictBanner';
import { EmptyState } from './EmptyState';
import { useBudgetAutomationsEditor } from './useBudgetAutomationsEditor';

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
  const format = useFormat();
  const locale = useLocale();

  const {
    entries,
    cleanup,
    setCleanup,
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
    setEntries,
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
    contributionEntries,
    optionEntries,
    safeActiveIdx,
    cleanupActive,
  } = useBudgetAutomationsEditor({
    categoryId,
    initialEntries,
    initialCleanup,
    schedules,
    categories,
    month,
    onClose,
  });

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

      {conflicts.map((conflict, i) => (
        <ConflictBanner key={i} conflict={conflict} />
      ))}

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

        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {cleanupActive ? (
            <View
              style={{
                flex: 1,
                padding: 20,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarGutter: 'stable',
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
          isDisabled={hasErrors || conflicts.length > 0 || saving}
        >
          <Trans>Save</Trans>
        </Button>
      </View>
    </View>
  );
}
