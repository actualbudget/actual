import { createApp } from '../app';
import * as db from '../db';

import { DashboardHandlers } from './types/handlers';

export const app = createApp<DashboardHandlers>();

app.method('dashboard-update', async widgets => {
  await Promise.all(widgets.map(widget => db.update('dashboard', widget)));
});

app.method('dashboard-update-widget', async widget => {
  await db.update('dashboard', widget);
});

app.method('dashboard-add-widget', async widget => {
  // If no x & y was provided - calculate it dynamically
  // The new widget should be the very last one in the list of all widgets
  if (!('x' in widget) && !('y' in widget)) {
    const data = await db.first(
      'SELECT x, y FROM dashboard ORDER BY y DESC, x DESC',
    );

    if (!data) {
      widget.x = 0;
      widget.y = 0;
    } else {
      const xBoundaryCheck = data.x + data.width + widget.width;
      widget.x = xBoundaryCheck > 12 ? 0 : data.x + data.width;
      widget.y = data.y + (xBoundaryCheck > 12 ? data.height : 0);
    }
  }

  await db.insertWithSchema('dashboard', widget);
});

app.method('dashboard-remove-widget', async widgetId => {
  await db.delete_('dashboard', { id: widgetId });
});
