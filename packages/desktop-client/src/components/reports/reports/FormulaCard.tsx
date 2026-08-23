import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  FormulaWidget,
} from '@actual-app/core/types/models';

import { FormulaResult } from '#components/reports/FormulaResult';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { useAccounts } from '#hooks/useAccounts';
import { useFormulaExecution } from '#hooks/useFormulaExecution';
import { useThemeColors } from '#hooks/useThemeColors';

type FormulaCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: FormulaWidget['meta'];
  onMetaChange: (newMeta: FormulaWidget['meta']) => void;
};

// Stable identities so a card without named queries, or one rendered before
// accounts have loaded, doesn't hand `useFormulaExecution` a fresh object on
// every render.
const EMPTY_QUERIES = {};
const EMPTY_ACCOUNTS: AccountEntity[] = [];

export function FormulaCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
}: FormulaCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  // Not `const { data: accounts = [] }` — a default inside a destructuring
  // pattern makes React Compiler bail out of the whole component, which leaves
  // the objects handed to `useFormulaExecution` unmemoized.
  const accounts = useAccounts().data ?? EMPTY_ACCOUNTS;

  const formula = meta?.formula || '=SUM(1, 2, 3)';
  const fontSize = meta?.fontSize;
  const fontSizeMode = meta?.fontSizeMode || 'dynamic';
  const staticFontSize = meta?.staticFontSize || 32;
  const showTitle = meta?.showTitle ?? true;
  const colorFormula = meta?.colorFormula || '';

  const simpleAccounts = useMemo(
    () =>
      accounts
        .filter(account => !account.tombstone)
        .map(account => ({ id: account.id, name: account.name })),
    [accounts],
  );

  const { result, isLoading, error } = useFormulaExecution(
    formula,
    meta?.queries ?? EMPTY_QUERIES,
    meta?.queriesVersion,
    undefined,
    simpleAccounts,
  );

  const colorVariables = useMemo(
    () => ({
      RESULT: result ?? 0,
      ...Object.entries(themeColors).reduce(
        (acc, [key, value]) => {
          acc[`theme_${key}`] = value;
          return acc;
        },
        {} as Record<string, string>,
      ),
    }),
    [result, themeColors],
  );
  const { result: colorResult, error: colorError } = useFormulaExecution(
    colorFormula,
    meta?.queries ?? EMPTY_QUERIES,
    meta?.queriesVersion,
    colorVariables,
    simpleAccounts,
  );

  // Determine the custom color from color formula result
  const customColor =
    colorFormula && !colorError && colorResult ? String(colorResult) : null;

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/formula/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {showTitle && (
          <View style={{ flexGrow: 0, flexShrink: 0, padding: 20 }}>
            <ReportCardName
              name={meta?.name || t('Formula')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...(meta ?? {}),
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
          </View>
        )}
        <View
          ref={containerRef}
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
          }}
        >
          <FormulaResult
            value={result}
            error={error}
            // Only fall back to the skeleton when there is nothing to show yet;
            // a refresh should leave the previous value in place rather than
            // blanking the card.
            loading={isLoading && result === null && !error}
            initialFontSize={fontSize}
            fontSizeChanged={newSize => {
              onMetaChange({
                ...(meta ?? {}),
                fontSize: newSize,
              });
            }}
            fontSizeMode={fontSizeMode}
            staticFontSize={staticFontSize}
            customColor={customColor}
            animate={isEditing ?? false}
            containerRef={containerRef}
          />
        </View>
      </View>
    </ReportCard>
  );
}
