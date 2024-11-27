export const visualTemplateTypes = [
  ['amount', 'an amount'] as const,
  ['percent', 'a percent'] as const,
  ['schedule', 'for a schedule'] as const,
];

export type VisualTemplateType = (typeof visualTemplateTypes)[number][0];
