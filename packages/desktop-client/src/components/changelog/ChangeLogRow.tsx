import React from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { ChangeLogEntry } from '@actual-app/core/server/changelog/types';
import { format as formatMonthUtil } from '@actual-app/core/shared/months';

import { Cell, Row, ROW_HEIGHT } from '#components/table';
import { useDateFormat } from '#hooks/useDateFormat';

import {
  CHANGE_LOG_COLUMNS,
  CHANGE_TYPE_COLUMN_WIDTH,
  DEVICE_COLUMN_WIDTH,
  WHEN_COLUMN_WIDTH,
} from './changeLogColumns';
import { ChangeLogKindBadge } from './ChangeLogKindBadge';
import { ChangeLogValueCell } from './ChangeLogValueCell';
import { useSnapshotValues } from './useSnapshotValues';

type ChangeLogRowProps = {
  entry: ChangeLogEntry;
  isCurrentClient: boolean;
  /** Position in the list, for the alternating row background. */
  index: number;
};

export function ChangeLogRow({
  entry,
  isCurrentClient,
  index,
}: ChangeLogRowProps) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const readValue = useSnapshotValues();

  const changedAt = new Date(entry.changedAt);
  const isDeleted = entry.kind === 'deleted';

  // A deletion is the one entry with no after-state, so it is the one entry
  // read from its before-state. Everything else describes where it ended up.
  const { before, after } = entry;
  const snapshot = isDeleted ? before : after;

  return (
    <Row
      // Overriding both, because `Row` pins a fixed pixel height by default and
      // a diff that wraps has to be able to push the row taller.
      style={{
        height: 'auto',
        flex: '0 0 auto',
        minHeight: ROW_HEIGHT,
        // Anchors the "Split" marker below.
        position: 'relative',
        fontSize: 13,
        // Identical to `tableBackground` in every built-in theme, so this is a
        // no-op unless a custom theme chooses to distinguish the two.
        backgroundColor:
          index % 2 === 0
            ? theme.tableBackground
            : theme.tableRowBackgroundAlternate,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <Cell
        name="when"
        width={WHEN_COLUMN_WIDTH}
        plain
        // Wall-clock time, so it differs on every run: masked out of visual
        // regression screenshots.
        data-vrt-mask="true"
        style={{
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: 12,
          fontSize: 12,
          lineHeight: 1.45,
          color: theme.tableTextLight,
          borderTopWidth: 0,
          borderBottomWidth: 0,
        }}
      >
        <View>
          <Text>{formatMonthUtil(changedAt, dateFormat)}</Text>
          <Text>{changedAt.toLocaleTimeString()}</Text>
        </View>
      </Cell>

      {/* The badge describes the change event rather than any one field, so it
          sits with "When" ahead of the transaction snapshot. */}
      <Cell
        name="change-type"
        width={CHANGE_TYPE_COLUMN_WIDTH}
        plain
        style={{
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: 12,
          borderTopWidth: 0,
          borderBottomWidth: 0,
        }}
      >
        <ChangeLogKindBadge kind={entry.kind} />
      </Cell>

      {CHANGE_LOG_COLUMNS.map(column => {
        // Highlight by what the reader actually sees rather than by which
        // database column moved: a single `amount` backs both Payment and
        // Deposit, so keying off the column would light up an empty cell
        // alongside the real change. With one side missing there is nothing to
        // compare, so nothing is marked.
        const value = snapshot ? readValue(snapshot, column) : '';
        // Only an ordinary edit has both sides to compare.
        const previous =
          before && after && !isDeleted ? readValue(before, column) : null;
        const changedFrom =
          previous !== null && previous !== value ? previous : null;

        return (
          <ChangeLogValueCell
            key={column.id}
            column={column}
            value={value}
            previousValue={changedFrom}
            isDeleted={isDeleted}
            // Split legs blank their date and account, as the register does.
            isBlank={
              entry.isSplitChild &&
              (column.id === 'date' || column.id === 'account')
            }
          />
        );
      })}

      <Cell
        name="device"
        width={DEVICE_COLUMN_WIDTH}
        plain
        // The client id is regenerated per budget file, so this is masked out
        // of visual regression screenshots too.
        data-vrt-mask="true"
        style={{
          justifyContent: 'flex-start',
          textAlign: 'right',
          padding: 12,
          borderTopWidth: 0,
          borderBottomWidth: 0,
        }}
      >
        {isCurrentClient ? (
          <Text>
            <Trans>This device</Trans>
          </Text>
        ) : (
          <Text
            title={entry.clientId}
            style={{ ...styles.tnum, color: theme.tableTextLight }}
          >
            {entry.clientId.slice(0, 6)}
          </Text>
        )}
      </Cell>

      {entry.isSplitChild && (
        <View
          style={{
            position: 'absolute',
            left: WHEN_COLUMN_WIDTH + CHANGE_TYPE_COLUMN_WIDTH + 8,
            top: 12,
            fontStyle: 'italic',
            fontSize: 12,
            color: theme.tableTextLight,
            pointerEvents: 'none',
          }}
        >
          <Trans>Split</Trans>
        </View>
      )}
    </Row>
  );
}
