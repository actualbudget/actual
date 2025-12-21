import {
  type DependencyList,
  type EffectCallback,
  useEffect,
  useRef,
} from 'react';

/**
 * A version of useEffect that doesn't run on the initial mount.
 */
export function useEffectAfterMount(
  effect: EffectCallback,
  deps?: DependencyList | undefined,
) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isFirstRender.current) {
      return effect();
    }
    isFirstRender.current = false;
  }, deps);
}
