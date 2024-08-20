export async function installPolyfills(): Promise<void> {
  if ('ResizeObserver' in window === false) {
    const module = await import(
      /* webpackChunkName: 'resize-observer-polyfill' */ '@juggle/resize-observer'
    );
    // @ts-expect-error fix-me
    window.ResizeObserver = module.ResizeObserver;
  }
}
