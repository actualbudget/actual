import { type Widget } from '../../../types/models';
import { type EverythingButIdOptional } from '../../../types/util';

export interface DashboardHandlers {
  'dashboard-update': (
    widgets: EverythingButIdOptional<Omit<Widget, 'tombstone'>>[],
  ) => Promise<void>;
  'dashboard-update-widget': (
    widget: EverythingButIdOptional<Omit<Widget, 'tombstone'>>,
  ) => Promise<void>;
  'dashboard-add-widget': (
    widget: Omit<Widget, 'id' | 'x' | 'y' | 'tombstone'> &
      Partial<Pick<Widget, 'x' | 'y'>>,
  ) => Promise<void>;
  'dashboard-remove-widget': (widgetId: string) => Promise<void>;
  'dashboard-import': (args: {
    filepath: string;
  }) => Promise<{ status: 'ok' } | { error: 'internal-error' }>;
}
