import React from 'react';

import { Section, TestModal } from '../../guide/components';

import CreateLocalAccount from './CreateLocalAccount';

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
