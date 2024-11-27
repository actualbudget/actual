export const displayTemplateTypes = [
  ['simple', 'Fixed (monthly)'] as const,
  ['week', 'Fixed (weekly)'] as const,
  ['schedule', 'Schedule'] as const,
  ['percentage', 'Percent of category'] as const,
  ['average', 'Average spending'] as const,
  ['copy', 'Copy past budget'] as const,
  ['remainder', 'Allocate remainder'] as const,
  ['goal', 'Set a goal'] as const,
];

export type DisplayTemplateType = (typeof displayTemplateTypes)[number][0];
