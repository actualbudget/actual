import type { BudgetHandlers } from '../server/budget/types/handlers';
import type { FiltersHandlers } from '../server/filters/types/handlers';
import type { NotesHandlers } from '../server/notes/types/handlers';
import type { SchedulesHandlers } from '../server/schedules/types/handlers';

import type { ApiHandlers } from './api-handlers';
import type { MainHandlers } from './main-handlers';

export interface Handlers
  extends MainHandlers,
    ApiHandlers,
    BudgetHandlers,
    FiltersHandlers,
    NotesHandlers,
    SchedulesHandlers {}
