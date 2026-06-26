export type CleanupTemplate =
  | { role: 'source'; groupId: string | null }
  | { role: 'sink'; groupId: string | null; weight: number }
  | { role: 'overspend'; groupId: string };
