import type { RuleConditionEntity } from '@actual-app/core/types/models';
import * as v from 'valibot';

export const setSessionReport = (
  propName: string,
  propValue: string | boolean | RuleConditionEntity[],
) => {
  const storedReport: Record<string, unknown> = sessionStorage.report
    ? v.parse(
        v.record(v.string(), v.unknown()),
        JSON.parse(sessionStorage.getItem('report') || ''),
      )
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
