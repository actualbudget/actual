import React from 'react';

import { theme } from '../../style/theme';
import { Button } from '../common/Button';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';

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
          Do you want to delete report:
        </Text>
        <View>{name}</View>
      </View>

      <Stack
        direction="row"
        justify="flex-end"
        align="center"
        style={{ marginTop: 15 }}
      >
        <View style={{ flex: 1 }} />
        <Button type="primary" onClick={onDelete}>
          Yes
        </Button>
        <Button type="primary" onClick={onClose}>
          No
        </Button>
      </Stack>
    </>
  );
}
