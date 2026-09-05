import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

export const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
} satisfies CSSProperties;

export const groupLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: theme.sidebarTextSubdued,
} satisfies CSSProperties;
