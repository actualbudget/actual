import type { CSSProperties, ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

type PageTitleProps = {
  title: ReactNode;
  /** One short sentence explaining what the page is for. */
  subtitle?: ReactNode;
  style?: CSSProperties;
};

/**
 * Page heading with an optional one-line description underneath. The
 * description is there for newcomers: it says what the page is for and what
 * the user can do on it.
 */
export function PageTitle({ title, subtitle, style }: PageTitleProps) {
  return (
    <View style={{ minWidth: 0, gap: 2, ...style }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          ...styles.pageTitle,
        }}
      >
        {typeof title === 'string' ? (
          <Text role="heading" aria-level={1} data-testid="page-title">
            {title}
          </Text>
        ) : (
          title
        )}
      </View>
      {subtitle && (
        <Text data-testid="page-subtitle" style={styles.pageSubtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
