import type { ComponentType, ReactNode, SVGProps } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type NavRowProps = {
  title: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
  /** Optional element rendered at the end of the row, e.g. a count pill. */
  trailing?: ReactNode;
  'data-testid'?: string;
};

export function NavRow({
  title,
  Icon,
  to,
  trailing,
  'data-testid': dataTestId,
}: NavRowProps) {
  return (
    <View style={{ flexShrink: 0 }} data-testid={dataTestId}>
      <Link
        variant="internal"
        to={to}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + spacing.xxs,
          padding: `${spacing.sm - 1}px ${spacing.md}px`,
          borderRadius: radius.sm + 2,
          marginBottom: 2,
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
          color: theme.sidebarItemText,
          ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
        }}
        activeStyle={{
          backgroundColor: theme.sidebarItemBackgroundSelected,
          color: theme.sidebarItemTextSelected,
          fontWeight: 600,
        }}
      >
        <Icon width={16} height={16} style={{ flexShrink: 0 }} />
        <Text style={{ ...styles.ellipsisText, flex: 1 }}>{title}</Text>
        {trailing}
      </Link>
    </View>
  );
}
