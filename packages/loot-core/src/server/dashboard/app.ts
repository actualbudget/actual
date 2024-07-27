import isMatch from 'lodash/isMatch';

import { captureException } from '../../platform/exceptions';
import * as fs from '../../platform/server/fs';
import { q } from '../../shared/query';
import {
  type CustomReportEntity,
  type ExportImportDashboard,
  type ExportImportDashboardWidget,
  type ExportImportCustomReportWidget,
  type Widget,
} from '../../types/models';
import { type EverythingButIdOptional } from '../../types/util';
import { createApp } from '../app';
import { runQuery as aqlQuery } from '../aql';
import * as db from '../db';
import { mutator } from '../mutators';
import { reportModel } from '../reports/app';
import { undoable } from '../undo';

import { DashboardHandlers } from './types/handlers';

async function updateDashboard(
  widgets: EverythingButIdOptional<Omit<Widget, 'tombstone'>>[],
) {
  const { data: dbWidgets } = await aqlQuery(
    q('dashboard')
      .filter({ id: { $oneof: widgets.map(({ id }) => id) } })
      .select('*'),
  );
  const dbWidgetMap = new Map(
    (dbWidgets as Widget[]).map(widget => [widget.id, widget]),
  );

  await Promise.all(
    widgets
      // Perform an update query only if the widget actually has changes
      .filter(widget => !isMatch(dbWidgetMap.get(widget.id) ?? {}, widget))
      .map(widget => db.update('dashboard', widget)),
  );
}

async function updateDashboardWidget(
  widget: EverythingButIdOptional<Omit<Widget, 'tombstone'>>,
) {
  await db.update('dashboard', widget);
}

async function addDashboardWidget(
  widget: Omit<Widget, 'id' | 'x' | 'y' | 'tombstone'> &
    Partial<Pick<Widget, 'x' | 'y'>>,
) {
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
}

async function removeDashboardWidget(widgetId: string) {
  await db.delete_('dashboard', widgetId);
}

async function importDashboard({ filepath }: { filepath: string }) {
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
    const parsedContent: ExportImportDashboard = JSON.parse(content);

    // TODO: validate the input json?

    const customReportIds: CustomReportEntity[] = await db.all(
      'SELECT id from custom_reports',
    );
    const customReportIdSet = new Set(customReportIds.map(({ id }) => id));

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
            meta: isCustomReportWidget(widget) ? { id: widget.meta.id } : null,
          }),
        ),

        // Insert new custom reports
        ...parsedContent.widgets
          .filter(isCustomReportWidget)
          .filter(({ meta }) => !customReportIdSet.has(meta.id))
          .map(({ meta }) =>
            db.insertWithSchema('custom_reports', reportModel.fromJS(meta)),
          ),

        // Update existing reports
        ...parsedContent.widgets
          .filter(isCustomReportWidget)
          .filter(({ meta }) => customReportIdSet.has(meta.id))
          .map(({ meta }) =>
            db.updateWithSchema('custom_reports', {
              // Replace `undefined` values with `null`
              // (null clears the value in DB; undefined breaks the operation)
              ...Object.fromEntries(
                Object.entries(reportModel.fromJS(meta)).map(([key, value]) => [
                  key,
                  value ?? null,
                ]),
              ),
              tombstone: false,
            }),
          ),
      ]);
    });

    return { status: 'ok' as const };
  } catch (err: unknown) {
    if (err instanceof Error) {
      err.message = 'Error importing file: ' + err.message;
      captureException(err);
    }
    if (err instanceof SyntaxError) {
      return { error: 'json-parse-error' as const };
    }
    return { error: 'internal-error' as const };
  }
}

export const app = createApp<DashboardHandlers>();

app.method('dashboard-update', mutator(undoable(updateDashboard)));
app.method('dashboard-update-widget', mutator(undoable(updateDashboardWidget)));
app.method('dashboard-add-widget', mutator(undoable(addDashboardWidget)));
app.method('dashboard-remove-widget', mutator(undoable(removeDashboardWidget)));
app.method('dashboard-import', mutator(undoable(importDashboard)));
