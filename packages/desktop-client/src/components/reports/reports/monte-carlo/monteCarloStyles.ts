import { theme } from '@actual-app/components/theme';

// Shared layout constants for the Monte Carlo configuration and results
// UI, so the visual language stays consistent across the report's files.

/** Small uppercase heading used for stat tiles, field groups and tables */
export const GROUP_HEADING_STYLE = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: theme.pageText,
} as const;

export const FIELD_STYLE = { width: 170 } as const;

export const FIELD_LABEL_STYLE = { fontWeight: 600 } as const;

export const FIELD_LABEL_ROW_STYLE = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
  minHeight: 18,
} as const;
