import React from 'react';

import { Section, TestModal } from '../../guide/components';
import { colors } from '../../style';

import Import from './Import';

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
