// Persisted shape stored on `categories.cleanup_def` (JSON array).
export type CleanupTemplate =
  | { role: 'source'; groupId: string | null }
  | { role: 'sink'; groupId: string | null; weight: number }
  | { role: 'overspend'; groupId: string };
