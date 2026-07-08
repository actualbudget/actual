import { useEffect, useMemo, useState } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import type {
  DashboardPageEntity,
  DashboardWidgetEntity,
} from '@actual-app/core/types/models';
import type { ReportSpreadsheetValues } from '@actual-app/core/types/report-spreadsheet';

export function useDashboardReportCells(
  dashboardPageId: DashboardPageEntity['id'],
  widgets: DashboardWidgetEntity[],
  reportDependencies: unknown = null,
) {
  const [cells, setCells] = useState<ReportSpreadsheetValues>({});
  const widgetKey = useMemo(
    () =>
      JSON.stringify({
        reportDependencies,
        widgets: widgets.map(widget => ({
          id: widget.id,
          meta: widget.meta,
          type: widget.type,
        })),
      }),
    [reportDependencies, widgets],
  );

  useEffect(() => {
    return listen('report-cells-changed', changedCells => {
      setCells(current => {
        const next = { ...current };
        for (const cell of changedCells) {
          next[cell.widgetId] = cell;
        }
        return next;
      });
    });
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void send('report-spreadsheet/prepare-dashboard', {
      dashboardPageId,
    }).then(({ cells }) => {
      if (isCurrent) {
        setCells(current => ({ ...current, ...cells }));
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [dashboardPageId, widgetKey]);

  return cells;
}
