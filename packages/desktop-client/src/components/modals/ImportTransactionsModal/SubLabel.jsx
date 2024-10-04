import React from 'react';

import { theme } from '../../../style';
import { Text } from '../../common/Text';

export function SubLabel({ title }) {
  return (
    <Text style={{ fontSize: 13, marginBottom: 3, color: theme.pageText }}>
      {title}
    </Text>
  );
}
