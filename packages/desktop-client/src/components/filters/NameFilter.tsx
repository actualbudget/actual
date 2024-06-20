import React, { useRef, useEffect } from 'react';

import { theme } from '../../style';
import { Button } from '../common/Button';
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      {menuItem !== 'update-filter' && (
        <form>
          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ padding: 10 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title="Filter Name"
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
            <Button
              type="primary"
              style={{ marginTop: 18 }}
              onClick={e => {
                e.preventDefault();
                onAddUpdate();
              }}
            >
              {adding ? 'Add' : 'Update'}
            </Button>
          </Stack>
        </form>
      )}
      {err && (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      )}
    </>
  );
}
