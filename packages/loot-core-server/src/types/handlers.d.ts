import type { BudgetHandlers } from '../budget/types/handlers';
import type { DashboardHandlers } from '../dashboard/types/handlers';
import type { FiltersHandlers } from '../filters/types/handlers';
import type { NotesHandlers } from '../notes/types/handlers';
import type { PreferencesHandlers } from '../preferences/types/handlers';
import type { ReportsHandlers } from '../reports/types/handlers';
import type { RulesHandlers } from '../rules/types/handlers';
import type { SchedulesHandlers } from '../schedules/types/handlers';
import type { ToolsHandlers } from '../tools/types/handlers';

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
