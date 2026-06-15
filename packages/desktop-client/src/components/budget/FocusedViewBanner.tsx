import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type FocusedViewBannerProps = {
  onViewAll: () => void;
};

export function FocusedViewBanner({ onViewAll }: FocusedViewBannerProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        padding: '15px 0',
        marginTop: 10,
        borderTop: `1px solid ${theme.tableBorder}`,
        color: theme.pageTextLight,
        flexDirection: 'row',
        justifyContent: 'center',
      }}
    >
      <Text style={{ marginRight: 10 }}>
        <Trans>Some categories are hidden by your current view.</Trans>
      </Text>
      <Button
        variant="bare"
        onPress={onViewAll}
        style={{ color: theme.buttonPrimaryBackground }}
      >
        <Trans>View all</Trans>
      </Button>
    </View>
  );
}
