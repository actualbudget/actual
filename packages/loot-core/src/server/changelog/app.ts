import { createApp } from '#server/app';

import type { ChangeLogQuery, ChangeLogResult } from './types';

import { getChangeLog as _getChangeLog } from './index';

export type ChangeLogHandlers = {
  'changelog-get': typeof getChangeLog;
};

export const app = createApp<ChangeLogHandlers>();
app.method('changelog-get', getChangeLog);

async function getChangeLog(query: ChangeLogQuery): Promise<ChangeLogResult> {
  return await _getChangeLog(query);
}
