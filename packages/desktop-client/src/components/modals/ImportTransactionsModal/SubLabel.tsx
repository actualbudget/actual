import React from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

type SubLabelProps = {
  title: string;
};

export function SubLabel({ title }: SubLabelProps) {
  return (
    <Text size="medium" style={{ marginBottom: 3, color: theme.pageText }}>
      {title}
    </Text>
  );
}
