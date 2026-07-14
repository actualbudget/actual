export const TEMPLATE_NOTIFICATION_MESSAGES = {
  templatesUpToDate: 'templates-up-to-date',
  templateErrors: 'template-errors',
  templatesApplied: 'templates-applied',
  templatesCheckPassed: 'templates-check-passed',
  cleanupNoFunds: 'cleanup-no-funds',
  cleanupUpToDate: 'cleanup-up-to-date',
  cleanupApplied: 'cleanup-applied',
  cleanupAppliedWithErrors: 'cleanup-applied-with-errors',
} as const;

export type TemplateNotificationMessage =
  (typeof TEMPLATE_NOTIFICATION_MESSAGES)[keyof typeof TEMPLATE_NOTIFICATION_MESSAGES];

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
