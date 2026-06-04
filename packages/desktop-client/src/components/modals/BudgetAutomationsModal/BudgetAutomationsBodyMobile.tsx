import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';

import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import { isCleanupConfigured } from '#components/budget/goals/cleanupModel';
import { getDisplayTemplateMeta } from '#components/budget/goals/displayTemplateMeta';
import { CleanupAutomation } from '#components/budget/goals/editor/CleanupAutomation';
import { formatMonthLabel } from '#components/budget/goals/formatMonthLabel';
import { Link } from '#components/common/Link';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

import { AutomationEditorPane } from './AutomationEditorPane';
import { AutomationListRow } from './AutomationListRow';
import { BudgetAutomationMigrationWarning } from './BudgetAutomationMigrationWarning';
import { CleanupListRow } from './CleanupListRow';
import { ConflictBanner } from './ConflictBanner';
import { useBudgetAutomationsEditor } from './useBudgetAutomationsEditor';
import type { ActiveSelection } from './useBudgetAutomationsEditor';

function SectionHeader({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Text
      style={{
        flexShrink: 0,
        padding: '6px 4px',
        fontSize: 11,
        textTransform: 'uppercase',
        color: theme.pageTextLight,
        fontWeight: 600,
        letterSpacing: '0.05em',
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

function AddButton({
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
        height: styles.mobileMinHeight,
        border: `1px dashed ${theme.tableBorder}`,
        borderRadius: 6,
        color: theme.pageTextPositive,
        fontWeight: 600,
        justifyContent: 'center',
      }}
    >
      {children}
    </Button>
  );
}

type BudgetAutomationsBodyMobileProps = {
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

export function BudgetAutomationsBodyMobile({
  categoryId,
  categoryName,
  needsMigration,
  initialEntries,
  initialCleanup,
  schedules,
  categories,
  month,
  onClose,
}: BudgetAutomationsBodyMobileProps) {
  const { t } = useTranslation();
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
    conflict,
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

  const [screen, setScreen] = useState<'list' | 'editor'>('list');
  const backToList = () => setScreen('list');
  const goToEditor = (selection: ActiveSelection) => {
    setActive(selection);
    setScreen('editor');
  };

  const editing = screen === 'editor' && (cleanupActive || safeActiveIdx >= 0);

  const select = (idx: number) => goToEditor({ kind: 'entry', idx });
  const addAutomation = () => {
    onAddAutomation();
    setScreen('editor');
  };
  const addLimit = () => {
    onAddLimitAutomation();
    setScreen('editor');
  };
  const addGoal = () => {
    onAddGoalAutomation();
    setScreen('editor');
  };
  const addCleanup = () => {
    onAddCleanup();
    setScreen('editor');
  };
  const selectCleanup = () => goToEditor({ kind: 'cleanup' });
  const deleteEntry = (idx: number) => {
    onDelete(idx);
    backToList();
  };
  const deleteCleanup = () => {
    onDeleteCleanup();
    backToList();
  };

  const saveButton = (
    <Button
      variant="primary"
      onPress={onSave}
      isDisabled={hasErrors || conflict !== null || saving}
    >
      <Trans>Save</Trans>
    </Button>
  );

  if (editing) {
    const activeEntry = entries[safeActiveIdx];
    const title = cleanupActive
      ? t('End of month cleanup')
      : activeEntry
        ? getDisplayTemplateMeta(activeEntry.displayType).label
        : '';

    return (
      <View style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
        <View
          style={{
            flexShrink: 0,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.tableBorder}`,
          }}
        >
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
            <MobileBackButton onPress={backToList} />
          </View>
          <Text
            style={{
              flexShrink: 0,
              fontWeight: 600,
              color: theme.pageText,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }} />
        </View>

        {cleanupActive ? (
          <View
            style={{
              flex: 1,
              padding: 16,
              overflowY: 'auto',
              overflowX: 'hidden',
              gap: 14,
            }}
          >
            <CleanupAutomation
              config={cleanup}
              groups={cleanupGroups}
              onChange={setCleanup}
              onCreateGroup={createCleanupGroup}
            />
            <Button
              variant="bare"
              onPress={deleteCleanup}
              style={{ color: theme.errorText, alignSelf: 'flex-start' }}
            >
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
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
            onDelete={deleteEntry}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
      <View
        style={{
          flexShrink: 0,
          padding: '16px 16px 12px',
          borderBottom: `1px solid ${theme.tableBorder}`,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ minWidth: 0 }}>
          <Text style={{ fontSize: 11, color: theme.pageTextLight }}>
            <Trans>Budget automation</Trans>
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: theme.pageText,
              marginTop: 2,
            }}
          >
            {categoryName}
          </Text>
        </View>
        <View style={{ textAlign: 'right', flexShrink: 0 }}>
          <Text
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              color: theme.pageTextLight,
              letterSpacing: '0.04em',
              display: 'block',
            }}
          >
            <Trans>
              Projected for {{ month: formatMonthLabel(month, locale) }}
            </Trans>
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: theme.pageTextPositive,
              fontVariantNumeric: 'tabular-nums',
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
          style={{ flexShrink: 0, margin: '12px 16px 0' }}
        />
      )}

      {conflict && <ConflictBanner conflict={conflict} />}

      <View
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 12,
          gap: 6,
        }}
      >
        <SectionHeader>
          <Trans>Automations</Trans>
        </SectionHeader>
        {contributionEntries.map(({ entry, idx }) => (
          <AutomationListRow
            key={entry.id}
            index={idx}
            entry={entry}
            isActive={false}
            error={automationErrors[idx]}
            contribution={contributions[idx]}
            categoryNameMap={categoryNameMap}
            onSelect={select}
          />
        ))}
        <AddButton onPress={addAutomation}>
          + <Trans>Add an automation</Trans>
        </AddButton>

        <SectionHeader style={{ marginTop: 12 }}>
          <Trans>Options</Trans>
        </SectionHeader>
        {optionEntries.map(({ entry, idx }) => (
          <AutomationListRow
            key={entry.id}
            index={idx}
            entry={entry}
            isActive={false}
            error={automationErrors[idx]}
            contribution={contributions[idx]}
            categoryNameMap={categoryNameMap}
            onSelect={select}
          />
        ))}
        {!hasLimitAutomation && (
          <AddButton onPress={addLimit}>
            + <Trans>Add balance cap</Trans>
          </AddButton>
        )}
        {!hasGoalAutomation && (
          <AddButton onPress={addGoal}>
            + <Trans>Add long-term goal</Trans>
          </AddButton>
        )}
        {isCleanupConfigured(cleanup) ? (
          <CleanupListRow
            config={cleanup}
            groups={cleanupGroups}
            isActive={false}
            onSelect={selectCleanup}
          />
        ) : (
          <AddButton onPress={addCleanup}>
            + <Trans>Add end of month cleanup</Trans>
          </AddButton>
        )}
      </View>

      <View
        style={{
          flexShrink: 0,
          padding: 12,
          borderTop: `1px solid ${theme.tableBorder}`,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          backgroundColor: theme.tableBackground,
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
        {saveButton}
      </View>
    </View>
  );
}
