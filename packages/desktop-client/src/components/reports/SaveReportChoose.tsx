import React, { createRef, useState } from 'react';

import { theme } from '../../style/theme';
import { Button } from '../common/Button';
import { Stack } from '../common/Stack';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';
import { GenericInput } from '../util/GenericInput';

type SaveReportChooseProps = {
  onApply: (cond: string) => void;
  onClose: () => void;
};

export function SaveReportChoose({ onApply, onClose }: SaveReportChooseProps) {
  const inputRef = createRef<HTMLInputElement>();
  const [value, setValue] = useState('');

  return (
    <Tooltip
      position="bottom-right"
      style={{ padding: 15, color: theme.menuItemText }}
      width={275}
      onClose={onClose}
    >
      <View style={{ marginBottom: 10 }} />
      <form action="#">
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
              onApply(value);
            }}
          >
            Apply
          </Button>
        </Stack>
      </form>
    </Tooltip>
  );
}
