import React from 'react';

import LoadBackup from './LoadBackup';
import { Section, TestModal } from '../../guide/components';
import { colors } from '../../style';

const backups = [
  { date: 'December 23, 2017 4:08 PM', id: 'sdflkj23' },
  { date: 'January 21, 2018 4:20 PM', id: 'ds10dsm23rlk' },
  { date: 'February 22, 2018 3:54 PM', id: 'k3dsjndlwe' }
];

export default () => (
  <Section>
    Backup List Modal
    <TestModal backgroundColor={colors.sidebar}>
      {node => (
        <LoadBackup
          modalProps={{ isCurrent: true, parent: node }}
          backups={backups}
        />
      )}
    </TestModal>
  </Section>
);
