import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles as baseStyles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { useDebugLogs } from '#debug/useDebugLogs';
import type { LogEntry, LogLevel } from '#debug/useDebugLogs';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

type LevelFilter = LogLevel | 'all';

const LEVEL_COLORS: Record<LogLevel, CSSProperties['color']> = {
  error: theme.errorTextDark,
  warn: theme.warningTextDark,
  log: theme.pageText,
  info: theme.pageText,
  debug: theme.pageTextSubdued,
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function formatEntryAsText(entry: LogEntry): string {
  const ts = formatTimestamp(entry.timestamp);
  const source = entry.source === 'backend' ? ' [backend]' : '';
  const level = entry.level.toUpperCase().padEnd(5);
  const line = `[${ts}] [${level}]${source} ${entry.message}`;
  if (entry.stack) {
    return `${line}\n${entry.stack}`;
  }
  return line;
}

type LogEntryRowProps = {
  entry: LogEntry;
};

function LogEntryRow({ entry }: LogEntryRowProps) {
  const color = LEVEL_COLORS[entry.level];

  return (
    <View
      style={{
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: '1.5em',
        padding: '3px 8px',
        borderBottom: `1px solid ${theme.tableBorder}`,
        color,
        wordBreak: 'break-word',
        flexShrink: 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <Text style={{ color: theme.pageTextSubdued, flexShrink: 0 }}>
          {formatTimestamp(entry.timestamp)}
        </Text>
        <Text
          style={{
            color,
            fontWeight: 'bold',
            minWidth: 35,
            flexShrink: 0,
          }}
        >
          {entry.level.toUpperCase()}
        </Text>
        {entry.source === 'backend' && (
          <Text
            style={{
              backgroundColor: theme.pageTextSubdued,
              color: theme.pageBackground,
              borderRadius: 3,
              padding: '0 4px',
              fontSize: 10,
              flexShrink: 0,
            }}
          >
            backend
          </Text>
        )}
        <Text style={{ color }}>{entry.message}</Text>
      </View>
      {entry.stack && (
        <Text
          style={{
            color: theme.pageTextSubdued,
            marginLeft: 6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {entry.stack}
        </Text>
      )}
    </View>
  );
}

const LEVEL_FILTERS: LevelFilter[] = [
  'all',
  'error',
  'warn',
  'info',
  'log',
  'debug',
];

export function DebugLogsModal() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { entries } = useDebugLogs();
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const filteredEntries = useMemo(() => {
    if (levelFilter === 'all') {
      return entries;
    }
    return entries.filter(e => e.level === levelFilter);
  }, [entries, levelFilter]);

  function handleCopy() {
    const text = filteredEntries.map(formatEntryAsText).join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('Logs copied to clipboard'),
          },
        }),
      );
    });
  }

  return (
    <Modal
      name="debug-logs"
      containerProps={{
        style: { width: 900, height: '80vh', overflowY: 'hidden' },
      }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={t('Debug Logs')} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />

          <View
            style={{
              flexDirection: 'column',
              flex: 1,
              padding: '0 16px',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                gap: 4,
                paddingBottom: 8,
                flexShrink: 0,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {LEVEL_FILTERS.map(f => (
                <Button
                  key={f}
                  variant={levelFilter === f ? 'primary' : 'bare'}
                  style={{ textTransform: 'capitalize', minWidth: 46 }}
                  onPress={() => setLevelFilter(f)}
                >
                  {f === 'all' ? <Trans>All</Trans> : f.toUpperCase()}
                </Button>
              ))}
              <View style={{ flex: 1 }} />
              <Text style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
                <Trans>{{ count: filteredEntries.length }} entries</Trans>
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: theme.tableBackground,
                border: `1px solid ${theme.tableBorder}`,
                borderRadius: baseStyles.menuBorderRadius,
              }}
            >
              {filteredEntries.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.pageTextSubdued,
                    padding: 24,
                  }}
                >
                  <Text>
                    <Trans>No log entries</Trans>
                  </Text>
                </View>
              ) : (
                filteredEntries.map(entry => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))
              )}
            </View>
          </View>

          <ModalButtons>
            <Button variant="primary" onPress={handleCopy}>
              <Trans>Copy logs</Trans>
            </Button>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
