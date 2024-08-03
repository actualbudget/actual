import React, { type RefObject, useEffect } from 'react';

import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';

type SaveReportNameProps = {
  menuItem: string;
  name: string;
  setName: (name: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  onAddUpdate: ({
    menuChoice,
    reportData,
  }: {
    menuChoice?: string;
    reportData?: CustomReportEntity;
  }) => void;
  err: string;
  report?: CustomReportEntity;
};

export function SaveReportName({
  menuItem,
  name,
  setName,
  inputRef,
  onAddUpdate,
  err,
  report,
}: SaveReportNameProps) {
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
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
                onChangeValue={setName}
                style={{ marginTop: 10 }}
              />
            </FormField>
            <Button
              variant="primary"
              style={{ marginTop: 30 }}
              onPress={() => {
                onAddUpdate({
                  menuChoice: menuItem ?? undefined,
                  reportData: report ?? undefined,
                });
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
    </>
  );
}
