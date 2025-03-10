import React, { createRef, useEffect, useState } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { GenericInput } from '../util/GenericInput';

type SaveReportChooseProps = {
  onApply: (cond: string) => void;
};

export function SaveReportChoose({ onApply }: SaveReportChooseProps) {
  const inputRef = createRef<HTMLInputElement>();
  const [err, setErr] = useState('');
  const [value, setValue] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  });

  return (
    <>
      <Form
        onSubmit={e => {
          e.preventDefault();

          if (!value) {
            setErr('Invalid report entered');
            return;
          }

          onApply(value);
        }}
      >
        <View style={{ flexDirection: 'row', align: 'center' }}>
          <Text style={{ userSelect: 'none', flex: 1 }}>
            {t('Choose Report')}
          </Text>
          <View style={{ flex: 1 }} />
        </View>
        <GenericInput
          inputRef={inputRef}
          field="report"
          subfield={null}
          type="saved"
          value={value}
          multi={false}
          style={{ marginTop: 10 }}
          onChange={(v: string) => setValue(v)}
        />

        <Stack
          direction="row"
          justify="flex-end"
          align="center"
          style={{ marginTop: 15 }}
        >
          <View style={{ flex: 1 }} />
          <Button variant="primary" type="submit">
            {t('Apply')}
          </Button>
        </Stack>
      </Form>
      {err !== '' ? (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      ) : (
        <View />
      )}
    </>
  );
}
