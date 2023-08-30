import { useEffect } from 'react';

export function useSetThemeColor(color: string) {
  window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(getPropertyName(color));

  useEffect(() => {
    setThemeColor(color);
  }, [color]);
}

function setThemeColor(color: string) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}

function getPropertyName(color: string) {
  const isVariable = color.match(/^var\(--(.*)\)$/);

  return isVariable ? isVariable[1] : color;
}
