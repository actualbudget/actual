export default async function installPolyfills(): Promise<void> {
  if ('ResizeObserver' in window === false) {
    const module = await import(
      /* webpackChunkName: 'resize-observer-polyfill' */ '@juggle/resize-observer'
    );
    window.ResizeObserver = module.ResizeObserver;
  }
}
