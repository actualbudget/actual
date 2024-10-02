import type { BudgetHandlers } from '../server/budget/types/handlers';
import type { DashboardHandlers } from '../server/dashboard/types/handlers';
import type { FiltersHandlers } from '../server/filters/types/handlers';
import type { NotesHandlers } from '../server/notes/types/handlers';
import type { PreferencesHandlers } from '../server/preferences/types/handlers';
import type { ReportsHandlers } from '../server/reports/types/handlers';
import type { RulesHandlers } from '../server/rules/types/handlers';
import type { SchedulesHandlers } from '../server/schedules/types/handlers';
import type { ToolsHandlers } from '../server/tools/types/handlers';

import type { ApiHandlers } from './api-handlers';
import type { ServerHandlers } from './server-handlers';

export interface Handlers
  extends ServerHandlers,
    ApiHandlers,
    BudgetHandlers,
    DashboardHandlers,
    FiltersHandlers,
    NotesHandlers,
    PreferencesHandlers,
    ReportsHandlers,
    RulesHandlers,
    SchedulesHandlers,
    ToolsHandlers {}

export type HandlerFunctions = Handlers[keyof Handlers];
