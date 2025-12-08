import React, { Suspense, lazy } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

const FormulaEditor = lazy(() =>
  import('@desktop-client/components/formula/FormulaEditor').then(module => ({
    default: module.FormulaEditor,
  })),
);

type FormulaActionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function FormulaActionEditor({
  value,
  onChange,
  disabled = false,
}: FormulaActionEditorProps) {
  // Enforce single-line: replace newlines with spaces
  const handleChange = (newValue: string) => {
    const singleLineValue = newValue.replace(/[\r\n]+/g, ' ');
    onChange(singleLineValue);
  };

  return (
    <View
      style={{
        flex: 1,
        border: `1px solid ${theme.formInputBorder}`,
        borderRadius: 4,
        overflow: 'visible',
        backgroundColor: disabled
          ? theme.formInputBackgroundSelection
          : theme.tableBackground,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Suspense fallback={<div style={{ height: 32 }} />}>
        <FormulaEditor
          value={value}
          onChange={handleChange}
          mode="transaction"
          disabled={disabled}
          singleLine={true}
          showLineNumbers={false}
        />
      </Suspense>
    </View>
  );
}
