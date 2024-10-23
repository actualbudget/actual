import { type NewWidget } from '../types/models';

export const DEFAULT_DASHBOARD_STATE: NewWidget[] = [
  {
    type: 'net-worth-card',
    width: 8,
    height: 2,
    x: 0,
    y: 0,
    meta: null,
  },
  {
    type: 'cash-flow-card',
    width: 4,
    height: 2,
    x: 8,
    y: 0,
    meta: null,
  },
  {
    type: 'spending-card',
    width: 4,
    height: 2,
    x: 0,
    y: 2,
    meta: null,
  },
];
