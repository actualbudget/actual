import { isMatch } from 'es-toolkit/compat';
import { v4 as uuidv4 } from 'uuid';

import { captureException } from '#platform/exceptions';
import * as fs from '#platform/server/fs';
import { createApp } from '#server/app';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { ValidationError } from '#server/errors';
import { requiredFields } from '#server/models';
import { mutator } from '#server/mutators';
import { reportModel } from '#server/reports/app';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import { DEFAULT_DASHBOARD_STATE } from '#shared/dashboard';
import { q } from '#shared/query';
import type {
  CustomReportData,
  DashboardWidgetEntity,
  ExportImportCustomReportWidget,
  ExportImportDashboard,
  ExportImportDashboardWidget,
} from '#types/models';
import type { EverythingButIdOptional, WithOptional } from '#types/util';

function isExportedCustomReportWidget(
  widget: ExportImportDashboardWidget,
): widget is ExportImportCustomReportWidget {
  return widget.type === 'custom-report';
}

export function isWidgetType(
  type: string,
): type is DashboardWidgetEntity['type'] {
  return [
    'net-worth-card',
    'cash-flow-card',
    'spending-card',
    'crossover-card',
    'budget-analysis-card',
    'markdown-card',
    'summary-card',
    'calendar-card',
    'formula-card',
    'custom-report',
    'sankey-card',
    'balance-forecast-card',
    'age-of-money-card',
  ].includes(type);
}

const exportModel = {
  validate(dashboard: ExportImportDashboard) {
    requiredFields('Dashboard', dashboard, ['version', 'widgets']);

    if (!Array.isArray(dashboard.widgets)) {
      throw new ValidationError(
        'Invalid dashboard.widgets data type: it must be an array of widgets.',
      );
    }

    dashboard.widgets.forEach((widget, idx) => {
      requiredFields(`Dashboard widget #${idx}`, widget, [
        'type',
        'x',
        'y',
        'width',
        'height',
        ...(isExportedCustomReportWidget(widget) ? ['meta' as const] : []),
      ]);

      if (!Number.isInteger(widget.x)) {
        throw new ValidationError(
          `Invalid widget.${idx}.x data-type for value ${widget.x}.`,
        );
      }

      if (!Number.isInteger(widget.y)) {
        throw new ValidationError(
          `Invalid widget.${idx}.y data-type for value ${widget.y}.`,
        );
      }

      if (!Number.isInteger(widget.width)) {
        throw new ValidationError(
          `Invalid widget.${idx}.width data-type for value ${widget.width}.`,
        );
      }

      if (!Number.isInteger(widget.height)) {
        throw new ValidationError(
          `Invalid widget.${idx}.height data-type for value ${widget.height}.`,
        );
      }

      if (!isWidgetType(widget.type)) {
        throw new ValidationError(
          `Invalid widget.${idx}.type value ${String(widget.type)}.`,
        );
      }

      if (isExportedCustomReportWidget(widget)) {
        reportModel.validate(widget.meta);
      }
    });
  },
};

async function createDashboardPage({ name }: { name: string }) {
  const id = uuidv4();
  await db.insertWithSchema('dashboard_pages', { id, name });

  return id;
}

async function deleteDashboardPage(id: string) {
  const res = await db.first<{ c: number }>(
    'SELECT count(*) as c FROM dashboard_pages WHERE tombstone = 0',
  );

  if ((res?.c ?? 0) <= 1) {
    throw new Error('Cannot delete the last dashboard page');
  }

  const deleting_widgets = await db.all<Pick<db.DbDashboard, 'id'>>(
    'SELECT id FROM dashboard WHERE dashboard_page_id = ? AND tombstone = 0',
    [id],
  );

  await batchMessages(async () => {
    await db.delete_('dashboard_pages', id);
    // Tombstone all widgets for this dashboard
    await Promise.all(
      deleting_widgets.map(({ id }) => db.delete_('dashboard', id)),
    );
  });
}

async function renameDashboardPage({ id, name }: { id: string; name: string }) {
  await db.updateWithSchema('dashboard_pages', { id, name });
}

async function updateDashboard(
  widgets: EverythingButIdOptional<Omit<DashboardWidgetEntity, 'tombstone'>>[],
) {
  const { data: dbWidgets } = await aqlQuery(
    q('dashboard')
      .filter({ id: { $oneof: widgets.map(({ id }) => id) } })
      .select('*'),
  );
  const dbWidgetMap = new Map(
    (dbWidgets as DashboardWidgetEntity[]).map(widget => [widget.id, widget]),
  );

  await Promise.all(
    widgets
      // Perform an update query only if the widget actually has changes
      .filter(widget => !isMatch(dbWidgetMap.get(widget.id) ?? {}, widget))
      .map(widget => db.update('dashboard', widget)),
  );
}

async function updateDashboardWidget(
  widget: EverythingButIdOptional<Omit<DashboardWidgetEntity, 'tombstone'>>,
) {
  await db.updateWithSchema('dashboard', widget);
}

async function resetDashboard(id: string) {
  await batchMessages(async () => {
    const widgets = await db.selectWithSchema(
      'dashboard',
      'SELECT id FROM dashboard WHERE dashboard_page_id = ? AND tombstone = 0',
      [id],
    );

    await Promise.all([
      // Delete all widgets for this dashboard
      ...widgets.map(({ id }) => db.delete_('dashboard', id)),

      // Insert the default state
      ...DEFAULT_DASHBOARD_STATE.map(widget =>
        db.insertWithSchema('dashboard', { ...widget, dashboard_page_id: id }),
      ),
    ]);
  });
}

async function addDashboardWidget(
  widget: WithOptional<
    Omit<DashboardWidgetEntity, 'id' | 'tombstone'>,
    'x' | 'y'
  >,
) {
  // If no x & y was provided - calculate it dynamically
  // The new widget should be the very last one in the list of all widgets
  if (!('x' in widget) && !('y' in widget)) {
    const data = await db.first<
      Pick<db.DbDashboard, 'x' | 'y' | 'width' | 'height'>
    >(
      'SELECT x, y, width, height FROM dashboard WHERE dashboard_page_id = ? AND tombstone = 0 ORDER BY y DESC, x DESC',
      [widget.dashboard_page_id],
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

  const { dashboard_page_id, ...widgetWithoutDashboardPageId } = widget;

  await db.insertWithSchema('dashboard', {
    ...widgetWithoutDashboardPageId,
    dashboard_page_id,
  });
}

async function removeDashboardWidget(widgetId: string) {
  await db.delete_('dashboard', widgetId);
}

async function uniqueReportName(baseName: string): Promise<string> {
  let idx = 1;
  let newName = baseName;

  while (true) {
    const existing = await db.first<Pick<db.DbCustomReport, 'id'>>(
      'SELECT id from custom_reports WHERE tombstone = 0 AND name = ?',
      [newName],
    );

    if (!existing) {
      return newName;
    }

    newName = `${baseName} ${idx}`;
    idx++;
  }
}

function duplicateWidgetMeta(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const clonedMeta = JSON.parse(JSON.stringify(meta)) as Record<
    string,
    unknown
  >;

  if (typeof clonedMeta.name === 'string' && clonedMeta.name) {
    clonedMeta.name = `${clonedMeta.name} (Duplicate)`;
  }

  return clonedMeta;
}

async function duplicateDashboardWidget({
  id,
  targetDashboardPageId,
}: {
  id: string;
  targetDashboardPageId: string;
}) {
  const widget = await db.first<db.DbDashboard>(
    'SELECT * FROM dashboard WHERE id = ? AND tombstone = 0',
    [id],
  );

  if (!widget) {
    throw new Error(`Widget not found: ${id}`);
  }

  const widgetType = widget.type;
  if (!isWidgetType(widgetType)) {
    throw new Error(`Unsupported widget type: ${widgetType}`);
  }

  const meta = widget.meta ? JSON.parse(widget.meta) : {};

  await batchMessages(async () => {
    let newMeta = duplicateWidgetMeta(meta);

    if (widget.type === 'custom-report') {
      const { data: reports }: { data: CustomReportData[] } = await aqlQuery(
        q('custom_reports')
          .filter({ id: meta.id as string })
          .select('*'),
      );
      const report = reports[0];

      if (!report) {
        throw new Error(`Custom report not found: ${meta.id}`);
      }

      const reportEntity = reportModel.toJS(report);
      const newReportId = uuidv4();
      const newName = await uniqueReportName(
        `${reportEntity.name} (Duplicate)`,
      );

      await db.insertWithSchema(
        'custom_reports',
        reportModel.fromJS({
          ...reportEntity,
          id: newReportId,
          name: newName,
        }),
      );

      newMeta = { id: newReportId };
    }

    await addDashboardWidget({
      type: widgetType,
      width: widget.width,
      height: widget.height,
      meta: newMeta,
      dashboard_page_id: targetDashboardPageId,
    });
  });
}

async function copyDashboardWidget({
  id,
  targetDashboardPageId,
}: {
  id: string;
  targetDashboardPageId: string;
}) {
  // Get the widget to copy
  const widget = await db.first<db.DbDashboard>(
    'SELECT * FROM dashboard WHERE id = ? AND tombstone = 0',
    [id],
  );

  if (!widget) {
    throw new Error(`Widget not found: ${id}`);
  }

  await batchMessages(async () => {
    // Insert the widget to target dashboard
    if (isWidgetType(widget.type)) {
      const newWidget = {
        type: widget.type,
        width: widget.width,
        height: widget.height,
        meta: widget.meta ? JSON.parse(widget.meta) : {},
        dashboard_page_id: targetDashboardPageId,
      };
      await addDashboardWidget(newWidget);
    } else {
      throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  });
}

async function importDashboard({
  filePath,
  dashboardPageId,
}: {
  filePath: string;
  dashboardPageId: string;
}) {
  try {
    if (!(await fs.exists(filePath))) {
      throw new Error(`File not found at the provided path: ${filePath}`);
    }

    const content = await fs.readFile(filePath);
    const parsedContent: ExportImportDashboard = JSON.parse(content);

    exportModel.validate(parsedContent);

    const customReportIds = await db.all<Pick<db.DbCustomReport, 'id'>>(
      'SELECT id from custom_reports',
    );
    const customReportIdSet = new Set(customReportIds.map(({ id }) => id));

    const existingWidgets = await db.selectWithSchema(
      'dashboard',
      'SELECT id FROM dashboard WHERE dashboard_page_id = ? AND tombstone = 0',
      [dashboardPageId],
    );

    await batchMessages(async () => {
      await Promise.all([
        // Delete all widgets
        ...existingWidgets.map(({ id }) => db.delete_('dashboard', id)),

        // Insert new widgets
        ...parsedContent.widgets.map(widget =>
          db.insertWithSchema('dashboard', {
            type: widget.type,
            width: widget.width,
            height: widget.height,
            x: widget.x,
            y: widget.y,
            dashboard_page_id: dashboardPageId,
            meta: isExportedCustomReportWidget(widget)
              ? { id: widget.meta.id }
              : widget.meta,
          }),
        ),

        // Insert new custom reports
        ...parsedContent.widgets
          .filter(isExportedCustomReportWidget)
          .filter(({ meta }) => !customReportIdSet.has(meta.id))
          .map(({ meta }) =>
            db.insertWithSchema('custom_reports', reportModel.fromJS(meta)),
          ),

        // Update existing reports
        ...parsedContent.widgets
          .filter(isExportedCustomReportWidget)
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
      throw new Error('Invalid JSON file.', { cause: 'json-parse-error' });
    }
    if (err instanceof ValidationError) {
      throw new Error(err.message, { cause: 'validation-error' });
    }
    throw new Error('Internal error occurred during import.', {
      cause: 'internal-error',
    });
  }
}

export type DashboardHandlers = {
  'dashboard-create': typeof createDashboardPage;
  'dashboard-delete': typeof deleteDashboardPage;
  'dashboard-rename': typeof renameDashboardPage;
  'dashboard-update': typeof updateDashboard;
  'dashboard-update-widget': typeof updateDashboardWidget;
  'dashboard-reset': typeof resetDashboard;
  'dashboard-add-widget': typeof addDashboardWidget;
  'dashboard-remove-widget': typeof removeDashboardWidget;
  'dashboard-copy-widget': typeof copyDashboardWidget;
  'dashboard-duplicate-widget': typeof duplicateDashboardWidget;
  'dashboard-import': typeof importDashboard;
};

export const app = createApp<DashboardHandlers>();

app.method('dashboard-create', mutator(undoable(createDashboardPage)));
app.method('dashboard-delete', mutator(undoable(deleteDashboardPage)));
app.method('dashboard-rename', mutator(undoable(renameDashboardPage)));
app.method('dashboard-update', mutator(undoable(updateDashboard)));
app.method('dashboard-update-widget', mutator(undoable(updateDashboardWidget)));
app.method('dashboard-reset', mutator(undoable(resetDashboard)));
app.method('dashboard-add-widget', mutator(undoable(addDashboardWidget)));
app.method('dashboard-remove-widget', mutator(undoable(removeDashboardWidget)));
app.method('dashboard-copy-widget', mutator(undoable(copyDashboardWidget)));
app.method(
  'dashboard-duplicate-widget',
  mutator(undoable(duplicateDashboardWidget)),
);
app.method('dashboard-import', mutator(undoable(importDashboard)));
