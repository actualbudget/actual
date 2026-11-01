import React from 'react';
import type { ReactNode } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FormField, FormLabel } from '#components/forms';
import type { QuickAddConfidence } from '#transactions/quickAddParser';

export function previewHintId(htmlFor: string) {
  return `${htmlFor}-hint`;
}

type PreviewFieldProps = {
  label: string;
  htmlFor: string;
  /** Set when the value was guessed, to explain it with the hint. */
  confidence?: QuickAddConfidence;
  /** Set when the field has no value, to highlight it. */
  isMissing?: boolean;
  hint: string | null;
  children: ReactNode;
};

export function QuickAddPreviewField({
  label,
  htmlFor,
  confidence,
  isMissing = false,
  hint,
  children,
}: PreviewFieldProps) {
  const isHighlighted = isMissing || confidence === 'low';
  const hintId = previewHintId(htmlFor);

  return (
    <FormField>
      <FormLabel title={label} htmlFor={htmlFor} />
      <View
        style={
          isHighlighted
            ? {
                borderRadius: 4,
                boxShadow: `0 0 0 1px ${theme.warningBorder}`,
              }
            : undefined
        }
      >
        {children}
      </View>
      {hint && (
        <Text
          id={hintId}
          style={{
            marginTop: 4,
            fontSize: 12,
            color: isHighlighted ? theme.warningText : theme.pageTextLight,
          }}
        >
          {hint}
        </Text>
      )}
    </FormField>
  );
}
