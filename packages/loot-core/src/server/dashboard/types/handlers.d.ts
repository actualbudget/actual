import { type Widget } from '../../../types/models';

type EverythingButIdOptional<T> = { id: T['id'] } & Partial<Omit<T, 'id'>>;

export interface DashboardHandlers {
  'dashboard-update': (
    widgets: EverythingButIdOptional<Widget>[],
  ) => Promise<void>;
  'dashboard-update-widget': (
    widget: EverythingButIdOptional<Widget>,
  ) => Promise<void>;
  'dashboard-add-widget': (widget: Widget) => Promise<void>;
  'dashboard-remove-widget': (widgetId: string) => Promise<void>;
}
