import { type RuleConditionEntity } from 'loot-core/types/models';

export const setSessionReport = (
  propName: string,
  propValue: string | boolean | RuleConditionEntity[],
) => {
  const storedReport =
    sessionStorage.report && JSON.parse(sessionStorage.getItem('report') || '');
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
