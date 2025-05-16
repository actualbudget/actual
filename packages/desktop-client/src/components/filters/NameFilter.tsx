import React, { useRef, useEffect } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { FormField, FormLabel } from '@desktop-client/components/forms';

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
                title={t('Filter name')}
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <Input
                id="name-field"
                ref={inputRef}
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
