import React from 'react';
import { createRoot } from 'react-dom/client';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { autocompletion } from '@codemirror/autocomplete';
import type { CompletionContext } from '@codemirror/autocomplete';
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import {
  EditorView,
  hoverTooltip,
  tooltips,
  ViewPlugin,
} from '@codemirror/view';
import type { Tooltip } from '@codemirror/view';
import { tags } from '@lezer/highlight';

import {
  getDynamicReportQueryCompletions,
  getFormulaCategoryForName,
  getFormulaFunctionByName,
  getFormulaFunctionCategoryConfig,
  getFunctionCompletions,
  getNamedVariableCompletions,
  getRuleFieldCompletions,
  sortFormulaCompletions,
} from './formulaCatalog';
import type { FormulaMode } from './formulaCatalog';

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
    <div style={{ maxWidth: '400px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{name}</div>
      <div style={{ marginBottom: '8px' }}>{description}</div>
      <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>
          <Trans>Parameters:</Trans>
        </div>
        {parameters.map((p, i) => (
          <div key={i} style={{ marginBottom: '2px' }}>
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
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldTooltip({ label, info }: { label: string; info: string }) {
  return (
    <div style={{ maxWidth: '400px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div>{info}</div>
    </div>
  );
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
): Extension {
  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        const suggestions = [
          ...getNamedVariableCompletions(variables),
          ...(mode === 'query'
            ? getDynamicReportQueryCompletions(queries)
            : []),
          ...getFunctionCompletions(mode),
        ];

        if (mode === 'transaction') {
          suggestions.push(...getRuleFieldCompletions());
        }

        return {
          from: word.from,
          options: sortFormulaCompletions(suggestions),
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
    fontWeight: '600',
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
): Extension[] {
  return [
    excelFormulaLanguage,
    excelFormulaAutocomplete(mode, queries, variables),
    excelFormulaHover(mode),
    isDark ? excelFormulaDarkHighlighting : excelFormulaHighlighting,
    isDark ? functionCategoryThemeDark : functionCategoryTheme,
    tooltipZIndexTheme,
    tooltipPortalConfig,
    autocompletePopoverTheme,
    autocompletePopoverPointerHandler,
  ];
}
