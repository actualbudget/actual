export function captureException(exc: Error): void;
export type CaptureException = typeof captureException;

export function captureBreadcrumb(breadcrumb: unknown): void;
export type CaptureBreadcrumb = typeof captureBreadcrumb;
