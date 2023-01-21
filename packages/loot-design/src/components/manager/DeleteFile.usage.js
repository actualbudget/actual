import React from 'react';

import DeleteFile from './DeleteFile';
import { Section, TestModal } from '../../guide/components';
import { colors } from '../../style';

export default () => (
  <Section>
    Budget List Modal
    <TestModal backgroundColor={colors.n10}>
      {node => (
        <DeleteFile
          modalProps={{ isCurrent: true, parent: node }}
          file={{
            name: 'Finances 2',
            id: 'msdfmsdf',
            cloudFileId: 'vxsfeqw',
            state: 'synced'
          }}
          actions={{}}
        />
      )}
    </TestModal>
  </Section>
);
