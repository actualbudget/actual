import { createApp } from '../app';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import * as actions from './actions';
import * as goalActions from './goaltemplates';

let app = createApp();

app.method('budget/budget-amount', mutator(undoable(actions.setBudget)));
app.method(
  'budget/copy-previous-month',
  mutator(undoable(actions.copyPreviousMonth))
);
app.method('budget/set-zero', mutator(undoable(actions.setZero)));
app.method('budget/set-3month-avg', mutator(undoable(actions.set3MonthAvg)));
app.method(
  'budget/apply-goal-template',
  mutator(undoable(goalActions.applyTemplate))
);
app.method(
  'budget/overwrite-goal-template',
  mutator(undoable(goalActions.overwriteTemplate))
);
app.method(
  'budget/hold-for-next-month',
  mutator(undoable(actions.holdForNextMonth))
);
app.method('budget/reset-hold', mutator(undoable(actions.resetHold)));
app.method(
  'budget/cover-overspending',
  mutator(undoable(actions.coverOverspending))
);
app.method(
  'budget/transfer-available',
  mutator(undoable(actions.transferAvailable))
);
app.method(
  'budget/transfer-category',
  mutator(undoable(actions.transferCategory))
);
app.method(
  'budget/set-carryover',
  mutator(undoable(actions.setCategoryCarryover))
);

export default app;
