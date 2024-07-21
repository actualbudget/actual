import { createApp } from '../app';
import * as db from '../db';

import { DashboardHandlers } from './types/handlers';

export const app = createApp<DashboardHandlers>();

app.method('dashboard-update', async widgets => {
  await Promise.all(widgets.map(widget => db.update('dashboard', widget)));
});

app.method('dashboard-update-widget', async widget => {
  await db.updateWithSchema('dashboard', widget);
});

app.method('dashboard-add-widget', async widget => {
  await db.insertWithSchema('dashboard', widget);
});

app.method('dashboard-remove-widget', async widgetId => {
  await db.delete_('dashboard', { id: widgetId });
});
