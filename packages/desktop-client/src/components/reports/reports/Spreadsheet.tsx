import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router';

import { SvgAdd } from '@actual-app/components/icons/v1';
import { SvgViewHide, SvgViewShow } from '@actual-app/components/icons/v1';
import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import {
  type SpreadsheetReportEntity,
  type SpreadsheetRowData,
} from 'loot-core/types/models/spreadsheet-reports';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { SheetRow, type SheetRowData } from './SheetRow';
import { Table, TableHeader, Field } from '@desktop-client/components/table';
import {
  Page,
  PageHeader,
  MobilePageHeader,
} from '@desktop-client/components/Page';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { useSheetCalculation } from '../spreadsheets/useSheetCalculation';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

import { useSpreadsheetReport } from '@desktop-client/hooks/useSpreadsheetReport';
import { defaultSpreadsheetReport } from '../ReportOptions';
import { setSessionReport } from '../setSessionReport';
import { SaveSpreadsheetReport } from '@desktop-client/components/reports/SaveSpreadsheetReport';

// Match SchedulesTable constants
const ROW_HEIGHT = 43;

export function Spreadsheet() {
  const params = useParams();
  const { data: report, isLoading } = useSpreadsheetReport(params.id ?? '');

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SpreadsheetInner key={report?.id} report={report} />;
}

type SpreadsheetInnerProps = {
  report?: SpreadsheetReportEntity;
};

function SpreadsheetInner({ report: initialReport }: SpreadsheetInnerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const enabled = useFeatureFlag('experimentalSheets');
  const location = useLocation();

  // Session storage management like CustomReport
  const prevUrl = sessionStorage.getItem('url') || '';
  sessionStorage.setItem('prevUrl', prevUrl);
  sessionStorage.setItem('url', location.pathname);

  if (['/reports'].includes(prevUrl)) sessionStorage.clear();

  const reportFromSessionStorage = sessionStorage.getItem('spreadsheet-report');
  const session = reportFromSessionStorage
    ? JSON.parse(reportFromSessionStorage)
    : {};

  // If we have a saved report (initialReport), prioritize it over session storage
  // Only use session storage for unsaved reports or when continuing work
  const baseReport = initialReport || defaultSpreadsheetReport;
  const loadReport = initialReport
    ? baseReport // Use saved report as-is, don't override with session
    : { ...baseReport, ...session }; // For new reports, apply session storage

  // State management like CustomReport
  const [rows, setRows] = useState(loadReport.rows || []);
  const [showFormulaColumn, setShowFormulaColumn] = useState(
    loadReport.showFormulaColumn ?? true,
  );
  const [report, setReport] = useState(loadReport);
  const [savedStatus, setSavedStatus] = useState(
    session.savedStatus ?? (initialReport ? 'saved' : 'new'),
  );

  // Store calculated values for cell references
  const [calculatedValues, setCalculatedValues] = useState<{
    [key: string]: number;
  }>({});

  // State for show/hide rows functionality
  const [showHiddenRows, setShowHiddenRows] = useState(false);
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(new Set());

  // Merge base rows with local hidden state
  const rowsWithHiddenState = useMemo(() => {
    return rows.map((row: SpreadsheetRowData) => ({
      ...row,
      hidden: hiddenRowIds.has(row.id),
    }));
  }, [rows, hiddenRowIds]);

  // Filter rows based on show/hide toggle
  const displayRows = useMemo(() => {
    if (showHiddenRows) {
      return rowsWithHiddenState; // Show all rows
    }
    return rowsWithHiddenState.filter(
      (row: SpreadsheetRowData & { hidden?: boolean }) => !row.hidden,
    ); // Hide rows marked as hidden
  }, [rowsWithHiddenState, showHiddenRows]);

  // Count hidden rows
  const hiddenRowCount = useMemo(() => {
    return rowsWithHiddenState.filter(
      (row: SpreadsheetRowData & { hidden?: boolean }) => row.hidden,
    ).length;
  }, [rowsWithHiddenState]);

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

  // Create cell grid for cross-references (row-1, row-2, etc.)
  const cellGrid = useMemo(() => {
    const grid: { [key: string]: number | string } = {};

    rows.forEach((row: SpreadsheetRowData, rowIndex: number) => {
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

  // Convert to the format expected by SheetRow
  const sheetRows: SheetRowData[] = useMemo(() => {
    return displayRows.map(
      (item: SpreadsheetRowData & { hidden?: boolean }) => ({
        id: item.id, // Keep original ID
        label: item.label || '',
        formula: item.formula || '',
        value: item.value || '',
        hidden: item.hidden,
        originalIndex: rows.findIndex(
          (row: SpreadsheetRowData) => row.id === item.id,
        ), // Track original position
      }),
    );
  }, [displayRows, rows]);

  // Helper function to mark report as modified
  const markAsModified = useCallback(() => {
    if (report.name) {
      setSessionReport('savedStatus', 'modified');
      setSavedStatus('modified');
    }
  }, [report.name]);

  // Report change handler like CustomReport
  const onReportChange = useCallback(
    (
      params:
        | {
            type: 'add-update';
            savedReport: SpreadsheetReportEntity;
          }
        | {
            type: 'rename';
            savedReport?: SpreadsheetReportEntity;
          }
        | {
            type: 'modify';
          }
        | {
            type: 'reload';
          }
        | {
            type: 'reset';
          }
        | {
            type: 'choose';
            savedReport?: SpreadsheetReportEntity;
          },
    ) => {
      switch (params.type) {
        case 'add-update':
          sessionStorage.clear();
          setSessionReport('savedStatus', 'saved');
          setSavedStatus('saved');
          setReport(params.savedReport);

          if (params.savedReport.id !== initialReport?.id) {
            navigate(`/reports/spreadsheet/${params.savedReport.id}`);
          }
          break;
        case 'rename':
          setReport({ ...report, name: params.savedReport?.name || '' });
          break;
        case 'modify':
          if (report.name) {
            setSessionReport('savedStatus', 'modified');
            setSavedStatus('modified');
          }
          break;
        case 'reload':
          sessionStorage.clear();
          setSessionReport('savedStatus', 'saved');
          setSavedStatus('saved');
          setReportData(initialReport ?? defaultSpreadsheetReport);
          break;
        case 'reset':
          sessionStorage.clear();
          setSavedStatus('new');
          setReport(defaultSpreadsheetReport);
          setReportData(defaultSpreadsheetReport);
          break;
        case 'choose':
          sessionStorage.clear();
          const newReport = params.savedReport || report;
          setSessionReport('savedStatus', 'saved');
          setSavedStatus('saved');
          setReport(newReport);
          setReportData(newReport);
          navigate(`/reports/spreadsheet/${newReport.id}`);
          break;
        default:
      }
    },
    [initialReport, report, navigate],
  );

  const setReportData = useCallback((input: SpreadsheetReportEntity) => {
    setRows(input.rows || []);
    setShowFormulaColumn(input.showFormulaColumn ?? true);
  }, []);

  const updateCell = useCallback(
    (rowIndex: number, field: 'label' | 'formula' | 'value', value: string) => {
      const newRows = [...rows];

      // Ensure the row exists
      while (newRows.length <= rowIndex) {
        newRows.push({
          id: `row-${newRows.length}`,
          label: '',
          formula: '',
          value: '',
        });
      }

      // Update the specific field
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        [field]: value,
      };

      // Clear formula when setting a constant value and vice versa
      if (field === 'value' && value.trim()) {
        newRows[rowIndex].formula = '';
      } else if (field === 'formula' && value.trim()) {
        newRows[rowIndex].value = '';
      }

      setRows(newRows);
      setSessionReport('rows', newRows);
      markAsModified();
    },
    [rows, markAsModified],
  );

  const addRow = useCallback(() => {
    const newRows = [...rows];
    newRows.push({
      id: `row-${newRows.length}`,
      label: '',
      formula: '',
      value: '',
    });
    setRows(newRows);
    setSessionReport('rows', newRows);
    markAsModified();
  }, [rows, markAsModified]);

  const deleteRow = useCallback(
    (rowIndex: number) => {
      const newRows = [...rows];
      newRows.splice(rowIndex, 1);
      // Regenerate IDs to maintain consistency
      newRows.forEach((item: SpreadsheetRowData, index: number) => {
        item.id = `row-${index}`;
      });
      setRows(newRows);
      setSessionReport('rows', newRows);
      markAsModified();
    },
    [rows, markAsModified],
  );

  const copyRow = useCallback(
    (rowIndex: number) => {
      const newRows = [...rows];
      const rowToCopy = newRows[rowIndex];
      newRows.splice(rowIndex + 1, 0, {
        ...rowToCopy,
        id: `row-${newRows.length}`,
      });
      // Regenerate IDs to maintain consistency
      newRows.forEach((item: SpreadsheetRowData, index: number) => {
        item.id = `row-${index}`;
      });
      setRows(newRows);
      setSessionReport('rows', newRows);
      markAsModified();
    },
    [rows, markAsModified],
  );

  const insertRowBelow = useCallback(
    (rowIndex: number) => {
      const newRows = [...rows];
      newRows.splice(rowIndex + 1, 0, {
        id: `row-${newRows.length}`,
        label: '',
        formula: '',
        value: '',
      });
      // Regenerate IDs to maintain consistency
      newRows.forEach((item: SpreadsheetRowData, index: number) => {
        item.id = `row-${index}`;
      });
      setRows(newRows);
      setSessionReport('rows', newRows);
      markAsModified();
    },
    [rows, markAsModified],
  );

  const onReorderRow = useCallback(
    ({ draggedRow, targetId, direction }: any) => {
      let newRows = [...rows];

      const draggedIndex = newRows.findIndex(
        (row: SpreadsheetRowData) => row.id === draggedRow.id,
      );
      const targetIndex = newRows.findIndex(
        (row: SpreadsheetRowData) => row.id === targetId,
      );

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const draggedRowData = newRows[draggedIndex];
        newRows.splice(draggedIndex, 1); // Remove from old position

        let insertIndex = targetIndex;
        if (direction === 'bottom' && draggedIndex < targetIndex) {
          insertIndex -= 1;
        } else if (direction === 'top' && draggedIndex > targetIndex) {
          insertIndex += 1;
        }

        if (direction === 'bottom') {
          insertIndex += 1;
        }

        newRows.splice(insertIndex, 0, draggedRowData); // Insert at new position

        // Regenerate IDs to maintain consistency
        newRows = newRows.map((item: SpreadsheetRowData, index: number) => ({
          ...item,
          id: `row-${index}`,
        }));

        setRows(newRows);
        setSessionReport('rows', newRows);
        markAsModified();
      }
    },
    [rows, markAsModified],
  );

  const onFormulaColumnToggle = () => {
    const newShowFormula = !showFormulaColumn;
    setShowFormulaColumn(newShowFormula);
    setSessionReport('showFormulaColumn', newShowFormula);
    markAsModified();
  };

  const onClearAll = () => {
    setRows([]);
    setSessionReport('rows', []);
    markAsModified();
  };

  const onBackClick = () => {
    sessionStorage.clear();
    navigate('/reports');
  };

  const title = report.name ?? t('Unsaved spreadsheet report');

  // Session storage items for saving
  const spreadsheetReportItems = useMemo(
    () => ({
      name: report.name,
      rows: JSON.stringify(rows),
      showFormulaColumn,
    }),
    [report.name, rows, showFormulaColumn],
  );

  if (!enabled) {
    return (
      <Page
        header={
          isNarrowWidth ? (
            <MobilePageHeader
              title={title}
              leftContent={<MobileBackButton onPress={onBackClick} />}
            />
          ) : (
            <PageHeader title={title} />
          )
        }
      >
        <View style={{ padding: 24 }}>
          {t(
            'The spreadsheet-style report is behind a feature flag. Enable it in Preferences → Labs.',
          )}
        </View>
      </Page>
    );
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={t('Spreadsheet Report: {{name}}', {
              name: report.name ?? t('Unsaved report'),
            })}
            leftContent={<MobileBackButton onPress={onBackClick} />}
          />
        ) : (
          <PageHeader
            title={
              <Trans>
                <Text>
                  <Trans>Spreadsheet Report:</Trans>
                </Text>{' '}
                <Text style={{ marginLeft: 5, color: theme.pageTextPositive }}>
                  {
                    {
                      name:
                        report.name?.length > 0
                          ? report.name
                          : t('Unsaved report'),
                    } as any
                  }
                </Text>
              </Trans>
            }
          />
        )
      }
      padding={0}
    >
      {/* Header with controls and SaveReport */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 15px 15px',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Button
            variant="bare"
            onPress={onClearAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 8px',
              backgroundColor: theme.buttonBareBackground,
              border: `1px solid ${theme.buttonMenuBorder}`,
              borderRadius: 4,
            }}
          >
            {t('Clear All')}
          </Button>

          <Button
            variant="bare"
            onPress={onFormulaColumnToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 8px',
              backgroundColor: theme.buttonBareBackground,
              border: `1px solid ${theme.buttonMenuBorder}`,
              borderRadius: 4,
            }}
            aria-label={
              showFormulaColumn
                ? t('Hide Formula Column')
                : t('Show Formula Column')
            }
          >
            {showFormulaColumn ? (
              <SvgViewHide width={14} height={14} />
            ) : (
              <SvgViewShow width={14} height={14} />
            )}
            {showFormulaColumn ? t('Hide Formulas') : t('Show Formulas')}
          </Button>

          {/* Show/Hide Rows button */}
          {rows.length > 0 && (
            <Button
              variant="bare"
              onPress={() => setShowHiddenRows(!showHiddenRows)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 8px',
                backgroundColor: theme.buttonBareBackground,
                border: `1px solid ${theme.buttonMenuBorder}`,
                borderRadius: 4,
              }}
              aria-label={
                showHiddenRows ? t('Hide hidden rows') : t('Show hidden rows')
              }
            >
              {showHiddenRows ? (
                <SvgViewHide width={14} height={14} />
              ) : (
                <SvgViewShow width={14} height={14} />
              )}
              {hiddenRowCount > 0
                ? showHiddenRows
                  ? t('Hide {{count}} rows', { count: hiddenRowCount })
                  : t('Show {{count}} hidden', { count: hiddenRowCount })
                : t('Hide rows')}
            </Button>
          )}

          <Button
            variant="primary"
            onPress={addRow}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <SvgAdd width={12} height={12} />
            {t('Add Row')}
          </Button>
        </View>

        {/* Save functionality */}
        <SaveSpreadsheetReport
          spreadsheetReportItems={spreadsheetReportItems}
          report={report}
          savedStatus={savedStatus}
          onReportChange={onReportChange}
        />
      </View>

      {/* Table - matching SchedulesTable structure */}
      <View
        style={{
          flex: 1,
          margin: '0 15px',
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <TableHeader height={ROW_HEIGHT} inset={0}>
          <Field
            width={60}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${theme.tableBorder}`,
            }}
          >
            <Trans>Row</Trans>
          </Field>
          <Field
            width="flex"
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              borderRight: `1px solid ${theme.tableBorder}`,
            }}
          >
            <Trans>Label</Trans>
          </Field>
          <Field
            width={150}
            style={{
              textAlign: 'right',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderRight: `1px solid ${theme.tableBorder}`,
            }}
          >
            <Trans>Value</Trans>
          </Field>
          {showFormulaColumn && (
            <Field
              width="flex"
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                borderRight: `1px solid ${theme.tableBorder}`,
              }}
            >
              <Trans>Formula</Trans>
            </Field>
          )}
          <Field
            width={150}
            style={{
              padding: '8px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trans>Actions</Trans>
          </Field>
        </TableHeader>

        <Table
          rowHeight={ROW_HEIGHT}
          backgroundColor="transparent"
          style={{
            flex: 1,
            backgroundColor: theme.tableBackground,
          }}
          items={sheetRows}
          renderItem={({
            item,
            index,
          }: {
            item: SheetRowData;
            index: number;
          }) => (
            <SheetRow
              key={item.id}
              rowIndex={item.originalIndex ?? index}
              data={item}
              onUpdateCell={updateCell}
              onDeleteRow={deleteRow}
              onCopyRow={copyRow}
              onInsertRowBelow={insertRowBelow}
              onReorderRow={onReorderRow}
              cellGrid={cellGrid}
              onUpdateCalculatedValue={updateCalculatedValue}
              onToggleVisibility={() => toggleRowVisibility(item.id)}
              isFirst={index === 0}
              isLast={index === sheetRows.length - 1}
              showFormulaColumn={showFormulaColumn}
            />
          )}
        />
      </View>

      {/* Blank footer region for spacing */}
      <View
        style={{
          height: 40,
          flexShrink: 0,
        }}
      />
    </Page>
  );
}
