import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

export const sectionLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
} satisfies CSSProperties;

export const groupLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: theme.sidebarTextSubdued,
} satisfies CSSProperties;
