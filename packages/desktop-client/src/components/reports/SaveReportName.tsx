import React, { useEffect } from 'react';

import { theme } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { MenuTooltip } from '../common/MenuTooltip';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { FormField, FormLabel } from '../forms';

type SaveReportNameProps = {
  onClose: () => void;
  menuItem: string;
  onNameChange;
  inputRef;
  onAddUpdate: () => void;
  err;
};

export function SaveReportName({
  onClose,
  menuItem,
  onNameChange,
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
            style={{ padding: 10 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title="Filter Name"
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <Input inputRef={inputRef} onUpdate={e => onNameChange(e)} />
            </FormField>
            <Button
              type="primary"
              style={{ marginTop: 18 }}
              onClick={e => {
                e.preventDefault();
                onAddUpdate();
              }}
            >
              {menuItem === 'save-report' ? 'Add' : 'Update'}
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
