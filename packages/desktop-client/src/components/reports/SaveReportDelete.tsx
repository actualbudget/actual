import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '../../style/theme';
import { Button } from '../common/Button2';
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
  const { t } = useTranslation();
  return (
    <>
      <View style={{ align: 'center' }}>
        <Text style={{ color: theme.errorText, marginBottom: 5 }}>
          {t('Are you sure you want to delete report:')}
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
        <Button variant="primary" autoFocus onPress={onDelete}>
          {t('Yes')}
        </Button>
        <Button variant="primary" onPress={onClose}>
          {t('No')}
        </Button>
      </Stack>
    </>
  );
}
