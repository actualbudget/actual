import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { EditorView } from '@codemirror/view';
import CodeMirror, { EditorState } from '@uiw/react-codemirror';
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror';

import { autocompleteTabAcceptHighest } from '#components/codemirror/autocompleteTabAccept';
import { DateSelect } from '#components/select/DateSelect';
import { useDateFormat } from '#hooks/useDateFormat';
import { useTheme } from '#style/theme';

import {
  excelFormulaExtension,
  formatMonthYear,
  parseMonthYear,
} from './codeMirror-excelLanguage';
import type {
  FormulaBadgeClick,
  MonthYearFormat,
} from './codeMirror-excelLanguage';
import { budgetQueryDimensions } from './formulaCatalog';

type FormulaMode = 'transaction' | 'query';

type FormulaEditorProps = {
  value: string;
  onChange: (value: string) => void;
  mode: FormulaMode;
  height?: string;
  disabled?: boolean;
  queries?: Record<string, unknown>;
  variables?: Record<string, number | string>;
  categoryBadges?: Record<string, string>;
  singleLine?: boolean;
  showLineNumbers?: boolean;
};

type BadgePickerState = {
  view: FormulaBadgeClick['view'];
  anchorRect: DOMRect;
  from: number;
  to: number;
  label: string;
};

type TimeframePickerState = BadgePickerState & {
  month: string;
  format: MonthYearFormat;
};

type CategoryPickerState = BadgePickerState & {
  selectedCategoryIds: string[];
};

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function FormulaEditor({
  value,
  onChange,
  mode,
  height = '100%',
  disabled = false,
  queries,
  variables,
  categoryBadges,
  singleLine = false,
  showLineNumbers = true,
}: FormulaEditorProps) {
  const [activeTheme] = useTheme();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [queryPicker, setQueryPicker] = useState<BadgePickerState | null>(null);
  const [dimensionPicker, setDimensionPicker] =
    useState<BadgePickerState | null>(null);
  const [timeframePicker, setTimeframePicker] =
    useState<TimeframePickerState | null>(null);
  const [categoryPicker, setCategoryPicker] =
    useState<CategoryPickerState | null>(null);
  const suppressBadgePickerUntilRef = useRef(0);
  const badgePickerPopoverRef = useRef<HTMLDivElement | null>(null);

  const isDarkTheme = useMemo(() => {
    if (activeTheme === 'dark' || activeTheme === 'midnight') {
      return true;
    }
    if (activeTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [activeTheme]);

  const closeBadgePickers = useCallback(() => {
    setQueryPicker(null);
    setDimensionPicker(null);
    setTimeframePicker(null);
    setCategoryPicker(null);
  }, []);

  const openBadgePicker = useCallback(
    (details: FormulaBadgeClick) => {
      if (Date.now() < suppressBadgePickerUntilRef.current) {
        return;
      }

      closeBadgePickers();

      const picker = {
        view: details.view,
        anchorRect: details.anchorRect,
        from: details.from,
        to: details.to,
        label: details.label,
      };

      if (details.variant === 'query-name') {
        setQueryPicker(picker);
        return;
      }

      if (details.variant === 'budget-dimension') {
        setDimensionPicker(picker);
        return;
      }

      if (details.variant === 'budget-category-list') {
        setCategoryPicker({
          ...picker,
          selectedCategoryIds:
            details.categories?.map(category => category.id) ?? [],
        });
        return;
      }

      if (details.variant === 'budget-timeframe') {
        const parsed = parseMonthYear(details.label);
        setTimeframePicker({
          ...picker,
          month: parsed?.month ?? getCurrentMonth(),
          format: parsed?.format ?? 'year-month',
        });
      }
    },
    [closeBadgePickers],
  );

  const replaceBadgeValue = useCallback(
    (picker: BadgePickerState, value: string) => {
      const replacement = `"${value}"`;
      picker.view.dispatch({
        changes: {
          from: picker.from,
          to: picker.to,
          insert: replacement,
        },
        selection: { anchor: picker.from + replacement.length },
      });
      suppressBadgePickerUntilRef.current = Date.now() + 300;
      picker.view.focus();
      closeBadgePickers();
    },
    [closeBadgePickers],
  );

  const applyTimeframePickerValue = useCallback(
    (selectedDate: string) => {
      if (!timeframePicker) {
        return;
      }

      replaceBadgeValue(
        timeframePicker,
        formatMonthYear(selectedDate.slice(0, 7), timeframePicker.format),
      );
    },
    [replaceBadgeValue, timeframePicker],
  );

  const toggleCategoryPickerValue = useCallback((categoryId: string) => {
    setCategoryPicker(currentPicker => {
      if (!currentPicker) {
        return currentPicker;
      }

      const isSelected = currentPicker.selectedCategoryIds.includes(categoryId);
      return {
        ...currentPicker,
        selectedCategoryIds: isSelected
          ? currentPicker.selectedCategoryIds.filter(id => id !== categoryId)
          : [...currentPicker.selectedCategoryIds, categoryId],
      };
    });
  }, []);

  const applyCategoryPickerValue = useCallback(() => {
    if (!categoryPicker) {
      return;
    }

    replaceBadgeValue(
      categoryPicker,
      categoryPicker.selectedCategoryIds.join(', '),
    );
  }, [categoryPicker, replaceBadgeValue]);

  useEffect(() => {
    if (
      !queryPicker &&
      !dimensionPicker &&
      !timeframePicker &&
      !categoryPicker
    ) {
      return;
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        badgePickerPopoverRef.current?.contains(target)
      ) {
        return;
      }

      if (categoryPicker) {
        applyCategoryPickerValue();
      } else {
        closeBadgePickers();
      }
    };

    document.addEventListener('mousedown', onMouseDown, true);
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, [
    applyCategoryPickerValue,
    categoryPicker,
    closeBadgePickers,
    dimensionPicker,
    queryPicker,
    timeframePicker,
  ]);

  useEffect(() => {
    if (
      !queryPicker &&
      !dimensionPicker &&
      !timeframePicker &&
      !categoryPicker
    ) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeBadgePickers();
        (
          queryPicker ??
          dimensionPicker ??
          timeframePicker ??
          categoryPicker
        )?.view.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [
    closeBadgePickers,
    categoryPicker,
    dimensionPicker,
    queryPicker,
    timeframePicker,
  ]);

  const extensions = useMemo(
    () => [
      ...(singleLine
        ? [
            EditorState.transactionFilter.of(tr =>
              tr.newDoc.lines > 1
                ? [
                    tr,
                    {
                      changes: {
                        from: 0,
                        to: tr.newDoc.length,
                        insert: tr.newDoc.sliceString(0, undefined, ' '),
                      },
                      sequential: true,
                    },
                  ]
                : [tr],
            ),
          ]
        : []),
      ...excelFormulaExtension(
        mode,
        queries,
        isDarkTheme,
        variables,
        openBadgePicker,
        categoryBadges,
      ),
      EditorView.lineWrapping,
      EditorView.editable.of(!disabled),
      // Must come late + highest precedence so Tab accepts completion when the popup is open
      autocompleteTabAcceptHighest,
    ],
    [
      mode,
      queries,
      isDarkTheme,
      disabled,
      singleLine,
      variables,
      categoryBadges,
      openBadgePicker,
    ],
  );

  const codeMirrorTheme: ReactCodeMirrorProps['theme'] = isDarkTheme
    ? 'dark'
    : 'light';

  return (
    <>
      <CodeMirror
        value={value}
        height={height}
        theme={codeMirrorTheme}
        extensions={extensions}
        onChange={onChange}
        editable={!disabled}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: false,
        }}
        style={{
          fontSize: '14px',
          border: 'none',
        }}
      />
      {queryPicker && queries && (
        <BadgeMenuPopover
          anchorRect={queryPicker.anchorRect}
          minWidth={240}
          popoverRef={badgePickerPopoverRef}
        >
          {Object.keys(queries).map(queryName => (
            <BadgeMenuButton
              key={queryName}
              selected={queryName === queryPicker.label}
              onClick={() => replaceBadgeValue(queryPicker, queryName)}
            >
              {queryName}
            </BadgeMenuButton>
          ))}
        </BadgeMenuPopover>
      )}
      {dimensionPicker && (
        <BadgeMenuPopover
          anchorRect={dimensionPicker.anchorRect}
          minWidth={180}
          popoverRef={badgePickerPopoverRef}
        >
          {budgetQueryDimensions.map(dimension => (
            <BadgeMenuButton
              key={dimension}
              selected={dimension === dimensionPicker.label}
              onClick={() => replaceBadgeValue(dimensionPicker, dimension)}
            >
              {dimension}
            </BadgeMenuButton>
          ))}
        </BadgeMenuPopover>
      )}
      {categoryPicker && categoryBadges && (
        <BadgeMenuPopover
          anchorRect={categoryPicker.anchorRect}
          minWidth={280}
          popoverRef={badgePickerPopoverRef}
          scrollable={false}
        >
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              padding: 4,
            }}
          >
            {Object.entries(categoryBadges).map(([categoryId, label]) => (
              <BadgeMenuButton
                key={categoryId}
                selected={categoryPicker.selectedCategoryIds.includes(
                  categoryId,
                )}
                onClick={() => toggleCategoryPickerValue(categoryId)}
              >
                {label}
              </BadgeMenuButton>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'flex-end',
              padding: '6px 4px 2px',
              margin: '4px 4px 0',
            }}
          >
            <button
              type="button"
              onClick={closeBadgePickers}
              style={pickerActionButtonStyle}
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              type="button"
              onClick={applyCategoryPickerValue}
              style={{
                ...pickerActionButtonStyle,
                background: theme.buttonPrimaryBackground,
                color: theme.buttonPrimaryText,
              }}
            >
              <Trans>Apply</Trans>
            </button>
          </div>
        </BadgeMenuPopover>
      )}
      {timeframePicker && (
        <div
          ref={badgePickerPopoverRef}
          style={{
            ...styles.popover,
            position: 'fixed',
            zIndex: 10000,
            top: timeframePicker.anchorRect.bottom + 4,
            left: Math.min(
              timeframePicker.anchorRect.left,
              window.innerWidth - 260,
            ),
            minWidth: 225,
          }}
          onMouseDown={event => {
            event.stopPropagation();
          }}
          onClick={event => event.stopPropagation()}
        >
          <DateSelect
            value={`${timeframePicker.month}-01`}
            dateFormat={dateFormat}
            embedded
            isOpen
            onSelect={applyTimeframePickerValue}
          />
        </div>
      )}
    </>
  );
}

const pickerActionButtonStyle = {
  border: 0,
  borderRadius: 4,
  padding: '5px 8px',
  background: theme.buttonNormalBackground,
  color: theme.buttonNormalText,
  fontSize: 12,
  cursor: 'pointer',
};

function BadgeMenuPopover({
  anchorRect,
  minWidth,
  popoverRef,
  scrollable = true,
  children,
}: {
  anchorRect: DOMRect;
  minWidth: number;
  popoverRef?: RefObject<HTMLDivElement | null>;
  scrollable?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      ref={popoverRef}
      style={{
        ...styles.popover,
        position: 'fixed',
        zIndex: 10000,
        top: anchorRect.bottom + 4,
        left: Math.min(anchorRect.left, window.innerWidth - minWidth - 20),
        minWidth,
        maxWidth: 320,
        maxHeight: 260,
        overflowY: scrollable ? 'auto' : 'hidden',
        padding: scrollable ? 4 : 0,
      }}
      onMouseDown={event => {
        event.stopPropagation();
      }}
      onClick={event => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function BadgeMenuButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        border: 0,
        borderRadius: 4,
        padding: '7px 8px',
        background: selected ? theme.menuItemBackgroundHover : 'transparent',
        color: theme.pageText,
        textAlign: 'left',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
