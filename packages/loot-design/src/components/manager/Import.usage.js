import React from 'react';

import Import from './Import';
import { Section, TestModal } from '../../guide/components';
import { colors } from '../../style';

export default () => (
  <Section>
    Import
    <TestModal backgroundColor={colors.n1}>
      {node => (
        <Import
          modalProps={{ isCurrent: true, parent: node }}
          availableImports={[]}
          actions={{ getYNAB4Imports: () => [] }}
        />
      )}
    </TestModal>
  </Section>
);
