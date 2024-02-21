import React from 'react';

import { styles } from '../../../style';
import { Block } from '../../common/Block';
import { ButtonLink } from '../../common/ButtonLink';
import { View } from '../../common/View';

export function CustomReportCard() {
  return (
    <View
      style={{
        flexDirection: 'row',
        margin: 15,
      }}
    >
      <ButtonLink to="/reports/custom">
        <View style={{ flex: 1 }}>
          <Block
            style={{ ...styles.mediumText, fontWeight: 500, padding: 10 }}
            role="heading"
          >
            Create new custom report
          </Block>
        </View>
      </ButtonLink>
    </View>
  );
}
