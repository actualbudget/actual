import React from 'react';

import { Text } from '@actual-app/components/text';

import { theme } from '../../../style';

type SubLabelProps = {
  title: string;
};

export function SubLabel({ title }: SubLabelProps) {
  return (
    <Text style={{ fontSize: 13, marginBottom: 3, color: theme.pageText }}>
      {title}
    </Text>
  );
}
