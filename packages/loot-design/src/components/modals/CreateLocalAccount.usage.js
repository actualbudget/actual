import React from 'react';

import CreateLocalAccount from './CreateLocalAccount';
import { Section, TestModal } from '../../guide/components';

export default () => (
  <Section>
    Create Account Modal
    <TestModal>
      {node => (
        <CreateLocalAccount modalProps={{ isCurrent: true, parent: node }} />
      )}
    </TestModal>
  </Section>
);
