import { useEffect } from 'react';

export function useSetThemeColor(color: string) {
  useEffect(() => {
    setThemeColor(getPropertyValueFromVarString(color));
  }, [color]);
}

function setThemeColor(color: string) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}

function getPropertyValueFromVarString(varString: string) {
  const varStringMatch = varString.match(/^var\((--.*)\)$/);

  return varStringMatch[1]
    ? window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(varStringMatch[1])
    : varString;
}
