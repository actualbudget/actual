import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';

type CountPillProps = {
  count: number;
};

export function CountPill({ count }: CountPillProps) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: 600,
        paddingInline: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: theme.sidebarControlBackground,
        color: theme.sidebarTextMuted,
        flexShrink: 0,
      }}
    >
      {count}
    </Text>
  );
}
