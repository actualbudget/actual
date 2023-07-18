import account from './account';
import app from './app';
import budgets from './budgets';
import modals from './modals';
import notifications from './notifications';
import prefs from './prefs';
import queries from './queries';
import user from './user';

const reducers = {
  app,
  queries,
  account,
  prefs,
  modals,
  notifications,
  budgets,
  user,
};
export default reducers;
