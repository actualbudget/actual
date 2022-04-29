export default async function installPolyfills() {
  if ('ResizeObserver' in window === false) {
    const module = await import('@juggle/resize-observer');
    window.ResizeObserver = module.ResizeObserver;
  }
}
