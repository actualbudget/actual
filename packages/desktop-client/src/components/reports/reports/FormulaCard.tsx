import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';
import type { FormulaWidget } from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';

import { FormulaResult } from '#components/reports/FormulaResult';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { useFormulaExecution } from '#hooks/useFormulaExecution';
import { useThemeColors } from '#hooks/useThemeColors';

type FormulaCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: FormulaWidget['meta'];
  reportData?: JSONValue;
  onMetaChange: (newMeta: FormulaWidget['meta']) => void;
};

type FormulaReportData = {
  [key: string]: JSONValue;
  error: string | null;
  result: number | string | null;
};

function isFormulaReportData(
  value: JSONValue | undefined,
): value is FormulaReportData {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (
    (value.result === null ||
      typeof value.result === 'number' ||
      typeof value.result === 'string') &&
    (value.error === null || typeof value.error === 'string')
  );
}

export function FormulaCard({
  widgetId,
  isEditing,
  meta = {},
  reportData,
  onMetaChange,
}: FormulaCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);

  const fontSize = meta?.fontSize;
  const fontSizeMode = meta?.fontSizeMode || 'dynamic';
  const staticFontSize = meta?.staticFontSize || 32;
  const showTitle = meta?.showTitle ?? true;
  const colorFormula = meta?.colorFormula || '';

  const data = isFormulaReportData(reportData) ? reportData : null;
  const result = data?.result ?? null;
  const error = data?.error ?? null;
  const isLoading = data === null;

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
    meta?.queries || {},
    meta?.queriesVersion,
    colorVariables,
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
                  ...meta,
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
            loading={isLoading}
            initialFontSize={fontSize}
            fontSizeChanged={newSize => {
              onMetaChange({
                ...meta,
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
