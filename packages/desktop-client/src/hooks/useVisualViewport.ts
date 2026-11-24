import { useLayoutEffect, useState } from 'react';

export function useVisualViewport() {
  const [viewport, setViewport] = useState(getVisualViewport);

  useLayoutEffect(() => {
    const visualViewport = window.visualViewport;
    const update = () => setViewport(getVisualViewport());

    update();
    window.addEventListener('resize', update);
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return viewport;
}

function getVisualViewport() {
  return {
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
  };
}
