import { HyperFormula } from 'hyperformula';

import { bootstrapHyperFormula } from '#util/bootstrapHyperFormula';

import { budgetQueryDimensions } from './formulaCatalog';

type FormulaMode = 'transaction' | 'query';

export type FormulaBadgeVariant =
  | 'named-expression'
  | 'query-name'
  | 'budget-dimension'
  | 'budget-category-list'
  | 'budget-timeframe';

export type BudgetCategoryBadge = {
  id: string;
  label: string;
};

export type FormulaBadgeRange = {
  from: number;
  to: number;
  label: string;
  variant: FormulaBadgeVariant;
  categories?: BudgetCategoryBadge[];
};

export type CachedFormulaBadgeRange = FormulaBadgeRange & {
  sourceText: string;
};

export type FormulaBadgeRangeResult = {
  ranges: FormulaBadgeRange[];
  status: 'ok' | 'partial' | 'failed' | 'inactive';
};

type Token = {
  image: string;
  startOffset?: number;
  endOffset?: number;
  tokenType?: {
    name?: string;
  };
};

type TokenizeResult = {
  tokens: Token[];
  errors?: unknown[];
};

type FormulaAst = {
  type: string;
  procedureName?: string;
  args?: FormulaAst[] | FormulaAst[][];
  expression?: FormulaAst;
  value?: FormulaAst | string;
  left?: FormulaAst;
  right?: FormulaAst;
  expressionName?: string;
};

type ParsedFormula = {
  ast?: FormulaAst;
};

type FormulaRange = {
  from: number;
  to: number;
};

type HyperFormulaBadgeParser = {
  destroy(): void;
  extractTemporaryFormula(formula: string): ParsedFormula;
  _parser?: {
    tokenizeFormula(formulaBody: string): TokenizeResult;
  };
};

const transactionNamedExpressionBadges: Record<string, string> = {
  today: 'today',
  amount: 'amount',
  date: 'date',
  notes: 'notes',
  imported_payee: 'imported_payee',
  payee: 'payee',
  payee_name: 'payee_name',
  account: 'account',
  account_name: 'account_name',
  category: 'category',
  category_name: 'category_name',
  cleared: 'cleared',
  reconciled: 'reconciled',
  balance: 'balance',
  parent_amount: 'parent_amount',
};

const queryNameFunctions = new Set([
  'QUERY',
  'QUERY_COUNT',
  'QUERY_EXTRACT_CATEGORIES',
  'QUERY_EXTRACT_TIMEFRAME_START',
  'QUERY_EXTRACT_TIMEFRAME_END',
]);

const budgetDimensions = new Set<string>(budgetQueryDimensions);

function isBudgetTimeframe(value: string) {
  const yearMonth = value.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonth) {
    const month = Number(yearMonth[2]);
    return month >= 1 && month <= 12;
  }

  const monthYear = value.match(/^(\d{1,2})-(\d{4})$/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    return month >= 1 && month <= 12;
  }

  return false;
}

let parserInstance: HyperFormulaBadgeParser | null = null;

function getParserInstance() {
  bootstrapHyperFormula();

  parserInstance ??= HyperFormula.buildEmpty({
    licenseKey: 'gpl-v3',
    language: 'enUS',
    dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'],
  }) as unknown as HyperFormulaBadgeParser;

  return parserInstance;
}

function getTokenRange(token: Token) {
  if (
    typeof token.startOffset !== 'number' ||
    typeof token.endOffset !== 'number'
  ) {
    return null;
  }

  return {
    // HyperFormula token offsets are relative to the formula body, excluding "=".
    from: token.startOffset + 1,
    to: token.endOffset + 2,
  };
}

function findNextToken(
  tokens: Token[],
  cursor: { value: number },
  expressionName: string,
) {
  const index = tokens.findIndex((token, offset) => {
    return offset >= cursor.value && token.image === expressionName;
  });

  if (index === -1) {
    return null;
  }

  cursor.value = index + 1;
  return tokens[index];
}

function getBadgeRangesFromNamedExpressionToken({
  token,
  namedExpressionBadges,
}: {
  token: Token;
  namedExpressionBadges: Record<string, string>;
}): FormulaBadgeRange[] {
  const tokenRange = getTokenRange(token);
  if (!tokenRange) {
    return [];
  }

  const exactLabel = namedExpressionBadges[token.image];
  if (exactLabel) {
    return [
      {
        ...tokenRange,
        label: exactLabel,
        variant: 'named-expression',
      },
    ];
  }

  const namesByLength = Object.keys(namedExpressionBadges).sort(
    (a, b) => b.length - a.length,
  );
  const ranges: FormulaBadgeRange[] = [];
  let offset = 0;

  while (offset < token.image.length) {
    const name = namesByLength.find(candidate =>
      token.image.startsWith(candidate, offset),
    );

    if (!name) {
      return [];
    }

    ranges.push({
      from: tokenRange.from + offset,
      to: tokenRange.from + offset + name.length,
      label: namedExpressionBadges[name],
      variant: 'named-expression',
    });
    offset += name.length;
  }

  return ranges;
}

function visitAstInSourceOrder(
  ast: FormulaAst,
  visit: (node: FormulaAst) => void,
) {
  visit(ast);

  switch (ast.type) {
    case 'FUNCTION_CALL':
      if (Array.isArray(ast.args)) {
        (ast.args as FormulaAst[]).forEach(arg =>
          visitAstInSourceOrder(arg, visit),
        );
      }
      return;
    case 'ARRAY':
      if (Array.isArray(ast.args)) {
        (ast.args as FormulaAst[][]).forEach(row =>
          row.forEach(arg => visitAstInSourceOrder(arg, visit)),
        );
      }
      return;
    case 'PARENTHESES':
      if (ast.expression) {
        visitAstInSourceOrder(ast.expression, visit);
      }
      return;
    case 'MINUS_UNARY_OP':
    case 'PLUS_UNARY_OP':
    case 'PERCENT_OP':
      if (ast.value && typeof ast.value === 'object') {
        visitAstInSourceOrder(ast.value, visit);
      }
      return;
    case 'CONCATENATE_OP':
    case 'EQUALS_OP':
    case 'NOT_EQUAL_OP':
    case 'GREATER_THAN_OP':
    case 'LESS_THAN_OP':
    case 'GREATER_THAN_OR_EQUAL_OP':
    case 'LESS_THAN_OR_EQUAL_OP':
    case 'PLUS_OP':
    case 'MINUS_OP':
    case 'TIMES_OP':
    case 'DIV_OP':
    case 'POWER_OP':
      if (ast.left) {
        visitAstInSourceOrder(ast.left, visit);
      }
      if (ast.right) {
        visitAstInSourceOrder(ast.right, visit);
      }
      return;
    default:
      return;
  }
}

function visitStringArgsInSourceOrder(
  ast: FormulaAst,
  visit: (node: FormulaAst) => void,
) {
  if (ast.type === 'STRING') {
    visit(ast);
    return;
  }

  switch (ast.type) {
    case 'ARRAY':
      if (Array.isArray(ast.args)) {
        (ast.args as FormulaAst[][]).forEach(row =>
          row.forEach(arg => visitStringArgsInSourceOrder(arg, visit)),
        );
      }
      return;
    case 'PARENTHESES':
      if (ast.expression) {
        visitStringArgsInSourceOrder(ast.expression, visit);
      }
      return;
    default:
      return;
  }
}

function getStringNodeRanges(ast: FormulaAst, stringTokens: Token[]) {
  const stringCursor = { value: 0 };
  const stringNodeRanges = new WeakMap<FormulaAst, FormulaRange>();

  visitAstInSourceOrder(ast, node => {
    if (node.type !== 'STRING' || typeof node.value !== 'string') {
      return;
    }

    const tokenIndex = stringTokens.findIndex((candidate, offset) => {
      if (offset < stringCursor.value) {
        return false;
      }
      return candidate.image.slice(1, -1) === node.value;
    });

    if (tokenIndex === -1) {
      return;
    }

    stringCursor.value = tokenIndex + 1;
    const range = getTokenRange(stringTokens[tokenIndex]);
    if (range) {
      stringNodeRanges.set(node, range);
    }
  });

  return stringNodeRanges;
}

function getBudgetCategoryBadgeRange({
  value,
  range,
  categoryBadges,
}: {
  value: string;
  range: FormulaRange;
  categoryBadges?: Record<string, string>;
}) {
  const categories = value
    .split(',')
    .map(categoryId => categoryId.trim())
    .filter(Boolean)
    .map(categoryId => ({
      id: categoryId,
      label: categoryBadges?.[categoryId] ?? categoryId,
    }));

  if (categories.length === 0) {
    return null;
  }

  return {
    ...range,
    label: categories.map(category => category.label).join(', '),
    variant: 'budget-category-list' as const,
    categories,
  };
}

function getStringContextBadgeRangesFromAst({
  ast,
  stringTokens,
  queries,
  categoryBadges,
}: {
  ast: FormulaAst;
  stringTokens: Token[];
  queries?: Record<string, unknown>;
  categoryBadges?: Record<string, string>;
}) {
  const queryNames = new Set(Object.keys(queries ?? {}));
  const stringNodeRanges = getStringNodeRanges(ast, stringTokens);
  const badgeRanges: FormulaBadgeRange[] = [];

  visitAstInSourceOrder(ast, node => {
    if (node.type !== 'FUNCTION_CALL') {
      return;
    }

    const procedureName = node.procedureName;
    const args = Array.isArray(node.args) ? (node.args as FormulaAst[]) : [];
    if (typeof procedureName !== 'string') {
      return;
    }

    if (queryNameFunctions.has(procedureName)) {
      const firstArg = args[0];
      if (firstArg?.type !== 'STRING' || typeof firstArg.value !== 'string') {
        return;
      }
      if (!queryNames.has(firstArg.value)) {
        return;
      }

      const range = stringNodeRanges.get(firstArg);
      if (range) {
        badgeRanges.push({
          ...range,
          label: firstArg.value,
          variant: 'query-name',
        });
      }
      return;
    }

    if (procedureName !== 'BUDGET_QUERY') {
      return;
    }

    const [dimensionArg, categoriesArg, startArg, endArg] = args;
    if (
      dimensionArg?.type === 'STRING' &&
      typeof dimensionArg.value === 'string' &&
      budgetDimensions.has(dimensionArg.value)
    ) {
      const range = stringNodeRanges.get(dimensionArg);
      if (range) {
        badgeRanges.push({
          ...range,
          label: dimensionArg.value,
          variant: 'budget-dimension',
        });
      }
    }

    if (categoriesArg) {
      visitStringArgsInSourceOrder(categoriesArg, categoryArg => {
        if (typeof categoryArg.value !== 'string') {
          return;
        }

        const range = stringNodeRanges.get(categoryArg);
        if (range) {
          const categoryRange = getBudgetCategoryBadgeRange({
            value: categoryArg.value,
            range,
            categoryBadges,
          });
          if (categoryRange) {
            badgeRanges.push(categoryRange);
          }
        }
      });
    }

    [startArg, endArg].forEach(timeframeArg => {
      if (
        timeframeArg?.type !== 'STRING' ||
        typeof timeframeArg.value !== 'string' ||
        !isBudgetTimeframe(timeframeArg.value)
      ) {
        return;
      }

      const range = stringNodeRanges.get(timeframeArg);
      if (range) {
        badgeRanges.push({
          ...range,
          label: timeframeArg.value,
          variant: 'budget-timeframe',
        });
      }
    });
  });

  return badgeRanges;
}

function getBadgeRangesFromNamedExpressionTokens({
  namedExpressionTokens,
  namedExpressionBadges,
}: {
  namedExpressionTokens: Token[];
  namedExpressionBadges: Record<string, string>;
}) {
  return namedExpressionTokens.flatMap(token => {
    return getBadgeRangesFromNamedExpressionToken({
      token,
      namedExpressionBadges,
    });
  });
}

function getBadgeRangesFromAst({
  ast,
  namedExpressionTokens,
  namedExpressionBadges,
}: {
  ast: FormulaAst;
  namedExpressionTokens: Token[];
  namedExpressionBadges: Record<string, string>;
}) {
  const namedExpressionCursor = { value: 0 };
  const badgeRanges: FormulaBadgeRange[] = [];

  visitAstInSourceOrder(ast, node => {
    if (
      node.type !== 'NAMED_EXPRESSION' ||
      typeof node.expressionName !== 'string'
    ) {
      return;
    }

    const token = findNextToken(
      namedExpressionTokens,
      namedExpressionCursor,
      node.expressionName,
    );
    if (!token) {
      return;
    }

    badgeRanges.push(
      ...getBadgeRangesFromNamedExpressionToken({
        token,
        namedExpressionBadges,
      }),
    );
  });

  return badgeRanges;
}

function getNamedExpressionBadges({
  mode,
  variables,
}: {
  mode: FormulaMode;
  variables?: Record<string, number | string>;
}) {
  return {
    ...(mode === 'transaction' ? transactionNamedExpressionBadges : {}),
    ...Object.fromEntries(
      Object.keys(variables ?? {}).map(name => [name, name]),
    ),
  };
}

function doRangesOverlap(
  firstRange: { from: number; to: number },
  secondRange: { from: number; to: number },
) {
  return firstRange.from < secondRange.to && secondRange.from < firstRange.to;
}

function findSourceTextRanges(source: string, sourceText: string) {
  const ranges: FormulaRange[] = [];
  if (sourceText.length === 0) {
    return ranges;
  }

  let from = source.indexOf(sourceText);

  while (from !== -1) {
    ranges.push({ from, to: from + sourceText.length });
    from = source.indexOf(sourceText, from + 1);
  }

  return ranges;
}

export function cacheFormulaBadgeRanges(
  formula: string,
  ranges: FormulaBadgeRange[],
): CachedFormulaBadgeRange[] {
  return ranges
    .map(range => ({
      ...range,
      sourceText: formula.slice(range.from, range.to),
    }))
    .filter(range => range.sourceText.length > 0);
}

export function remapCachedFormulaBadgeRanges({
  formula,
  cachedRanges,
  blockedRanges = [],
}: {
  formula: string;
  cachedRanges: CachedFormulaBadgeRange[];
  blockedRanges?: Array<{ from: number; to: number }>;
}): FormulaBadgeRange[] {
  const usedRanges = [...blockedRanges];

  return cachedRanges.flatMap(({ sourceText, ...range }) => {
    const match = findSourceTextRanges(formula, sourceText)
      .filter(candidate => {
        return !usedRanges.some(usedRange =>
          doRangesOverlap(candidate, usedRange),
        );
      })
      .sort((a, b) => {
        return (
          Math.abs(a.from - range.from) - Math.abs(b.from - range.from) ||
          a.from - b.from
        );
      })[0];

    if (!match) {
      return [];
    }

    usedRanges.push(match);
    return [{ ...range, ...match }];
  });
}

export function getFormulaBadgeRangeResult({
  formula,
  mode,
  variables,
  queries,
  categoryBadges,
}: {
  formula: string;
  mode: FormulaMode;
  variables?: Record<string, number | string>;
  queries?: Record<string, unknown>;
  categoryBadges?: Record<string, string>;
}): FormulaBadgeRangeResult {
  if (!formula.startsWith('=')) {
    return { ranges: [], status: 'inactive' };
  }

  const namedExpressionBadges = getNamedExpressionBadges({ mode, variables });
  if (mode !== 'query' && Object.keys(namedExpressionBadges).length === 0) {
    return { ranges: [], status: 'ok' };
  }

  try {
    const parser = getParserInstance();
    const parsed = parser.extractTemporaryFormula(formula);
    const ast = parsed.ast;
    const tokenizeResult = parser._parser?.tokenizeFormula(formula.slice(1));

    if (
      !tokenizeResult ||
      (tokenizeResult.errors && tokenizeResult.errors.length > 0)
    ) {
      return { ranges: [], status: 'failed' };
    }

    const namedExpressionTokens = tokenizeResult.tokens.filter(
      token => token.tokenType?.name === 'NamedExpression',
    );
    const stringTokens = tokenizeResult.tokens.filter(
      token => token.tokenType?.name === 'StringLiteral',
    );

    if (!ast) {
      return {
        ranges: getBadgeRangesFromNamedExpressionTokens({
          namedExpressionTokens,
          namedExpressionBadges,
        }),
        status: 'partial',
      };
    }

    return {
      ranges: getBadgeRangesFromAst({
        ast,
        namedExpressionTokens,
        namedExpressionBadges,
      }).concat(
        getStringContextBadgeRangesFromAst({
          ast,
          stringTokens,
          queries,
          categoryBadges,
        }),
      ),
      status: 'ok',
    };
  } catch {
    return { ranges: [], status: 'failed' };
  }
}

export function getFormulaBadgeRanges({
  formula,
  mode,
  variables,
  queries,
  categoryBadges,
}: {
  formula: string;
  mode: FormulaMode;
  variables?: Record<string, number | string>;
  queries?: Record<string, unknown>;
  categoryBadges?: Record<string, string>;
}): FormulaBadgeRange[] {
  return getFormulaBadgeRangeResult({
    formula,
    mode,
    variables,
    queries,
    categoryBadges,
  }).ranges;
}

export function __resetFormulaBadgeParserForTests() {
  parserInstance?.destroy();
  parserInstance = null;
}
