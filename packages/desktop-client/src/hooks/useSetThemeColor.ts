import { useEffect } from 'react';

export function useSetThemeColor(color: string) {
  useEffect(() => {
    setThemeColor(color);
  }, [color]);
}

function setThemeColor(color: string) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}
