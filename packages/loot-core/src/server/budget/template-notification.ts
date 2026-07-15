export type TemplateNotificationMessage =
  | 'templates-up-to-date'
  | 'template-errors'
  | 'templates-applied'
  | 'templates-check-passed'
  | 'cleanup-no-funds'
  | 'cleanup-up-to-date'
  | 'cleanup-applied'
  | 'cleanup-applied-with-errors';

export type TemplateNotification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: TemplateNotificationMessage;
  sticky?: boolean | undefined;
  count?: number | undefined;
  sourceCount?: number | undefined;
  sinkCount?: number | undefined;
};
