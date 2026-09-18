import type { TFunction } from 'i18next';

import type {
  MonteCarloRuleExplanation,
  MonteCarloRunDetailRow,
  MonteCarloWithdrawalRuleConfig,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';

/**
 * Enough precision that multiplying the displayed rate by the balance
 * reproduces the displayed amounts; trailing zeros trimmed so simple
 * rates still read cleanly (4% rather than 4.0000%)
 */
export function formatRuleRate(rate: number) {
  return `${Number((rate * 100).toFixed(4))}%`;
}

type MonteCarloYearStoryInput = {
  row: MonteCarloRunDetailRow;
  withdrawalRule: MonteCarloWithdrawalRuleConfig;
  /** How the surplus pot is labelled in the UI */
  surplusPotName: string;
  hasSurplusPot: boolean;
  format: (amount: number, type: 'financial') => string;
  translate: TFunction;
};

/**
 * The plain-English summary of one simulated year, as a few sentences
 * that follow cause to effect: what the withdrawal rule decided and why,
 * whether the minimum withdrawal stepped in, how the year's spending was
 * funded, and where any money the plan didn't spend ended up. The
 * numbers behind each decision live in the detailed lines, not here
 */
export function buildMonteCarloYearStory({
  row,
  withdrawalRule,
  surplusPotName,
  hasSurplusPot,
  format,
  translate,
}: MonteCarloYearStoryInput): string[] {
  const sentences: string[] = [];

  const ruleSentence =
    row.ruleExplanation != null
      ? getRuleDecisionSentence(
          row.ruleExplanation,
          withdrawalRule,
          format,
          translate,
        )
      : null;
  if (ruleSentence != null) {
    sentences.push(ruleSentence);
  }

  if (row.minimumApplied) {
    const withdrawal = format(row.withdrawal, 'financial');
    sentences.push(
      ruleSentence != null
        ? translate(
            'The minimum withdrawal then lifted the withdrawal to {{withdrawal}}.',
            { withdrawal },
          )
        : translate(
            "The minimum withdrawal raised this year's withdrawal to {{withdrawal}}, above the {{planned}} planned.",
            { withdrawal, planned: format(row.plannedSpending, 'financial') },
          ),
    );
  }

  sentences.push(...getFundingSentences(row, hasSurplusPot, format, translate));

  const surplusSentence = getSurplusSentence(
    row,
    surplusPotName,
    hasSurplusPot,
    format,
    translate,
  );
  if (surplusSentence != null) {
    sentences.push(surplusSentence);
  }

  return sentences;
}

function getRuleName(
  rule: 'guardrails' | 'ratcheting' | 'boundaries',
  translate: TFunction,
) {
  if (rule === 'guardrails') {
    return translate('Guardrails');
  }
  if (rule === 'ratcheting') {
    return translate('Ratcheting');
  }
  return translate('Boundaries');
}

// What the rule decided, with the reason in words; null when the rule
// did nothing worth telling
function getRuleDecisionSentence(
  explanation: MonteCarloRuleExplanation,
  withdrawalRule: MonteCarloWithdrawalRuleConfig,
  format: MonteCarloYearStoryInput['format'],
  translate: TFunction,
): string | null {
  if (explanation.kind === 'anchor') {
    return translate(
      "This is the first spending year, so the plan's withdrawal rate was set here.",
    );
  }
  if (explanation.kind === 'floor-ceiling') {
    const values = {
      amount: format(
        explanation.applied === 'floor'
          ? explanation.floor
          : explanation.ceiling,
        'financial',
      ),
      unclamped: format(explanation.unclamped, 'financial'),
    };
    if (explanation.applied === 'floor') {
      return translate(
        'Floor & ceiling held spending at {{amount}} - the rate-based amount ({{unclamped}}) fell below the floor.',
        values,
      );
    }
    if (explanation.applied === 'ceiling') {
      return translate(
        'Floor & ceiling held spending at {{amount}} - the rate-based amount ({{unclamped}}) rose above the ceiling.',
        values,
      );
    }
    return null;
  }

  const rule = getRuleName(explanation.rule, translate);
  const planned = format(explanation.planned, 'financial');
  const adjusted = format(explanation.adjusted, 'financial');
  if (explanation.action === 'cut') {
    if (explanation.rule === 'boundaries') {
      return translate(
        "{{rule}} cut this year's spending from {{planned}} to {{adjusted}} because the withdrawal rate rose above {{upper}}.",
        {
          rule,
          planned,
          adjusted,
          upper: formatRuleRate(withdrawalRule.upperRateThreshold),
        },
      );
    }
    return translate(
      "{{rule}} cut this year's spending from {{planned}} to {{adjusted}} because the withdrawal rate had climbed too far above the plan.",
      { rule, planned, adjusted },
    );
  }
  if (explanation.action === 'raise') {
    if (explanation.rule === 'boundaries') {
      return translate(
        "{{rule}} raised this year's spending from {{planned}} to {{adjusted}} because the withdrawal rate fell below {{lower}}.",
        {
          rule,
          planned,
          adjusted,
          lower: formatRuleRate(withdrawalRule.lowerRateThreshold),
        },
      );
    }
    if (explanation.rule === 'ratcheting') {
      return translate(
        "{{rule}} raised this year's spending from {{planned}} to {{adjusted}} because the balance had stayed above {{multiple}} its starting level for {{years}} years.",
        {
          rule,
          planned,
          adjusted,
          multiple: `${Number(withdrawalRule.balanceThresholdMultiple.toFixed(2))}×`,
          years: withdrawalRule.consecutiveYears,
        },
      );
    }
    return translate(
      "{{rule}} raised this year's spending from {{planned}} to {{adjusted}} because the withdrawal rate had fallen well below the plan.",
      { rule, planned, adjusted },
    );
  }
  if (explanation.factor !== 1) {
    return translate(
      "Earlier {{rule}} changes still applied, so this year's spending was {{adjusted}} instead of the {{planned}} planned.",
      { rule, planned, adjusted },
    );
  }
  return null;
}

// How the year's spending was paid for, or that it couldn't be
function getFundingSentences(
  row: MonteCarloRunDetailRow,
  hasSurplusPot: boolean,
  format: MonteCarloYearStoryInput['format'],
  translate: TFunction,
): string[] {
  const spent = format(row.spent, 'financial');
  if (row.spent < row.plannedSpending) {
    const sentences = [
      translate(
        'Only {{spent}} of the {{planned}} planned could be funded - the plan ran out of accessible money here.',
        { spent, planned: format(row.plannedSpending, 'financial') },
      ),
    ];
    if (row.inaccessibleBalance != null) {
      sentences.push(
        translate(
          '{{amount}} was still locked in pots that had not reached their access age.',
          { amount: format(row.inaccessibleBalance, 'financial') },
        ),
      );
    }
    return sentences;
  }
  if (row.income > 0) {
    // What the pots put towards spending: the withdrawal net of tax and
    // of anything the minimum floor forced out that went to the surplus pot
    const overshootSaved = Math.max(0, row.surplusSaved - row.unspentIncome);
    const netFromPots = row.withdrawal - row.taxPaid - overshootSaved;
    if (netFromPots <= 0) {
      return [
        translate(
          'Income covered all of the {{spent}} spent, so nothing had to come from the pots.',
          { spent },
        ),
      ];
    }
    const fromIncome = row.spent - netFromPots;
    // Net income that neither went to spending nor was left over was
    // paid into pots by contributions sourced from the income
    const netIncome = row.income - row.incomeTax;
    const toContributions = netIncome - row.unspentIncome - fromIncome;
    if (fromIncome <= 0) {
      return [
        translate(
          'The {{netIncome}} income all went into contributions, so the {{spent}} spent came from the pots.',
          { netIncome: format(netIncome, 'financial'), spent },
        ),
      ];
    }
    if (toContributions > 0) {
      return [
        translate(
          'Income covered {{fromIncome}} of the {{spent}} spent, with another {{toContributions}} of it going into contributions; withdrawals covered the rest.',
          {
            fromIncome: format(fromIncome, 'financial'),
            toContributions: format(toContributions, 'financial'),
            spent,
          },
        ),
      ];
    }
    return [
      translate(
        'Income covered {{fromIncome}} of the {{spent}} spent; withdrawals covered the rest.',
        { fromIncome: format(fromIncome, 'financial'), spent },
      ),
    ];
  }
  if (row.spent > row.plannedSpending && !hasSurplusPot) {
    return [
      translate(
        'Spent {{spent}} from the pots - {{extra}} above the plan, because of the minimum withdrawal.',
        { spent, extra: format(row.spent - row.plannedSpending, 'financial') },
      ),
    ];
  }
  return [
    translate('Spent {{spent}} as planned, funded from the pots.', { spent }),
  ];
}

// Where money the plan didn't spend ended up; null when there was none
function getSurplusSentence(
  row: MonteCarloRunDetailRow,
  surplusPotName: string,
  hasSurplusPot: boolean,
  format: MonteCarloYearStoryInput['format'],
  translate: TFunction,
): string | null {
  if (hasSurplusPot && row.surplusSaved > 0) {
    const overshoot = row.surplusSaved - row.unspentIncome;
    const values = {
      pot: surplusPotName,
      unspent: format(row.unspentIncome, 'financial'),
      overshoot: format(overshoot, 'financial'),
    };
    if (row.unspentIncome > 0 && overshoot > 0) {
      return translate(
        '{{unspent}} of income beyond the plan and the {{overshoot}} the minimum withdrawal took out above it were saved into {{pot}}.',
        values,
      );
    }
    if (overshoot > 0) {
      return translate(
        'The {{overshoot}} above the plan was saved into {{pot}}.',
        values,
      );
    }
    return translate(
      '{{unspent}} of income beyond the plan was saved into {{pot}}.',
      values,
    );
  }
  if (row.unspentIncome > 0) {
    return translate(
      '{{unspent}} of income beyond the plan went unspent and left the plan.',
      { unspent: format(row.unspentIncome, 'financial') },
    );
  }
  return null;
}
