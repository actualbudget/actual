import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';

export const sectionLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
} satisfies CSSProperties;

export const groupLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: theme.sidebarTextSubdued,
} satisfies CSSProperties;

export const dropZoneStyle = {
  backgroundColor: theme.sidebarItemBackgroundHover,
  boxShadow: `inset 0 0 0 1px ${theme.sidebarItemAccentSelected}`,
  borderRadius: radius.sm,
} satisfies CSSProperties;
