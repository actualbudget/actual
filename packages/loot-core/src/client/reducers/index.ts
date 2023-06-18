import account from './account';
import app from './app';
import budgets from './budgets';
import debug from './debug';
import modals from './modals';
import notifications from './notifications';
import prefs from './prefs';
import profile from './profile';
import queries from './queries';
import user from './user';

const reducers = {
  app,
  queries,
  account,
  debug,
  profile,
  prefs,
  modals,
  notifications,
  budgets,
  user,
};
export default reducers;
