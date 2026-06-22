import type { RuleConditionEntity } from '@actual-app/core/types/models';

export const setSessionReport = (
  propName: string,
  propValue: string | boolean | RuleConditionEntity[],
) => {
  const storedReport: Record<string, unknown> = sessionStorage.report
    ? (JSON.parse(sessionStorage.getItem('report') || '') as Record<
        string,
        unknown
      >)
    : {};
  const result: Record<string, string | boolean | RuleConditionEntity[]> = {};
  result[propName] = propValue;
  sessionStorage.setItem(
    'report',
    JSON.stringify({
      ...storedReport,
      ...result,
    }),
  );
};
