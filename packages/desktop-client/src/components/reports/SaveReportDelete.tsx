import React from 'react';
import { Trans } from 'react-i18next';

import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { type TransObjectLiteral } from 'loot-core/types/util';

import { theme } from '../../style/theme';
import { Button } from '../common/Button2';

type SaveReportDeleteProps = {
  onDelete: () => void;
  onClose: () => void;
  name: string;
};

export function SaveReportDelete({
  onDelete,
  onClose,
  name,
}: SaveReportDeleteProps) {
  return (
    <>
      <View style={{ align: 'center' }}>
        <Text style={{ color: theme.errorText, marginBottom: 5 }}>
          <Trans>
            Are you sure you want to delete the report named{' ‘'}
            <Text style={{ display: 'inline' }}>
              {{ name } as TransObjectLiteral}
            </Text>
            ’?
          </Trans>
        </Text>
      </View>

      <Stack
        direction="row"
        justify="flex-end"
        align="center"
        style={{ marginTop: 15 }}
      >
        <View style={{ flex: 1 }} />
        <Button variant="primary" autoFocus onPress={onDelete}>
          <Trans>Yes</Trans>
        </Button>
        <Button variant="primary" onPress={onClose}>
          <Trans>No</Trans>
        </Button>
      </Stack>
    </>
  );
}
