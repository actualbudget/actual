import React, { createRef, useEffect, useState } from 'react';

import { theme } from '../../style/theme';
import { Button } from '../common/Button';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';
import { GenericInput } from '../util/GenericInput';

type SaveReportChooseProps = {
  onApply: (cond: string) => void;
  onClose: () => void;
};

export function SaveReportChoose({ onApply, onClose }: SaveReportChooseProps) {
  const inputRef = createRef<HTMLInputElement>();
  const [err, setErr] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Tooltip
      position="bottom-right"
      style={{ padding: 15, color: theme.menuItemText }}
      width={275}
      onClose={onClose}
    >
      <form>
        <View style={{ flexDirection: 'row', align: 'center' }}>
          <Text style={{ userSelect: 'none', flex: 1 }}>Choose Report</Text>
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
          <Button
            type="primary"
            onClick={e => {
              e.preventDefault();
              if (!value) {
                setErr('Invalid report entered');
                return;
              }

              onApply(value);
            }}
          >
            Apply
          </Button>
        </Stack>
      </form>
      {err !== '' ? (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      ) : (
        <View />
      )}
    </Tooltip>
  );
}
