import React, { useRef, useEffect } from 'react';

import { theme } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { MenuTooltip } from '../common/MenuTooltip';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { FormField, FormLabel } from '../forms';

export function NameFilter({
  onClose,
  menuItem,
  name,
  setName,
  adding,
  onAddUpdate,
  err,
}: {
  onClose: () => void;
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
    <MenuTooltip width={325} onClose={onClose}>
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
                onUpdate={setName}
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
    </MenuTooltip>
  );
}
