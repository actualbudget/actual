import React from 'react';
import { createRoot } from 'react-dom/client';
import { Trans } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  autocompletion,
  insertCompletionText,
  pickedCompletion,
} from '@codemirror/autocomplete';
import type { Completion, CompletionContext } from '@codemirror/autocomplete';
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  hoverTooltip,
  tooltips,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import type { DecorationSet, Tooltip, ViewUpdate } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { t } from 'i18next';

import {
  cacheFormulaBadgeRanges,
  getFormulaBadgeRangeResult,
  remapCachedFormulaBadgeRanges,
} from './formulaBadgeRanges';
import type {
  BudgetCategoryBadge,
  CachedFormulaBadgeRange,
  FormulaBadgeRange,
  FormulaBadgeVariant,
} from './formulaBadgeRanges';
import {
  budgetQueryDimensions,
  getBudgetCategoryCompletionSection,
  getBudgetDimensionCompletionSection,
  getDynamicReportQueryCompletions,
  getFormulaCategoryForName,
  getFormulaFunctionByName,
  getFormulaFunctionCategoryConfig,
  getFunctionCompletions,
  getFunctionSignatureCompletionSection,
  getNamedVariableCompletions,
  getRuleFieldCompletions,
  sortFormulaCompletions,
} from './formulaCatalog';
import type { FormulaFunctionDef, FormulaMode } from './formulaCatalog';

// Tooltip components using the same styles as Tooltip.tsx
function FunctionTooltip({
  name,
  description,
  parameters,
}: {
  name: string;
  description: string;
  parameters: Array<{ name: string; description: string }>;
}) {
  return (
    <SpaceBetween
      direction="vertical"
      gap={8}
      align="stretch"
      style={{ maxWidth: '400px' }}
    >
      <View style={{ display: 'block', ...styles.mediumText }}>{name}</View>
      <View style={{ display: 'block' }}>{description}</View>
      <SpaceBetween
        direction="vertical"
        gap={4}
        align="stretch"
        style={{ ...styles.smallText, color: theme.pageTextSubdued }}
      >
        <View style={{ display: 'block' }}>
          <Trans>Parameters:</Trans>
        </View>
        {parameters.map((p, i) => (
          <View key={i} style={{ display: 'block' }}>
            •{' '}
            <code
              style={{
                ...styles.editorPill,
                fontSize: '0.95em',
              }}
            >
              {p.name}
            </code>
            : {p.description}
          </View>
        ))}
      </SpaceBetween>
    </SpaceBetween>
  );
}

function FieldTooltip({ label, info }: { label: string; info: string }) {
  return (
    <SpaceBetween
      direction="vertical"
      gap={4}
      align="stretch"
      style={{ maxWidth: '400px' }}
    >
      <View style={{ display: 'block', ...styles.mediumText }}>{label}</View>
      <View style={{ display: 'block' }}>{info}</View>
    </SpaceBetween>
  );
}

export type FormulaBadgeClick = {
  view: EditorView;
  anchorRect: DOMRect;
  from: number;
  to: number;
  label: string;
  variant: FormulaBadgeVariant;
  categories?: BudgetCategoryBadge[];
};

export type MonthYearFormat = 'year-month' | 'month-year';

export function parseMonthYear(
  value: string,
): { month: string; format: MonthYearFormat } | null {
  const yearMonth = value.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonth) {
    const month = Number(yearMonth[2]);
    if (month >= 1 && month <= 12) {
      return {
        month: `${yearMonth[1]}-${String(month).padStart(2, '0')}`,
        format: 'year-month',
      };
    }
  }

  const monthYear = value.match(/^(\d{1,2})-(\d{4})$/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    if (month >= 1 && month <= 12) {
      return {
        month: `${monthYear[2]}-${String(month).padStart(2, '0')}`,
        format: 'month-year',
      };
    }
  }

  return null;
}

export function formatMonthYear(month: string, format: MonthYearFormat) {
  if (format === 'month-year') {
    return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
  }
  return month;
}

function applyStyle(element: HTMLElement, style: Record<string, string>) {
  Object.assign(element.style, style);
}

class FormulaBadgeWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly variant: FormulaBadgeVariant,
    readonly range: { from: number; to: number },
    readonly onBadgeClick?: (details: FormulaBadgeClick) => void,
    readonly categories?: BudgetCategoryBadge[],
  ) {
    super();
  }

  eq(other: FormulaBadgeWidget) {
    return (
      other.label === this.label &&
      other.variant === this.variant &&
      other.range.from === this.range.from &&
      other.range.to === this.range.to &&
      other.onBadgeClick === this.onBadgeClick &&
      JSON.stringify(other.categories) === JSON.stringify(this.categories)
    );
  }

  toDOM(view: EditorView) {
    const element = document.createElement('span');
    const isQueryBadge = this.variant === 'query-name';
    const isBudgetBadge = this.variant.startsWith('budget-');
    const isCategoryList = this.variant === 'budget-category-list';
    const baseElementStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      margin: '0 1px',
      border: `1px solid ${theme.formInputBorder}`,
      color: theme.pageText,
      fontSize: '12px',
    };
    const categoryListElementStyle = {
      maxWidth: '100%',
      overflow: 'visible',
      textOverflow: 'clip',
      whiteSpace: 'normal',
      padding: '2px 4px',
      borderRadius: '4px',
      backgroundColor: theme.tableRowBackgroundHover,
      lineHeight: '20px',
      gap: '4px',
      flexWrap: 'wrap',
      verticalAlign: 'middle',
    };
    const singleBadgeElementStyle = {
      maxWidth: '220px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '0 6px',
      borderRadius: '999px',
      lineHeight: '18px',
    };
    let singleBadgeColorStyle = {
      backgroundColor: theme.pillBackground,
    };

    if (isQueryBadge) {
      singleBadgeColorStyle = {
        backgroundColor: theme.noticeBackground,
      };
    } else if (isBudgetBadge) {
      singleBadgeColorStyle = {
        backgroundColor: theme.buttonNormalBackground,
      };
    }

    element.title = this.label;
    if (isCategoryList) {
      applyStyle(element, {
        ...baseElementStyle,
        ...categoryListElementStyle,
      });

      for (const category of this.categories ?? []) {
        const badge = document.createElement('span');
        const categoryBadgeStyle = {
          display: 'inline-flex',
          alignItems: 'center',
          maxWidth: '100%',
          overflow: 'visible',
          textOverflow: 'clip',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          padding: '0 6px',
          borderRadius: '999px',
          backgroundColor: theme.buttonNormalBackground,
          color: theme.pageText,
          lineHeight: '18px',
        };

        badge.textContent = category.label;
        badge.title = category.label;
        applyStyle(badge, {
          ...categoryBadgeStyle,
        });
        element.appendChild(badge);
      }
    } else {
      applyStyle(element, {
        ...baseElementStyle,
        ...singleBadgeElementStyle,
        ...singleBadgeColorStyle,
      });
      element.textContent = this.label;
    }

    if (
      this.onBadgeClick &&
      [
        'query-name',
        'budget-dimension',
        'budget-timeframe',
        'budget-category-list',
      ].includes(this.variant)
    ) {
      element.style.cursor = 'pointer';
      element.addEventListener('mousedown', event => {
        event.preventDefault();
        event.stopPropagation();
      });
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.onBadgeClick?.({
          view,
          anchorRect: element.getBoundingClientRect(),
          from: this.range.from,
          to: this.range.to,
          label: this.label,
          variant: this.variant,
          categories: this.categories,
        });
      });
    }
    return element;
  }
}

function formulaBadgeExtension(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  variables?: Record<string, number | string>,
  onBadgeClick?: (details: FormulaBadgeClick) => void,
  categoryBadges?: Record<string, string>,
): Extension {
  const buildDecorations = (
    view: EditorView,
    badgeRanges: FormulaBadgeRange[],
  ): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();

    badgeRanges
      .filter(({ from, to }) =>
        view.visibleRanges.some(range => from < range.to && to > range.from),
      )
      .sort((a, b) => a.from - b.from || a.to - b.to)
      .forEach(({ from, to, label, variant, categories }) => {
        builder.add(
          from,
          to,
          Decoration.replace({
            widget: new FormulaBadgeWidget(
              label,
              variant,
              { from, to },
              onBadgeClick,
              categories,
            ),
            inclusive: false,
          }),
        );
      });

    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      lastValidBadgeRanges: CachedFormulaBadgeRange[] = [];

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView) {
        const formula = view.state.doc.toString();
        const result = getFormulaBadgeRangeResult({
          formula,
          mode,
          queries,
          variables,
          categoryBadges,
        });
        let badgeRanges = result.ranges;

        if (result.status === 'ok') {
          this.lastValidBadgeRanges = cacheFormulaBadgeRanges(
            formula,
            badgeRanges,
          );
        } else if (result.status === 'inactive') {
          this.lastValidBadgeRanges = [];
        } else {
          badgeRanges = badgeRanges.concat(
            remapCachedFormulaBadgeRanges({
              formula,
              cachedRanges: this.lastValidBadgeRanges,
              blockedRanges: badgeRanges,
            }),
          );
        }

        return buildDecorations(view, badgeRanges);
      }
    },
    {
      decorations: plugin => plugin.decorations,
      provide: plugin =>
        EditorView.atomicRanges.of(
          view => view.plugin(plugin)?.decorations ?? Decoration.none,
        ),
    },
  );
}

function createContextFunctionCompletion(
  name: string,
  func: FormulaFunctionDef,
): Completion {
  return {
    label: name,
    type: 'function',
    section: getFunctionSignatureCompletionSection(),
    detail: `(${func.parameters.map(p => p.name).join(', ')})`,
    info: [
      func.description,
      '',
      `${t('Parameters:')} ${func.parameters.map(p => p.name).join(', ')}`,
      '',
      func.parameters.map(p => `- ${p.name}: ${p.description}`).join('\n'),
    ].join('\n'),
    apply: view => {
      view.dispatch({ selection: view.state.selection });
    },
    boost: 99,
  };
}

export function getFormulaStringCompletionEdit({
  value,
  hasOpeningQuote,
  hasClosingQuote,
}: {
  value: string;
  hasOpeningQuote: boolean;
  hasClosingQuote: boolean;
}) {
  return {
    text: `${hasOpeningQuote ? '' : '"'}${value}"`,
    offsetClosingQuote: hasClosingQuote ? 1 : 0,
  };
}

function applyFormulaStringCompletion(value: string): Completion['apply'] {
  return (view, completion, from, to) => {
    const { text, offsetClosingQuote } = getFormulaStringCompletionEdit({
      value,
      hasOpeningQuote: from > 0 && view.state.sliceDoc(from - 1, from) === '"',
      hasClosingQuote: view.state.sliceDoc(to, to + 1) === '"',
    });

    view.dispatch({
      ...insertCompletionText(view.state, text, from, to + offsetClosingQuote),
      annotations: pickedCompletion.of(completion),
    });
  };
}

function getActiveFunctionArgumentContext(text: string) {
  const stack: Array<{
    kind: 'function' | 'group' | 'array';
    name?: string;
    argumentIndex: number;
  }> = [];
  let isInString = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      isInString = !isInString;
      continue;
    }

    if (isInString) {
      continue;
    }

    if (char === '(') {
      const functionMatch = text
        .slice(0, index)
        .match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      stack.push({
        kind: functionMatch ? 'function' : 'group',
        name: functionMatch?.[1].toUpperCase(),
        argumentIndex: 0,
      });
      continue;
    }

    if (char === '{') {
      stack.push({ kind: 'array', argumentIndex: 0 });
      continue;
    }

    if (char === ')' || char === '}') {
      stack.pop();
      continue;
    }

    if (char === ',') {
      const activeFrame = stack.at(-1);
      if (activeFrame?.kind === 'function') {
        activeFrame.argumentIndex += 1;
      }
    }
  }

  let activeFunction: {
    kind: 'function' | 'group' | 'array';
    name?: string;
    argumentIndex: number;
  } | null = null;
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].kind === 'function') {
      activeFunction = stack[index];
      break;
    }
  }

  return activeFunction?.name
    ? {
        name: activeFunction.name,
        argumentIndex: activeFunction.argumentIndex,
      }
    : null;
}

// Excel formula syntax parser for CodeMirror
const excelFormulaParser: StreamParser<{ inString: boolean }> = {
  startState() {
    return { inString: false };
  },

  token(stream, state) {
    // Handle strings
    if (state.inString) {
      if (stream.skipTo('"')) {
        stream.next();
        state.inString = false;
      } else {
        stream.skipToEnd();
      }
      return 'string';
    }

    if (stream.match('"')) {
      state.inString = true;
      return 'string';
    }

    // Handle numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return 'number';
    }

    // Handle operators
    if (stream.match(/^[+\-*/=<>(),:]/)) {
      return 'operator';
    }

    // Handle function names (uppercase letters followed by parenthesis)
    if (stream.match(/^[A-Z_][A-Z0-9_]*/)) {
      const word = stream.current();
      // Check if it's a function (next non-whitespace is '(')
      const pos = stream.pos;
      stream.eatSpace();
      if (stream.peek() === '(') {
        stream.pos = pos; // Reset position

        return getFormulaFunctionCategoryConfig()[
          getFormulaCategoryForName(word) ?? 'other'
        ].tokenClass;
      }
      stream.pos = pos; // Reset position
      return 'variableName';
    }

    // Handle variable names (lowercase or mixed case)
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return 'variableName.special';
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    stream.next();
    return null;
  },
};

// Autocomplete extension
export function excelFormulaAutocomplete(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  variables?: Record<string, number | string>,
  categoryBadges?: Record<string, string>,
): Extension {
  const functionCompletions = getFunctionCompletions(mode);
  const queryCompletions =
    mode === 'query' ? getDynamicReportQueryCompletions(queries) : [];
  const variableCompletions = getNamedVariableCompletions(variables);
  const budgetDimensionCompletions: Completion[] =
    mode === 'query'
      ? budgetQueryDimensions.map(dimension => ({
          label: dimension,
          type: 'constant',
          section: getBudgetDimensionCompletionSection(),
          info: t('Budget query dimension.'),
          apply: applyFormulaStringCompletion(dimension),
          boost: 18,
        }))
      : [];
  const budgetCategoryCompletions: Completion[] =
    mode === 'query' && categoryBadges
      ? Object.entries(categoryBadges).map(([categoryId, label]) => ({
          label,
          type: 'constant',
          section: getBudgetCategoryCompletionSection(),
          detail: categoryId,
          info: t('Budget category for BUDGET_QUERY category arrays.'),
          apply: applyFormulaStringCompletion(categoryId),
          boost: 17,
        }))
      : [];

  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        const activeFunctionContext = getActiveFunctionArgumentContext(
          context.state.doc.sliceString(0, context.pos),
        );
        const activeFunctionDefinition = activeFunctionContext
          ? getFormulaFunctionByName(activeFunctionContext.name, mode)
          : undefined;
        const activeFunctionSignatureCompletion =
          activeFunctionContext && activeFunctionDefinition
            ? createContextFunctionCompletion(
                activeFunctionContext.name,
                activeFunctionDefinition,
              )
            : null;
        const isBudgetQueryContext =
          mode === 'query' && activeFunctionContext?.name === 'BUDGET_QUERY';

        const baseSuggestions: Completion[] = [
          ...variableCompletions,
          ...budgetDimensionCompletions,
          ...budgetCategoryCompletions,
          ...queryCompletions,
          ...functionCompletions,
          ...(mode === 'transaction' ? getRuleFieldCompletions() : []),
        ];

        const contextualSuggestions: Completion[] = activeFunctionContext
          ? [
              ...(activeFunctionSignatureCompletion
                ? [activeFunctionSignatureCompletion]
                : []),
              ...(isBudgetQueryContext &&
              activeFunctionContext.argumentIndex === 0
                ? budgetDimensionCompletions
                : []),
              ...(isBudgetQueryContext &&
              activeFunctionContext.argumentIndex === 1
                ? budgetCategoryCompletions
                : []),
              ...(isBudgetQueryContext &&
              (activeFunctionContext.argumentIndex === 2 ||
                activeFunctionContext.argumentIndex === 3)
                ? queryCompletions
                : []),
            ]
          : [];

        const suggestions = activeFunctionContext
          ? [
              ...contextualSuggestions,
              ...sortFormulaCompletions(
                baseSuggestions.filter(
                  suggestion => !contextualSuggestions.includes(suggestion),
                ),
              ),
            ]
          : sortFormulaCompletions(baseSuggestions);

        return {
          from: word.from,
          options: suggestions,
        };
      },
    ],
  });
}

// Hover tooltip for documentation
export function excelFormulaHover(mode: FormulaMode): Extension {
  return hoverTooltip((view, pos) => {
    const word = view.state.wordAt(pos);
    if (!word) return null;
    const w = view.state.doc.sliceString(word.from, word.to);
    const upper = w.toUpperCase();
    const funcDef = getFormulaFunctionByName(upper, mode);
    if (funcDef) {
      return {
        pos: word.from,
        end: word.to,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-tooltip-hover';
          Object.assign(dom.style, styles.tooltip, { padding: '8px' });
          const root = createRoot(dom);
          root.render(
            <FunctionTooltip
              name={upper}
              description={funcDef.description}
              parameters={funcDef.parameters}
            />,
          );
          return {
            dom,
            destroy() {
              root.unmount();
            },
          };
        },
      } satisfies Tooltip;
    }

    // Transaction fields
    if (mode === 'transaction') {
      const field = getRuleFieldCompletions().find(f => f.label === w);
      if (field) {
        return {
          pos: word.from,
          end: word.to,
          above: true,
          create() {
            const dom = document.createElement('div');
            dom.className = 'cm-tooltip-hover';
            Object.assign(dom.style, styles.tooltip, { padding: '8px' });
            const root = createRoot(dom);
            const infoText = typeof field.info === 'string' ? field.info : '';
            root.render(<FieldTooltip label={field.label} info={infoText} />);
            return {
              dom,
              destroy() {
                root.unmount();
              },
            };
          },
        } satisfies Tooltip;
      }
    }

    return null;
  });
}

// Excel formula language support
export const excelFormulaLanguage = StreamLanguage.define(excelFormulaParser);

const tooltipZIndexTheme = EditorView.baseTheme({
  '.cm-tooltip': {
    zIndex: '4000 !important',
  },
  '.cm-tooltip-autocomplete': {
    zIndex: '4000 !important',
  },
});

const tooltipPortalConfig =
  typeof document === 'undefined'
    ? tooltips({ position: 'fixed' })
    : tooltips({ position: 'fixed', parent: document.body });

const autocompletePopoverTheme = EditorView.baseTheme({
  // Wrapper: keep transparent; the list and info panel are the actual "cards".
  '.cm-tooltip.cm-tooltip-autocomplete': {
    ...styles.darkScrollbar,
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: 0,
    margin: '6px',
    overflow: 'visible',
    fontFamily: 'inherit',
    userSelect: 'none',
  },

  // The suggestion list card
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    ...styles.shadowLarge,
    margin: 0,
    padding: '5px 0',
    maxHeight: '260px',
    minWidth: '280px',
    listStyle: 'none',
    backgroundColor: theme.menuAutoCompleteBackground,
    color: theme.menuAutoCompleteText,
    borderRadius: '6px',
    overflow: 'hidden',
    overflowY: 'auto',
  },

  // Hide CodeMirror's leading icons (gear / f / etc.)
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon': {
    display: 'none !important',
    width: 0,
    margin: 0,
    padding: 0,
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon::before': {
    display: 'none !important',
  },

  // Section headers
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection':
    {
      padding: '7px 12px 3px !important',
      paddingLeft: '12px !important',
      paddingRight: '12px !important',
      fontSize: '11px',
      lineHeight: '1em',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      color: theme.menuItemTextHeader,
      opacity: '1 !important',
      marginTop: '8px',
      position: 'sticky',
      top: 0,
      backgroundColor: theme.menuAutoCompleteBackground,
      borderTop: 'none !important',
      borderBottom: 'none !important',
      zIndex: 1,
    },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section:first-child, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection:first-child':
    {
      marginTop: 0,
    },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section::before, .cm-tooltip.cm-tooltip-autocomplete > ul > completion-section::after, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection::before, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection::after':
    {
      display: 'none !important',
    },
  // Completion rows
  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem, .cm-tooltip.cm-tooltip-autocomplete li[role="option"]':
    {
      padding: '5px 14px !important',
      paddingLeft: '14px !important',
      paddingRight: '14px !important',
      lineHeight: '1.2',
      cursor: 'default',
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px',
      borderRadius: 0,
    },

  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem': {
    lineHeight: '1.2',
    cursor: 'default',
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    borderRadius: 0,
  },

  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem[aria-selected], .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem:hover, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem-hover':
    {
      backgroundColor: theme.menuAutoCompleteBackgroundHover,
      color: theme.menuAutoCompleteItemTextHover,
    },
  '.cm-tooltip.cm-tooltip-autocomplete li[role="option"]:hover': {
    backgroundColor: theme.menuAutoCompleteBackgroundHover,
    color: theme.menuAutoCompleteItemTextHover,
  },

  // Matched text within a label
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionMatchedText': {
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },

  // Label + detail formatting
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel': {
    fontSize: '13px',
    flex: '1 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail': {
    fontSize: '12px',
    color: theme.menuKeybindingText,
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem[aria-selected] .cm-completionDetail':
    {
      color: theme.menuAutoCompleteItemTextHover,
    },

  // Docs panel for selected completion
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionInfo': {
    backgroundColor: theme.menuBackground,
    color: theme.pageText,
    padding: '12px 14px',
    maxWidth: '360px',
    whiteSpace: 'pre-wrap',
    fontSize: '12px',
    lineHeight: '1.4',
    ...styles.shadowLarge,
    border: 'none',
    borderRadius: '6px',
    marginLeft: '8px',
  },
});

//hack: this is a workaround to forward the pointer events to the completion item.
//isPointInsideRect / findAutocompleteElementAtPoint / autocompletePopoverPointerHandler are needed to forward the pointer events to the completion item.
//Otherwise the mouse interactions will not work as expected.
function isPointInsideRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function findAutocompleteElementAtPoint(
  document: Document,
  selector: string,
  x: number,
  y: number,
) {
  return Array.from(document.querySelectorAll(selector)).find(element =>
    isPointInsideRect(x, y, element.getBoundingClientRect()),
  );
}

const autocompletePopoverPointerHandler = ViewPlugin.define(view => {
  let hoveredCompletionItem: HTMLElement | null = null;

  function setHoveredCompletionItem(completionItem: HTMLElement | null) {
    if (hoveredCompletionItem === completionItem) {
      return;
    }

    hoveredCompletionItem?.classList.remove('cm-completionItem-hover');
    hoveredCompletionItem = completionItem;
    hoveredCompletionItem?.classList.add('cm-completionItem-hover');
  }

  const handleWheel = (event: WheelEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    let scrollContainer: Element | null | undefined = event.target.closest(
      '.cm-tooltip.cm-tooltip-autocomplete > ul',
    );
    if (!(scrollContainer instanceof HTMLElement)) {
      // React Aria modals use the browser top layer, so wheel events can target
      // modal content even when the autocomplete list is visually under the pointer.
      scrollContainer = findAutocompleteElementAtPoint(
        view.dom.ownerDocument,
        '.cm-tooltip.cm-tooltip-autocomplete > ul',
        event.clientX,
        event.clientY,
      );
    }

    if (!(scrollContainer instanceof HTMLElement)) {
      return;
    }

    const canScrollY =
      scrollContainer.scrollHeight > scrollContainer.clientHeight;
    const canScrollX =
      scrollContainer.scrollWidth > scrollContainer.clientWidth;
    if (!canScrollY && !canScrollX) {
      return;
    }

    const deltaMultiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? scrollContainer.clientHeight
          : 1;

    const previousScrollTop = scrollContainer.scrollTop;
    const previousScrollLeft = scrollContainer.scrollLeft;

    scrollContainer.scrollTop += event.deltaY * deltaMultiplier;
    scrollContainer.scrollLeft += event.deltaX * deltaMultiplier;

    if (
      scrollContainer.scrollTop !== previousScrollTop ||
      scrollContainer.scrollLeft !== previousScrollLeft
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest('.cm-tooltip.cm-tooltip-autocomplete')) {
      return;
    }

    const completionItem = findAutocompleteElementAtPoint(
      view.dom.ownerDocument,
      '.cm-tooltip.cm-tooltip-autocomplete li[role="option"], .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem',
      event.clientX,
      event.clientY,
    );

    if (!(completionItem instanceof HTMLElement)) {
      setHoveredCompletionItem(null);
      return;
    }

    setHoveredCompletionItem(completionItem);

    completionItem.dispatchEvent(
      new MouseEvent(event.type, {
        bubbles: true,
        cancelable: true,
        view: view.dom.ownerDocument.defaultView,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }),
    );
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest('.cm-tooltip.cm-tooltip-autocomplete')) {
      return;
    }

    const completionItem = findAutocompleteElementAtPoint(
      view.dom.ownerDocument,
      '.cm-tooltip.cm-tooltip-autocomplete li[role="option"], .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem',
      event.clientX,
      event.clientY,
    );

    if (!(completionItem instanceof HTMLElement)) {
      return;
    }

    completionItem.dispatchEvent(
      new MouseEvent(event.type, {
        bubbles: true,
        cancelable: true,
        view: view.dom.ownerDocument.defaultView,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }),
    );
  };

  view.dom.ownerDocument.addEventListener('wheel', handleWheel, {
    capture: true,
    passive: false,
  });
  view.dom.ownerDocument.addEventListener('mousedown', handleMouseDown, {
    capture: true,
    passive: false,
  });
  view.dom.ownerDocument.addEventListener('mousemove', handleMouseMove, {
    capture: true,
    passive: true,
  });

  return {
    destroy() {
      view.dom.ownerDocument.removeEventListener('wheel', handleWheel, {
        capture: true,
      });
      view.dom.ownerDocument.removeEventListener('mousedown', handleMouseDown, {
        capture: true,
      });
      view.dom.ownerDocument.removeEventListener('mousemove', handleMouseMove, {
        capture: true,
      });
      setHoveredCompletionItem(null);
    },
  };
});

// Custom theme for categorized function highlighting (light)
const functionCategoryTheme = EditorView.baseTheme({
  '&light .cm-keyword': { color: '#0066CC' }, // Math functions in blue
  '&light .cm-className': { color: '#267F99' }, // Logical functions in teal
  '&light .cm-namespace': { color: '#AF00DB' }, // Text functions in purple
  '&light .cm-typeName': { color: '#098658' }, // Date functions in green
  '&light .cm-propertyName': { color: '#D73A49' }, // Query functions in red
});

// Syntax highlighting for Excel formulas
export const excelFormulaHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.function(tags.variableName), color: '#795E26' }, // Generic functions in brown/gold
    // Other syntax elements
    { tag: tags.string, color: '#A31515' }, // Strings in red
    { tag: tags.number, color: '#098658' }, // Numbers in green
    { tag: tags.operator, color: '#000000' }, // Operators in black
    { tag: tags.variableName, color: '#001080' }, // Variables in dark blue
    { tag: tags.special(tags.variableName), color: '#0070C1' }, // Special variables (transaction fields) in bright blue
  ]),
);

// Custom theme for categorized function highlighting (dark)
const functionCategoryThemeDark = EditorView.baseTheme({
  '&dark .cm-keyword': { color: '#4FC1FF' }, // Math functions in bright cyan
  '&dark .cm-className': { color: '#4EC9B0' }, // Logical functions in teal
  '&dark .cm-namespace': { color: '#C586C0' }, // Text functions in light purple
  '&dark .cm-typeName': { color: '#B5CEA8' }, // Date functions in light green
  '&dark .cm-propertyName': { color: '#F97583' }, // Query functions in light red
});

// Dark theme syntax highlighting
export const excelFormulaDarkHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.function(tags.variableName), color: '#DCDCAA' }, // Generic functions in light yellow
    // Other syntax elements
    { tag: tags.string, color: '#CE9178' }, // Strings in orange
    { tag: tags.number, color: '#B5CEA8' }, // Numbers in light green
    { tag: tags.operator, color: '#D4D4D4' }, // Operators in light gray
    { tag: tags.variableName, color: '#9CDCFE' }, // Variables in light blue
    { tag: tags.special(tags.variableName), color: '#4FC1FF' }, // Special variables in bright cyan
  ]),
);

// Combined extension for Excel formula support
export function excelFormulaExtension(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  isDark?: boolean,
  variables?: Record<string, number | string>,
  onBadgeClick?: (details: FormulaBadgeClick) => void,
  categoryBadges?: Record<string, string>,
): Extension[] {
  return [
    excelFormulaLanguage,
    excelFormulaAutocomplete(mode, queries, variables, categoryBadges),
    excelFormulaHover(mode),
    formulaBadgeExtension(
      mode,
      queries,
      variables,
      onBadgeClick,
      categoryBadges,
    ),
    isDark ? excelFormulaDarkHighlighting : excelFormulaHighlighting,
    isDark ? functionCategoryThemeDark : functionCategoryTheme,
    tooltipZIndexTheme,
    tooltipPortalConfig,
    autocompletePopoverTheme,
    autocompletePopoverPointerHandler,
  ];
}
