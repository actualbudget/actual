import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import {
  PluginContext,
  Button,
  ModalHeader,
  View,
  Text,
  theme,
  ScheduleEntity,
} from '@actual-app/plugins-core';

type ModalSchedulesProps = {
  context: PluginContext;
};

export function ModalSchedules({ context }: ModalSchedulesProps) {
  const [schedules, setSchedules] = useState<ScheduleEntity[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch schedules from host app using AQL
  const fetchSchedules = async () => {
    if (!context.db) {
      console.error('Database not available');
      return;
    }

    setLoading(true);
    try {
      const result = await context.db.aql(context.q('schedules').select('*'), {
        target: 'host',
      });
      setSchedules((result.data as ScheduleEntity[]) || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ModalHeader title="Schedules from Host App" />
      <View style={{ padding: 20, minWidth: 600 }}>
        <View>
          <Text style={{ marginBottom: 15 }}>
            This modal demonstrates AQL querying from the host app. Click the
            button below to fetch all schedules:
          </Text>

          <View style={{ marginBottom: 20 }}>
            <Button
              variant="primary"
              onPress={fetchSchedules}
              isDisabled={loading}
            >
              {loading ? (
                <Trans>Loading...</Trans>
              ) : (
                <Trans>Fetch Schedules</Trans>
              )}
            </Button>
          </View>

          {schedules.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
                <Trans>Found {schedules.length} schedule(s):</Trans>
              </Text>

              <View
                style={{
                  maxHeight: 400,
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: 10,
                }}
              >
                <View style={{ gap: 10 }}>
                  {schedules.map((schedule, index) => (
                    <View
                      key={schedule.id || index}
                      style={{
                        padding: 12,
                        borderRadius: 4,
                        backgroundColor: theme.tableBackground,
                        border: '1px solid #eee',
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
                        Schedule #{schedule.id || index + 1}
                      </Text>
                      <View style={{ fontSize: '12px', color: '#666' }}>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {JSON.stringify(schedule, null, 2)}
                        </pre>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {!loading && schedules.length === 0 && (
            <View
              style={{
                padding: 20,
                textAlign: 'center',
                backgroundColor: theme.tableBackground,
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: '#666' }}>
                {schedules.length === 0 && !loading
                  ? 'No schedules found or none fetched yet.'
                  : ''}
              </Text>
            </View>
          )}

          <View style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onPress={() => context.popModal()}>
              <Trans>Close</Trans>
            </Button>
          </View>
        </View>
      </View>
    </>
  );
}
