import type { ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import type { Binding, SheetFields, SheetNames } from '#spreadsheet';

/** Emphasize the part of `text` that matches the current search. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const start = q ? text.toLowerCase().indexOf(q) : -1;
  if (start === -1) return text;
  const end = start + q.length;
  return (
    <>
      {text.slice(0, start)}
      <Text style={{ color: 'var(--color-pageTextPositive)', fontWeight: 700 }}>
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
        backgroundColor: 'var(--color-pillBackground)',
        borderRadius: 5,
        fontSize: 10.5,
        lineHeight: '12px',
        fontWeight: 600,
        letterSpacing: 0.2,
        color: 'var(--color-pillTextSubdued)',
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
        flexShrink: 0,
        whiteSpace: 'nowrap',
        lineHeight: '16px',
      }}
    >
      {keys.map(key => (
        <KeyChip key={key}>{key}</KeyChip>
      ))}
      <Text
        style={{
          fontSize: 11.5,
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          color: 'var(--color-pageTextSubdued)',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function ShortcutHint({
  keys,
  label,
}: {
  keys: readonly string[];
  label: ReactNode;
}) {
  return <FooterHint keys={[...keys]}>{label}</FooterHint>;
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
                typeof props.value === 'number' && props.value < 0
                  ? 'var(--color-errorText)'
                  : 'var(--color-pageTextSubdued)',
            }}
          />
        )}
      </CellValue>
    </View>
  );
}
