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
  const effectRef = useRef(effect);

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  // oxlint-disable-next-line react/exhaustive-deps -- caller owns deps
  useEffect(() => {
    if (!isFirstRender.current) {
      return effectRef.current();
    }
    isFirstRender.current = false;
  }, deps);
}
