// @ts-strict-ignore
import { amountToInteger } from '../../../shared/util';

export async function goalsSimple(template, limit) {
  // simple has 'monthly' and/or 'limit' params
  let increment = 0;
  if (template.monthly != null) {
    const monthly = amountToInteger(template.monthly);
    increment = monthly;
  } else {
    increment = limit;
  }
  return { increment };
}
