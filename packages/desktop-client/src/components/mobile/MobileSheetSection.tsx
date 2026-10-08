import { useId } from 'react';
import type { ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

type MobileSheetSectionProps = {
  title?: ReactNode;
  children: ReactNode;
};

export function MobileSheetSection({
  title,
  children,
}: MobileSheetSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      style={{
        paddingTop: title ? 0 : spacing.sm,
        paddingBottom: spacing.sm,
      }}
    >
      {title && (
        <View
          style={{
            padding: `${spacing.md}px ${spacing.lg}px ${spacing.xs}px`,
          }}
        >
          <Text
            id={titleId}
            style={{
              ...styles.smallText,
              fontWeight: 600,
              color: theme.pageTextLight,
            }}
          >
            {title}
          </Text>
        </View>
      )}
      {children}
    </section>
  );
}
