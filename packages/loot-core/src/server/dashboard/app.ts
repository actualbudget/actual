import {
  type ExportImportDashboard,
  type ExportImportDashboardWidget,
  type ExportImportCustomReportWidget,
  type Widget,
} from '../../types/models';
import { q } from '../../shared/query';
import { createApp } from '../app';
import { runQuery as aqlQuery } from '../aql';
import * as db from '../db';
import { reportModel } from '../reports/app';
import * as fs from '../../platform/server/fs';
import { captureException } from '../../platform/exceptions';
import { mutator } from '../mutators';
import { undoable } from '../undo';
import isMatch from 'lodash/isMatch';

import { DashboardHandlers } from './types/handlers';

export const app = createApp<DashboardHandlers>();

app.method(
  'dashboard-update',
  mutator(
    undoable(async widgets => {
      const { data: dbWidgets } = await aqlQuery(
        q('dashboard')
          .filter({ id: { $oneof: widgets.map(({ id }) => id) } })
          .select('*'),
      );
      const dbWidgetMap = new Map(dbWidgets.map(widget => [widget.id, widget]));

      await Promise.all(
        widgets
          // Perform an update query only if the widget actually has changes
          .filter(widget => !isMatch(dbWidgetMap.get(widget.id), widget))
          .map(widget => db.update('dashboard', widget)),
      );
    }),
  ),
);

app.method(
  'dashboard-update-widget',
  mutator(
    undoable(async widget => {
      await db.update('dashboard', widget);
    }),
  ),
);

app.method(
  'dashboard-add-widget',
  mutator(
    undoable(async widget => {
      // If no x & y was provided - calculate it dynamically
      // The new widget should be the very last one in the list of all widgets
      if (!('x' in widget) && !('y' in widget)) {
        const data = await db.first(
          'SELECT x, y, width, height FROM dashboard WHERE tombstone = 0 ORDER BY y DESC, x DESC',
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
    }),
  ),
);

app.method(
  'dashboard-remove-widget',
  mutator(
    undoable(async widgetId => {
      await db.delete_('dashboard', widgetId);
    }),
  ),
);

app.method(
  'dashboard-import',
  mutator(
    undoable(async ({ filepath }) => {
      function isCustomReportWidget(
        widget: ExportImportDashboardWidget,
      ): widget is ExportImportCustomReportWidget {
        return widget.type === 'custom-report';
      }

      try {
        if (!(await fs.exists(filepath))) {
          throw new Error(`File not found at the provided path: ${filepath}`);
        }

        const content = await fs.readFile(filepath);
        const parsedContent: ExportImportDashboard = JSON.parse(content); // TODO: what if this fails?

        // TODO: validate the input json?

        const customReportIds = await db.all('SELECT id from custom_reports');
        const customReportIdSet = new Set(customReportIds.map(({ id }) => id));
        const importedCustomReportIdSet = new Set(
          parsedContent.widgets
            .filter(isCustomReportWidget)
            .map(({ meta }) => meta.id),
        );

        // TODO: custom reports - do I even need to manage the "tombstone" state?
        // Perhaps we can just use the dashboard definition as the source of truth
        // for deletion and then ignore the custom report tombstone status. TBD
        // TODO: transactions dont actually work
        await db.asyncTransaction(async () => {
          await Promise.all([
            // Delete all widgets
            db.deleteAll('dashboard'),

            // Insert new widgets
            ...parsedContent.widgets.map(widget =>
              db.insertWithSchema('dashboard', {
                type: widget.type,
                width: widget.width,
                height: widget.height,
                x: widget.x,
                y: widget.y,
                meta: isCustomReportWidget(widget)
                  ? { id: widget.meta.id }
                  : null,
              }),
            ),

            // Delete all custom reports that do not match the IDs in the imported json
            ...customReportIds
              .filter(({ id }) => !importedCustomReportIdSet.has(id))
              .map(({ id }) => db.delete_('custom_reports', id)),

            // Insert new custom reports
            ...parsedContent.widgets
              .filter(isCustomReportWidget)
              .filter(({ meta }) => !customReportIdSet.has(meta.id))
              .map(({ meta }) =>
                db.insertWithSchema('custom_reports', reportModel.fromJS(meta)),
              ),

            // Update existing reports
            // TODO: test this
            ...parsedContent.widgets
              .filter(isCustomReportWidget)
              .filter(({ meta }) => customReportIdSet.has(meta.id))
              .map(({ meta }) =>
                db.updateWithSchema('custom_reports', {
                  // Replace `undefined` values with `null`
                  // (null clears the value in DB; undefined breaks the operation)
                  ...Object.fromEntries(
                    Object.entries(reportModel.fromJS(meta)).map(
                      ([key, value]) => [key, value ?? null],
                    ),
                  ),
                  tombstone: false, // TODO: should this be bool?
                }),
              ),
          ]);
        });

        // TODO: return IDs of widgets that might have issues
        return { status: 'ok' as const };
      } catch (err) {
        err.message = 'Error importing file: ' + err.message;
        captureException(err);
        return { error: 'internal-error' as const };
      }
    }),
  ),
);
