import React, { useEffect } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function FeatureErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof Error ? error.message : undefined;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text style={{ ...styles.mediumText, color: theme.errorText }}>
        <Trans>Something went wrong loading this section.</Trans>
      </Text>
      {message && (
        <Text
          style={{
            ...styles.smallText,
            fontFamily: 'monospace',
            color: theme.errorText,
            marginTop: 10,
            maxWidth: 600,
            textAlign: 'center',
            userSelect: 'text',
          }}
        >
          {message}
        </Text>
      )}
      <Button onPress={resetErrorBoundary} style={{ marginTop: 15 }}>
        <Trans>Try again</Trans>
      </Button>
    </View>
  );
}
