export default async function installPolyfills(): Promise<void> {
  if ('ResizeObserver' in window === false) {
    let module = await import('@juggle/resize-observer');
    window.ResizeObserver = module.ResizeObserver;
  }
}
