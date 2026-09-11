// Rule formulas used to receive `amount`, `balance`, `parent_amount` and
// BALANCE_OF("…") as integers while returning an amount. They now receive
// amounts on both sides, so rewrite stored formulas to keep their results
// unchanged: `=amount / 100` becomes `=(amount * 100) / 100`.
//
// Everything below is a snapshot of how formulas worked when this migration
// was written, and must stay that way — the variable names and the factor of
// 100 describe the past, not the current evaluator. Don't wire them up to the
// live constants.

const CENTS_VARIABLES = new Set(['amount', 'balance', 'parent_amount']);
const CENTS_MULTIPLIER = 100;

const BALANCE_OF_CALL_RE = /^BALANCE_OF\s*\(\s*"(?:[^"\\]|\\.)*"\s*\)/i;
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*/;

/**
 * Rewrite one formula so it produces what it used to when its variables
 * arrived as integers. Not idempotent — running it twice multiplies twice.
 */
export function convertRuleFormulaCentsToAmounts(formula) {
  if (!formula.startsWith('=')) {
    return formula;
  }

  let out = '';
  let i = 0;

  while (i < formula.length) {
    // String literals are copied through untouched, so an account named
    // "amount" is never mistaken for the variable.
    if (formula[i] === '"') {
      let j = i + 1;
      while (j < formula.length && formula[j] !== '"') {
        j += formula[j] === '\\' ? 2 : 1;
      }
      // Include the closing quote, or run to the end if there isn't one.
      const end = Math.min(j + 1, formula.length);
      out += formula.slice(i, end);
      i = end;
      continue;
    }

    const rest = formula.slice(i);

    // BALANCE_OF("…") is the only form the prefetcher resolves; any other form
    // evaluates to 0, which means the same thing in either unit.
    const balanceOfCall = BALANCE_OF_CALL_RE.exec(rest);
    if (balanceOfCall) {
      out += `(${balanceOfCall[0]} * ${CENTS_MULTIPLIER})`;
      i += balanceOfCall[0].length;
      continue;
    }

    // Identifiers are consumed whole, so `amount` is never matched inside
    // `parent_amount` and `balance` is never matched inside `BALANCE_OF`.
    const identifier = IDENTIFIER_RE.exec(rest);
    if (identifier) {
      const name = identifier[0];
      const isFunctionCall = /^\s*\(/.test(rest.slice(name.length));
      out +=
        !isFunctionCall && CENTS_VARIABLES.has(name.toLowerCase())
          ? `(${name} * ${CENTS_MULTIPLIER})`
          : name;
      i += name.length;
      continue;
    }

    out += formula[i];
    i++;
  }

  return out;
}
export default async function runMigration(db) {
  const rules = db.runQuery(
    'SELECT id, actions FROM rules WHERE actions IS NOT NULL',
    [],
    true,
  );

  db.transaction(() => {
    for (const rule of rules) {
      let actions;
      try {
        actions = JSON.parse(rule.actions);
      } catch {
        // A rule we can't parse is a rule we can't convert. Leave it alone
        // rather than failing the whole migration.
        continue;
      }

      if (!Array.isArray(actions)) {
        continue;
      }

      let changed = false;
      for (const action of actions) {
        const formula = action?.options?.formula;
        if (typeof formula !== 'string') {
          continue;
        }

        const converted = convertRuleFormulaCentsToAmounts(formula);
        if (converted !== formula) {
          action.options.formula = converted;
          changed = true;
        }
      }

      if (changed) {
        db.runQuery('UPDATE rules SET actions = ? WHERE id = ?', [
          JSON.stringify(actions),
          rule.id,
        ]);
      }
    }
  });
}
