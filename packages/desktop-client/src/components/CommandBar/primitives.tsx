import type { ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { usePrivacyMode } from '#hooks/usePrivacyMode';
import type { Binding, SheetFields, SheetNames } from '#spreadsheet';

/** Emphasize the part of `text` that matches the current search. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const match = text.toLowerCase().indexOf(q);
  if (match === -1) return text;
  const offsets: Array<{ start: number; end: number }> = [];
  let i = 0;
  for (const original of text) {
    const end = i + original.length;
    const foldedLength = original.toLowerCase().length;
    for (let j = 0; j < foldedLength; j++) offsets.push({ start: i, end });
    i = end;
  }
  const start = offsets[match].start;
  const end = offsets[match + q.length - 1].end;
  return (
    <>
      {text.slice(0, start)}
      <Text style={{ color: theme.pageTextPositive, fontWeight: 700 }}>
        {text.slice(start, end)}
      </Text>
      {text.slice(end)}
    </>
  );
}

export function KeyChip({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        flexShrink: 0,
        padding: '2px 6px',
        backgroundColor: theme.pillBackground,
        borderRadius: 5,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        color: theme.pillText,
      }}
    >
      {children}
    </Text>
  );
}

export function FooterHint({
  keys,
  children,
}: {
  keys: string[];
  children: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {keys.map(key => (
        <KeyChip key={key}>{key}</KeyChip>
      ))}
      <Text style={{ fontSize: 11.5, color: theme.pageTextSubdued }}>
        {children}
      </Text>
    </View>
  );
}

export function BalanceRow<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  label,
  binding,
  query,
}: {
  label: string;
  binding: Binding<SheetName, FieldName>;
  query: string;
}) {
  const privacyMode = usePrivacyMode();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Text
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <Highlight text={label} query={query} />
      </Text>
      <CellValue binding={binding} type="financial">
        {props => (
          <CellValueText
            {...props}
            style={{
              ...styles.tnum,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontSize: 12.5,
              color:
                !privacyMode &&
                typeof props.value === 'number' &&
                props.value < 0
                  ? theme.errorText
                  : theme.pageTextSubdued,
            }}
          />
        )}
      </CellValue>
    </View>
  );
}
