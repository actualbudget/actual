import type { Template } from '#types/models/templates';

import * as monthUtils from './months';

// A one-off `by` or `spend` target stops applying after its month. Repeating
// targets roll forward instead, so they never expire.
export function isTemplateExpired(template: Template, month: string): boolean {
  return (
    (template.type === 'by' || template.type === 'spend') &&
    !template.repeat &&
    !template.annual &&
    monthUtils.differenceInCalendarMonths(`${template.month}`, month) < 0
  );
}
