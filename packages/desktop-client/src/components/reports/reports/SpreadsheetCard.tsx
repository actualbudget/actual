import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgMinusOutline,
  SvgViewShow,
  SvgViewHide,
} from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { integerToCurrency } from 'loot-core/shared/util';
import { type SpreadsheetWidget } from 'loot-core/types/models';

import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { useSheetCalculation } from '@desktop-client/components/reports/spreadsheets/useSheetCalculation';
import { Row, Cell } from '@desktop-client/components/table';
import { useSpreadsheetReport } from '@desktop-client/hooks/useSpreadsheetReport';

// Type for spreadsheet row data
type SpreadsheetRowData = {
  id: string;
  label: string;
  formula: string;
  value?: string | number;
  hidden?: boolean;
};

type SpreadsheetCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SpreadsheetWidget['meta'];
  onMetaChange: (newMeta: SpreadsheetWidget['meta']) => void;
  onRemove: () => void;
};

export function SpreadsheetCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
}: SpreadsheetCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [showHiddenRows, setShowHiddenRows] = useState(false);

  // Store calculated values for cell references (like the full Spreadsheet component)
  const [calculatedValues, setCalculatedValues] = useState<{
    [key: string]: number;
  }>({});

  // Local state for row visibility (in a real implementation, this would be persisted)
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(new Set());

  // Use the actual spreadsheet report ID from meta, fallback to widgetId for new/unsaved widgets
  const reportId = meta?.id || widgetId;

  // Fetch the actual spreadsheet data from the database
  const { data: spreadsheetData, isLoading: isLoadingSpreadsheet } =
    useSpreadsheetReport(reportId);

  // Merge base rows with local hidden state
  const rows = useMemo(() => {
    const baseRows = spreadsheetData?.rows || meta?.rows || [];
    return baseRows.map(row => ({
      ...row,
      hidden: hiddenRowIds.has(row.id),
    }));
  }, [spreadsheetData?.rows, meta?.rows, hiddenRowIds]);

  // Create cell grid for cross-references (fixed to use calculated values)
  const cellGrid = useMemo(() => {
    const grid: { [key: string]: number | string } = {};
    rows.forEach((row, rowIndex) => {
      const cellRef = `row-${rowIndex + 1}`;

      if (row.formula && row.formula.trim()) {
        // Use calculated value if available, otherwise default to 0
        grid[cellRef] = calculatedValues[cellRef] || 0;
      } else if (row.value && !isNaN(Number(row.value))) {
        // Use the constant value if it's a number
        grid[cellRef] = Number(row.value);
      } else if (row.label && !isNaN(Number(row.label))) {
        // If label is a number, use it as the cell value (for backward compatibility)
        grid[cellRef] = Number(row.label);
      } else {
        // Default to 0
        grid[cellRef] = 0;
      }
    });
    return grid;
  }, [rows, calculatedValues]);

  // Function to update calculated values
  const updateCalculatedValue = useCallback(
    (cellRef: string, value: number) => {
      setCalculatedValues(prev => ({
        ...prev,
        [cellRef]: value,
      }));
    },
    [],
  );

  // Function to toggle individual row visibility
  const toggleRowVisibility = useCallback((rowId: string) => {
    setHiddenRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Filter rows based on show/hide toggle
  const displayRows = useMemo(() => {
    if (showHiddenRows) {
      return rows; // Show all rows
    }
    return rows.filter(row => !row.hidden); // Hide rows marked as hidden
  }, [rows, showHiddenRows]);

  // Count hidden rows
  const hiddenRowCount = useMemo(() => {
    return rows.filter(row => row.hidden).length;
  }, [rows]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const hasFormulas = rows.some(row => row.formula);
    const formulaCount = rows.filter(row => row.formula).length;
    const staticValueCount = rows.filter(
      row => row.value && !row.formula,
    ).length;
    const totalValueCount = staticValueCount + formulaCount;

    // For now, estimate total from static values only
    const staticTotal = rows
      .filter(row => row.value && !row.formula)
      .reduce((sum, row) => {
        const value = Number(row.value);
        return isNaN(value) ? sum : sum + value;
      }, 0);

    return {
      total: staticTotal,
      rowCount: rows.length,
      formulaCount,
      valueCount: totalValueCount,
      staticValueCount,
      hasData: rows.length > 0,
      hasFormulas,
      hasValues: totalValueCount > 0,
    };
  }, [rows]);

  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/spreadsheet/${reportId}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={onCardHover}
        onPointerLeave={onCardHoverEnd}
      >
        {/* Header Section */}
        <View style={{ padding: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <ReportCardName
                name={
                  spreadsheetData?.name || meta?.name || t('Spreadsheet Report')
                }
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
              {!summary.hasData && (
                <Text
                  style={{
                    color: theme.pageTextSubdued,
                    marginTop: 4,
                    fontSize: 13,
                  }}
                >
                  {t('Interactive spreadsheet with formulas and calculations')}
                </Text>
              )}
            </View>

            {/* Show/Hide toggle button - always visible when there are rows */}
            {summary.hasData && (
              <Button
                variant="bare"
                onPress={() => setShowHiddenRows(!showHiddenRows)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: `1px solid ${theme.pillBorderDark}`,
                  backgroundColor: showHiddenRows
                    ? theme.pillBackgroundSelected
                    : theme.pillBackground,
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  {showHiddenRows ? (
                    <SvgViewHide style={{ width: 12, height: 12 }} />
                  ) : (
                    <SvgViewShow style={{ width: 12, height: 12 }} />
                  )}
                  <Text
                    style={{
                      fontSize: 11,
                      color: showHiddenRows
                        ? theme.pillTextSelected
                        : theme.pillText,
                      fontWeight: 500,
                    }}
                  >
                    {hiddenRowCount > 0
                      ? showHiddenRows
                        ? t('Hide {{count}} rows', { count: hiddenRowCount })
                        : t('Show {{count}} hidden', { count: hiddenRowCount })
                      : t('Hide rows')}
                  </Text>
                </View>
              </Button>
            )}
          </View>
        </View>

        {/* Table Section */}
        <View style={{ flex: 1, marginHorizontal: 20, marginBottom: 16 }}>
          {isLoadingSpreadsheet ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 32,
              }}
            >
              <LoadingIndicator />
            </View>
          ) : summary.hasData ? (
            <View
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 6,
                border: `1px solid ${theme.tableBorder}`,
                overflow: 'hidden',
              }}
            >
              {/* Table Header - using tableGraph pattern */}
              <Row
                collapsed={true}
                style={{
                  borderBottomWidth: 1,
                  borderColor: theme.tableBorder,
                  color: theme.tableHeaderText,
                  backgroundColor: theme.tableHeaderBackground,
                  fontWeight: 600,
                }}
              >
                <Cell
                  value={t('#')}
                  style={{
                    width: 40,
                    textAlign: 'center',
                    justifyContent: 'center',
                  }}
                />
                <Cell
                  value={t('Description')}
                  style={{
                    width: 140,
                    flexShrink: 0,
                    flexGrow: 1,
                  }}
                />
                <Cell
                  value={t('Amount')}
                  style={{
                    minWidth: 100,
                    textAlign: 'right',
                    justifyContent: 'flex-end',
                  }}
                  width="flex"
                />
                <Cell
                  value=""
                  style={{
                    width: 30,
                    textAlign: 'center',
                    justifyContent: 'center',
                  }}
                />
              </Row>

              {/* Table Rows */}
              <View style={{ flex: 1, minHeight: 0 }}>
                {displayRows.map((row, index) => (
                  <SpreadsheetTableRow
                    key={row.id || index}
                    row={row}
                    rowNumber={rows.indexOf(row) + 1} // Use original row number
                    cellGrid={cellGrid}
                    onUpdateCalculatedValue={updateCalculatedValue}
                    onToggleVisibility={() => toggleRowVisibility(row.id)}
                    isCardHovered={isCardHovered}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 32,
                backgroundColor: theme.tableBackground,
                borderRadius: 6,
                border: `1px solid ${theme.tableBorder}`,
                gap: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: theme.pageTextSubdued,
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                {t('No data yet')}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {['SUM', 'BALANCE', 'COST'].map(formula => (
                  <View
                    key={formula}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: theme.pillBackground,
                      borderRadius: 6,
                      border: `1px solid ${theme.pillBorderDark}`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.pageText,
                        fontFamily: 'var(--fl-code-font, monospace)',
                        fontWeight: 500,
                      }}
                    >
                      {formula}()
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                style={{
                  fontSize: 13,
                  color: theme.pageTextSubdued,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {t('Click to add formulas and calculations')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ReportCard>
  );
}

// Row component using tableGraph pattern
function SpreadsheetTableRow({
  row,
  rowNumber,
  cellGrid,
  onUpdateCalculatedValue,
  onToggleVisibility,
  isCardHovered,
}: {
  row: SpreadsheetRowData;
  rowNumber: number;
  cellGrid: { [key: string]: number | string };
  onUpdateCalculatedValue?: (cellRef: string, value: number) => void;
  onToggleVisibility?: () => void;
  isCardHovered: boolean;
}) {
  const { t } = useTranslation();
  const [isRowHovered, setIsRowHovered] = useState(false);

  // For formulas, use the calculation hook
  const calculatedValue = useSheetCalculation(row.formula || '', cellGrid);

  // Update the calculated value in the parent component for cell references
  useEffect(() => {
    if (
      row.formula &&
      typeof calculatedValue === 'number' &&
      onUpdateCalculatedValue
    ) {
      const cellRef = `row-${rowNumber}`;
      onUpdateCalculatedValue(cellRef, calculatedValue);
    }
  }, [calculatedValue, row.formula, rowNumber, onUpdateCalculatedValue]);

  let displayValue;
  if (row.formula) {
    displayValue = calculatedValue;
  } else if (
    row.value !== undefined &&
    row.value !== null &&
    row.value !== ''
  ) {
    const numValue = Number(row.value);
    displayValue = isNaN(numValue) ? String(row.value) : numValue;
  } else {
    displayValue = '—';
  }

  const isNumeric = typeof displayValue === 'number' && !isNaN(displayValue);
  const isLoading = displayValue === '...';

  return (
    <Row
      collapsed={true}
      style={{
        color: theme.tableText,
        backgroundColor: row.hidden
          ? theme.tableRowBackgroundHover
          : theme.tableBackground,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        opacity: row.hidden ? 0.6 : 1,
      }}
      onPointerEnter={() => setIsRowHovered(true)}
      onPointerLeave={() => setIsRowHovered(false)}
    >
      <Cell
        value={String(rowNumber)}
        style={{
          width: 40,
          textAlign: 'center',
          justifyContent: 'center',
          color: theme.pageTextSubdued,
          fontSize: 12,
          fontWeight: 500,
        }}
      />

      <Cell
        value={row.label || t('Row {{index}}', { index: rowNumber })}
        title={row.label || t('Row {{index}}', { index: rowNumber })}
        style={{
          width: 140,
          flexShrink: 0,
          flexGrow: 1,
        }}
        unexposedContent={({ value }) => (
          <View>
            <Text style={{ fontWeight: 500 }}>{value}</Text>
            {row.hidden && (
              <Text
                style={{
                  fontSize: 10,
                  color: theme.pageTextSubdued,
                  fontStyle: 'italic',
                }}
              >
                {t('(Hidden)')}
              </Text>
            )}
          </View>
        )}
      />

      <Cell
        value={
          isLoading
            ? '...'
            : isNumeric
              ? integerToCurrency(Math.round(Number(displayValue) * 100))
              : displayValue && displayValue !== '—'
                ? String(displayValue)
                : '—'
        }
        title={
          isNumeric && Math.abs(Number(displayValue)) > 100000
            ? integerToCurrency(Math.round(Number(displayValue) * 100))
            : undefined
        }
        style={{
          minWidth: 100,
          textAlign: 'right',
          justifyContent: 'flex-end',
          fontFamily: isNumeric ? 'var(--fl-code-font, monospace)' : 'inherit',
          fontWeight: isNumeric ? 600 : 'inherit',
        }}
        width="flex"
        privacyFilter={isNumeric}
      />

      {/* Hide button */}
      <Cell
        value=""
        style={{
          width: 30,
          textAlign: 'center',
          justifyContent: 'center',
        }}
        unexposedContent={() => (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {(isRowHovered || isCardHovered) && (
              <Button
                variant="bare"
                onPress={onToggleVisibility}
                style={{
                  padding: 2,
                  borderRadius: 2,
                  opacity: row.hidden || isRowHovered ? 1 : 0.6,
                  backgroundColor: isRowHovered
                    ? theme.tableRowBackgroundHover
                    : 'transparent',
                }}
              >
                {row.hidden ? (
                  <SvgViewShow style={{ width: 10, height: 10 }} />
                ) : (
                  <SvgMinusOutline style={{ width: 10, height: 10 }} />
                )}
              </Button>
            )}
          </View>
        )}
      />
    </Row>
  );
}
