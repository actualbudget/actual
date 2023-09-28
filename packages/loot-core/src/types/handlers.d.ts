import type { BudgetHandlers } from '../server/budget/types/handlers';
import type { FiltersHandlers } from '../server/filters/types/handlers';
import type { NotesHandlers } from '../server/notes/types/handlers';
import type { SchedulesHandlers } from '../server/schedules/types/handlers';
import type { ToolsHandlers } from '../server/tools/types/handlers';

import type { ApiHandlers } from './api-handlers';
import type { ServerHandlers } from './server-handlers';

export interface Handlers
  extends ServerHandlers,
    ApiHandlers,
    BudgetHandlers,
    FiltersHandlers,
    NotesHandlers,
    SchedulesHandlers,
    ToolsHandlers {}
