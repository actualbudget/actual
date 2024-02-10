import React, { type RefObject, useEffect } from 'react';

import { theme } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { MenuTooltip } from '../common/MenuTooltip';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type SaveReportNameProps = {
  onClose: () => void;
  menuItem: string;
  name: string;
  setName: (name: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  onAddUpdate: (menuItem: string) => void;
  err: string;
};

export function SaveReportName({
  onClose,
  menuItem,
  name,
  setName,
  inputRef,
  onAddUpdate,
  err,
}: SaveReportNameProps) {
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <MenuTooltip width={325} onClose={onClose}>
      {menuItem !== 'update-report' && (
        <form>
          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ padding: 15 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title="Report Name"
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <Input
                value={name}
                id="name-field"
                inputRef={inputRef}
                onUpdate={setName}
                style={{ marginTop: 10 }}
              />
            </FormField>
            <Button
              type="primary"
              style={{ marginTop: 30 }}
              onClick={e => {
                e.preventDefault();
                onAddUpdate(menuItem);
              }}
            >
              {menuItem === 'save-report' ? 'Add' : 'Update'}
            </Button>
          </Stack>
        </form>
      )}
      {err !== '' ? (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      ) : (
        <View />
      )}
    </MenuTooltip>
  );
}
