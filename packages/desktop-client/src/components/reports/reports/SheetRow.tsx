import React, { useState, useRef, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import {
  SvgAdd,
  SvgArrowDown,
  SvgCopy,
  SvgViewShow,
  SvgViewHide,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { QueryBuilder } from '@desktop-client/components/reports/spreadsheets/QueryBuilder';
import { useSheetCalculation } from '@desktop-client/components/reports/spreadsheets/useSheetCalculation';
import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type OnDropCallback,
} from '@desktop-client/components/sort';
import { Row, Field } from '@desktop-client/components/table';
import { useDragRef } from '@desktop-client/hooks/useDragRef';

// Match SchedulesTable constants
export const ROW_HEIGHT = 43;

// Simple formula truncation helper
const truncateFormula = (formula: string, maxLength: number = 50): string => {
  if (formula.length <= maxLength) return formula;
  return formula.slice(0, maxLength) + '...';
};

export type SheetRowData = {
  id: string;
  label: string;
  formula: string;
  value?: string | number; // Add support for constant values
  hidden?: boolean; // Add support for hiding rows
  originalIndex?: number; // Track original position for formula references
};

type CellGrid = {
  [key: string]: number | string;
};

type SheetRowProps = {
  rowIndex: number;
  data: SheetRowData;
  onUpdateCell: (
    rowIndex: number,
    field: 'label' | 'formula' | 'value',
    value: string,
  ) => void;
  onDeleteRow: (rowIndex: number) => void;
  onCopyRow?: (rowIndex: number) => void;
  onInsertRowBelow?: (rowIndex: number) => void;
  onReorderRow: OnDropCallback;
  cellGrid?: CellGrid;
  onUpdateCalculatedValue?: (cellRef: string, value: number) => void;
  onToggleVisibility?: () => void;
  showFormulaColumn?: boolean;
};

export const SheetRow = memo<SheetRowProps>(
  ({
    rowIndex,
    data,
    onUpdateCell,
    onDeleteRow,
    onCopyRow,
    onInsertRowBelow,
    onReorderRow,
    cellGrid,
    onUpdateCalculatedValue,
    onToggleVisibility,
    showFormulaColumn = true,
  }) => {
    const { t } = useTranslation();
    const [showQueryBuilder, setShowQueryBuilder] = useState(false);
    const [editingLabel, setEditingLabel] = useState(false);
    const [editingValue, setEditingValue] = useState(false);
    const [tempLabel, setTempLabel] = useState(data.label || '');
    const [tempValue, setTempValue] = useState(String(data.value || ''));

    const labelInputRef = useRef<HTMLInputElement>(null);
    const valueInputRef = useRef<HTMLInputElement>(null);

    // Calculate the value using the formula, or use the constant value
    const calculatedValue = useSheetCalculation(data.formula || '', cellGrid);

    // Debug logging for formula changes
    useEffect(() => {
      console.log(
        `SheetRow ${rowIndex + 1}: Formula changed to:`,
        data.formula,
      );
    }, [data.formula, rowIndex]);

    useEffect(() => {
      console.log(
        `SheetRow ${rowIndex + 1}: Calculated value changed to:`,
        calculatedValue,
      );
    }, [calculatedValue, rowIndex]);

    // Update the calculated value in the parent component for cell references
    useEffect(() => {
      if (
        data.formula &&
        typeof calculatedValue === 'number' &&
        onUpdateCalculatedValue
      ) {
        const cellRef = `row-${rowIndex + 1}`;
        onUpdateCalculatedValue(cellRef, calculatedValue);
      }
    }, [calculatedValue, data.formula, rowIndex, onUpdateCalculatedValue]);

    // Better display value handling
    const getDisplayValue = () => {
      if (data.formula) {
        // Has a formula
        if (calculatedValue === null || calculatedValue === undefined) {
          return '...'; // Loading or error
        }
        if (
          typeof calculatedValue === 'string' &&
          calculatedValue.startsWith('Error:')
        ) {
          return calculatedValue; // Show error message
        }
        if (typeof calculatedValue === 'number') {
          return calculatedValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }
        return String(calculatedValue);
      } else {
        // No formula, use constant value
        return data.value || '';
      }
    };

    const finalDisplayValue = getDisplayValue();

    // Drag and drop functionality
    const { dragRef } = useDraggable({
      type: 'sheet-row',
      item: { id: data.id, rowIndex },
      canDrag: !editingLabel && !editingValue && !showQueryBuilder,
      onDragChange: () => {}, // No specific drag change handling needed
    });
    const handleDragRef = useDragRef(dragRef);

    const { dropRef, dropPos } = useDroppable({
      types: 'sheet-row',
      id: data.id,
      onDrop: onReorderRow,
    });

    const startEditLabel = () => {
      setTempLabel(data.label || '');
      setEditingLabel(true);
      setTimeout(() => labelInputRef.current?.focus(), 0);
    };

    const startEditValue = () => {
      setTempValue(String(data.value || ''));
      setEditingValue(true);
      setTimeout(() => valueInputRef.current?.focus(), 0);
    };

    const saveLabel = () => {
      onUpdateCell(rowIndex, 'label', tempLabel);
      setEditingLabel(false);
    };

    const saveValue = () => {
      onUpdateCell(rowIndex, 'value', tempValue);
      setEditingValue(false);
    };

    const cancelLabel = () => {
      setTempLabel(data.label || '');
      setEditingLabel(false);
    };

    const cancelValue = () => {
      setTempValue(String(data.value || ''));
      setEditingValue(false);
    };

    const onQueryBuilderSave = (query: string) => {
      console.log('SheetRow: onQueryBuilderSave called with query:', query);
      let formula = '';

      // The QueryBuilder returns different formats based on query type
      if (
        query.startsWith('balance(') ||
        query.startsWith('cost(') ||
        query.includes('=')
      ) {
        // Full formulas (balance, custom) or already formatted cost formulas
        formula = query.startsWith('=') ? query : `=${query}`;
      } else {
        // Raw query strings for cost queries
        formula = `=cost({${query}})`;
      }

      console.log('SheetRow: Final formula to save:', formula);
      // The updateCell function will automatically clear the value when setting a formula
      onUpdateCell(rowIndex, 'formula', formula);
      setShowQueryBuilder(false);
    };

    return (
      <>
        <Row
          height={ROW_HEIGHT}
          inset={0}
          innerRef={dropRef}
          style={{
            cursor: 'grab',
            backgroundColor: data.hidden
              ? theme.tableRowBackgroundHover
              : theme.tableBackground,
            color: theme.tableText,
            borderBottom: `1px solid ${theme.tableBorder}`,
            opacity: data.hidden ? 0.6 : 1,
            ':hover': { backgroundColor: theme.tableRowBackgroundHover },
          }}
        >
          <DropHighlight pos={dropPos ?? 'bottom'} offset={{ top: 1 }} />

          {/* Row Number Field */}
          <Field
            width={60}
            name="row-number"
            style={{
              padding: '8px 12px',
              minHeight: ROW_HEIGHT - 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${theme.tableBorder}`,
              backgroundColor: theme.tableRowHeaderBackground,
            }}
          >
            <Text
              style={{
                color: theme.tableText,
                fontWeight: 600,
                fontSize: 12,
                userSelect: 'none',
              }}
              title={`Reference this row as: row-${rowIndex + 1}`}
            >
              {rowIndex + 1}
            </Text>
          </Field>

          {/* Label Field */}
          <Field
            width="flex"
            name="label"
            innerRef={handleDragRef}
            onClick={!editingLabel ? startEditLabel : undefined}
            style={{
              cursor: !editingLabel ? 'grab' : 'default',
              padding: '8px 12px',
              minHeight: ROW_HEIGHT - 2,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: editingLabel
                ? theme.formInputBackground
                : 'transparent',
              ':hover': !editingLabel
                ? {
                    backgroundColor: theme.tableRowBackgroundHover,
                  }
                : {},
            }}
          >
            {editingLabel ? (
              <Input
                ref={labelInputRef}
                value={tempLabel}
                onChange={e => setTempLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    saveLabel();
                  } else if (e.key === 'Escape') {
                    cancelLabel();
                  }
                }}
                onBlur={saveLabel}
                style={{
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                }}
              />
            ) : (
              <View style={{ width: '100%' }}>
                <Text
                  style={{
                    color: data.label
                      ? theme.tableText
                      : theme.tableTextSubdued,
                    userSelect: 'none',
                  }}
                  title={data.label ? data.label : ''}
                >
                  {data.label || t('Click to add label')}
                </Text>
                {data.hidden && (
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
          </Field>

          {/* Value */}
          <Field
            name="value"
            width={150}
            onClick={
              !editingValue && !data.formula ? startEditValue : undefined
            }
            style={{
              textAlign: 'right',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              cursor: !editingValue && !data.formula ? 'pointer' : 'default',
              backgroundColor: editingValue
                ? theme.formInputBackground
                : 'transparent',
              ':hover':
                !editingValue && !data.formula
                  ? {
                      backgroundColor: theme.tableRowBackgroundHover,
                    }
                  : {},
            }}
          >
            {editingValue ? (
              <Input
                ref={valueInputRef}
                value={tempValue}
                onChange={e => setTempValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    saveValue();
                  } else if (e.key === 'Escape') {
                    cancelValue();
                  }
                }}
                onBlur={saveValue}
                style={{
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  textAlign: 'right',
                }}
              />
            ) : (
              <Text
                style={{
                  color:
                    typeof finalDisplayValue === 'string' &&
                    finalDisplayValue.startsWith('Error:')
                      ? theme.errorText
                      : theme.tableText,
                  width: '100%',
                  userSelect: 'none',
                }}
                title={
                  data.formula
                    ? `Formula: ${data.formula}`
                    : 'Click to edit value'
                }
              >
                <PrivacyFilter>
                  {finalDisplayValue ||
                    (!data.formula ? t('Click to add value') : '')}
                </PrivacyFilter>
              </Text>
            )}
          </Field>

          {/* Formula Field - conditionally rendered */}
          {showFormulaColumn && (
            <Field
              width="flex"
              name="formula"
              onClick={() => setShowQueryBuilder(true)}
              style={{
                cursor: 'pointer',
                padding: '8px 12px',
                minHeight: ROW_HEIGHT - 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: data.formula
                    ? theme.tableText
                    : theme.tableTextSubdued,
                  width: '100%',
                  userSelect: 'none',
                  fontFamily: data.formula
                    ? 'var(--fl-code-font, monospace)'
                    : 'inherit',
                  fontSize: '13px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={data.formula ? data.formula : ''}
              >
                {data.formula
                  ? truncateFormula(data.formula)
                  : t('Click to add formula')}
              </Text>
            </Field>
          )}

          {/* Actions Field */}
          <Field
            width={150}
            name="actions"
            style={{
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 3,
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {/* Query Builder Button */}
              <Button
                variant="bare"
                onPress={() => setShowQueryBuilder(true)}
                style={{
                  padding: 3,
                  minWidth: 22,
                  minHeight: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                }}
                aria-label={t('Query Builder')}
              >
                <SvgAdd style={{ width: 14, height: 14 }} />
              </Button>

              {/* Copy Button */}
              <Button
                variant="bare"
                onPress={() => onCopyRow && onCopyRow(rowIndex)}
                style={{
                  padding: 3,
                  minWidth: 22,
                  minHeight: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                }}
                aria-label={t('Copy Row')}
              >
                <SvgCopy style={{ width: 14, height: 14 }} />
              </Button>

              {/* Delete Button */}
              <Button
                variant="bare"
                onPress={() => onDeleteRow(rowIndex)}
                style={{
                  padding: 3,
                  minWidth: 22,
                  minHeight: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  color: theme.errorText,
                }}
                aria-label={t('Delete Row')}
              >
                <SvgDelete style={{ width: 14, height: 14 }} />
              </Button>

              {/* Hide/Show Button */}
              {onToggleVisibility && (
                <Button
                  variant="bare"
                  onPress={onToggleVisibility}
                  style={{
                    padding: 3,
                    minWidth: 22,
                    minHeight: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 3,
                    opacity: data.hidden ? 1 : 0.6,
                  }}
                  aria-label={data.hidden ? t('Show Row') : t('Hide Row')}
                >
                  {data.hidden ? (
                    <SvgViewShow style={{ width: 14, height: 14 }} />
                  ) : (
                    <SvgViewHide style={{ width: 14, height: 14 }} />
                  )}
                </Button>
              )}

              {/* Insert Below Button */}
              <Button
                variant="bare"
                onPress={() => onInsertRowBelow && onInsertRowBelow(rowIndex)}
                style={{
                  padding: 3,
                  minWidth: 22,
                  minHeight: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                }}
                aria-label={t('Insert Row Below')}
              >
                <SvgArrowDown style={{ width: 14, height: 14 }} />
              </Button>
            </View>
          </Field>
        </Row>

        {/* Query Builder Modal */}
        {showQueryBuilder && (
          <QueryBuilder
            isOpen={showQueryBuilder}
            onClose={() => setShowQueryBuilder(false)}
            onSave={onQueryBuilderSave}
            existingFormula={data.formula}
          />
        )}
      </>
    );
  },
);

SheetRow.displayName = 'SheetRow';
