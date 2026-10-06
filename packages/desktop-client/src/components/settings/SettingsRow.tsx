import type { ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

type SettingsRowProps = {
  title: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  htmlFor?: string;
  children?: ReactNode;
};

export function SettingsRow({
  title,
  description,
  control,
  htmlFor,
  children,
}: SettingsRowProps) {
  const titleStyle = { ...styles.smallText, fontWeight: 500 };

  return (
    <View
      style={{
        flexShrink: 0,
        gap: spacing.md,
        padding: `${spacing.md}px ${spacing.lg}px`,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: `${spacing.sm}px ${spacing.lg}px`,
        }}
      >
        <View style={{ flex: '1 1 160px', minWidth: 0, gap: spacing.xxs }}>
          {htmlFor != null ? (
            <label htmlFor={htmlFor} style={titleStyle}>
              {title}
            </label>
          ) : (
            <Text style={titleStyle}>{title}</Text>
          )}
          {description && (
            <Text
              style={{
                ...styles.smallText,
                lineHeight: 1.5,
                color: theme.settingsCardTextSubdued,
              }}
            >
              {description}
            </Text>
          )}
        </View>
        {control != null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 0,
              maxWidth: '100%',
            }}
          >
            {control}
          </View>
        )}
      </View>
      {children}
    </View>
  );
}
