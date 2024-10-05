// @ts-strict-ignore
import { useEffect } from 'react';

const VAR_STRING_REGEX = /^var\((--.*)\)$/;

export function useMetaThemeColor(color?: string) {
  useEffect(() => {
    if (color) {
      setThemeColor(getPropertyValueFromVarString(color));
    }
  }, [color]);
}

function setThemeColor(color: string) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}

function getPropertyValueFromVarString(varString: string) {
  return VAR_STRING_REGEX.test(varString)
    ? window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(varString.match(VAR_STRING_REGEX)[1])
    : varString;
}
