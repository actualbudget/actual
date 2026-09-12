import React from 'react';

import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { Cell } from '#components/table';
import { NotesTagFormatter } from '#notes/NotesTagFormatter';

import type { ChangeLogColumnSpec } from './changeLogColumns';
import { UNKNOWN } from './useSnapshotValues';
import type { SnapshotCellValue } from './useSnapshotValues';

/**
 * The arrow is bonded to the value it points at with a non-breaking space, so
 * that a wrapping diff can never leave it stranded on a line of its own.
 */
const ARROW = '\u2192\u00a0';

/** Stands in for a value the message log does not reach back far enough to know. */
const UNKNOWN_MARKER = '?';

const struckOut: CSSProperties = {
  color: theme.tableTextInactive,
  textDecoration: 'line-through',
};

/**
 * The diff is the only thing in the table allowed to wrap. A plain value that
 * wrapped would push the whole row taller for no gain -- and an account name
 * broken across two lines reads as an error -- so those are clipped instead.
 */
const clip: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

type ChangeLogValueCellProps = {
  column: ChangeLogColumnSpec;
  /** The value after the change, or the last value it held for a deletion. */
  value: SnapshotCellValue;
  /**
   * The value before the change, when the two differ and the cell should read
   * as `old -> new`. Null whenever there is nothing to compare against.
   */
  previousValue: SnapshotCellValue | null;
  /** A deletion has no after-state, so its whole snapshot reads as struck out. */
  isDeleted: boolean;
  /** Split legs blank their date and account, as the register does. */
  isBlank: boolean;
};

export function ChangeLogValueCell({
  column,
  value,
  previousValue,
  isDeleted,
  isBlank,
}: ChangeLogValueCellProps) {
  const isAmount = column.id === 'payment' || column.id === 'deposit';
  const isNotes = column.id === 'notes';
  const isDiff = previousValue !== null;

  return (
    <Cell
      name={column.id}
      width={column.width}
      plain
      style={{
        ...(column.minWidth != null && { minWidth: column.minWidth }),
        justifyContent: 'flex-start',
        padding: '12px 8px',
        textAlign: column.textAlign ?? 'left',
        // A diff is the one thing in the table that can wrap, so it is the one
        // thing that needs room between its lines.
        ...(isDiff ? { lineHeight: 1.55 } : clip),
        // Amounts are short enough never to need wrapping, and a wrapped
        // amount diff is unreadable.
        ...(isAmount && { ...styles.tnum, whiteSpace: 'nowrap' }),
        // The row draws its own separator; cells drawing one too would double
        // it up.
        borderTopWidth: 0,
        borderBottomWidth: 0,
      }}
    >
      {isBlank ? null : (
        <CellContent
          value={value}
          previousValue={previousValue}
          isDeleted={isDeleted}
          isNotes={isNotes}
        />
      )}
    </Cell>
  );
}

type CellContentProps = Omit<ChangeLogValueCellProps, 'column' | 'isBlank'> & {
  /** Notes carry the tag and link markup the register renders. */
  isNotes: boolean;
};

function CellContent({
  value,
  previousValue,
  isDeleted,
  isNotes,
}: CellContentProps) {
  if (previousValue !== null) {
    return (
      <Text>
        <Text data-testid="change-log-old" style={struckOut}>
          {renderValue(previousValue, isNotes)}
        </Text>{' '}
        <Text style={{ color: theme.pageTextLink, fontWeight: 700 }}>
          {ARROW}
        </Text>
        <Text
          data-testid="change-log-new"
          // Emphasis carried by weight and by the brightest foreground the
          // themes offer, rather than by a background fill.
          style={{ fontWeight: 600, color: theme.pageTextDark }}
        >
          {renderValue(value, isNotes)}
        </Text>
      </Text>
    );
  }

  // An unknown only says something when it sits opposite a known value. With
  // no diff to sit opposite, marking it would just be noise.
  if (value === UNKNOWN) {
    return null;
  }

  return (
    <Text style={{ ...clip, ...(isDeleted && struckOut) }}>
      {renderValue(value, isNotes)}
    </Text>
  );
}

/**
 * Notes go through the register's own formatter, so a note reads the same here
 * as it does in the account it came from: `#tags` as pills, URLs and file paths
 * as links. Tags are inert -- there is nothing in this table for a tag to
 * filter down to -- but they keep the colour the tag settings give them.
 */
function renderValue(value: SnapshotCellValue, isNotes: boolean) {
  if (value === UNKNOWN) {
    return UNKNOWN_MARKER;
  }

  return isNotes ? <NotesTagFormatter notes={value} /> : value;
}
