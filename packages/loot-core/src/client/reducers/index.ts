import { update as account } from './account';
import { update as app } from './app';
import { update as budgets } from './budgets';
import { update as modals } from './modals';
import { update as notifications } from './notifications';
import { update as prefs } from './prefs';
import { update as queries } from './queries';
import { update as user } from './user';

export const reducers = {
  app,
  queries,
  account,
  prefs,
  modals,
  notifications,
  budgets,
  user,
};
