import React from 'react';

import { theme } from '../../../style';
import { Text } from '../../common/Text';

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
