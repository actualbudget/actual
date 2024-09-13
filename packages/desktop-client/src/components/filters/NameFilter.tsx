import React, { useRef, useEffect } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { FormField, FormLabel } from '../forms';

export function NameFilter({
  menuItem,
  name,
  setName,
  adding,
  onAddUpdate,
  err,
}: {
  menuItem: string;
  name: string;
  setName: (item: string) => void;
  adding: boolean;
  onAddUpdate: () => void;
  err: string | null;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      {menuItem !== 'update-filter' && (
        <Form
          onSubmit={e => {
            e.preventDefault();
            onAddUpdate();
          }}
        >
          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ padding: 10 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title={t('Filter Name')}
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <Input
                id="name-field"
                inputRef={inputRef}
                defaultValue={name || ''}
                onChangeValue={setName}
              />
            </FormField>
            <Button variant="primary" type="submit" style={{ marginTop: 18 }}>
              {adding ? t('Add') : t('Update')}
            </Button>
          </Stack>
        </Form>
      )}
      {err && (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      )}
    </>
  );
}
