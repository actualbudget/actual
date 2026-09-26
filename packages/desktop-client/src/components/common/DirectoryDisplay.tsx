import React from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type DirectoryDisplayProps = {
  directory: string;
};

/**
 * Shows a filesystem path in a scrollable, single-line box so long paths stay
 * readable without wrapping.
 */
export function DirectoryDisplay({ directory }: DirectoryDisplayProps) {
  return (
    <View style={{ flexDirection: 'row', gap: '0.5rem', width: '100%' }}>
      <Text
        title={directory}
        style={{
          backgroundColor: theme.pageBackground,
          padding: '5px 10px',
          borderRadius: 4,
          overflow: 'auto',
          whiteSpace: 'nowrap',
          width: '100%',
          ...styles.horizontalScrollbar,
          '::-webkit-scrollbar': {
            height: '8px',
          },
        }}
      >
        {directory}
      </Text>
    </View>
  );
}
