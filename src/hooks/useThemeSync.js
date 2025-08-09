import { useEffect } from 'react';

/**
 * Custom hook to sync data-theme attribute between html and body elements
 * This ensures the body element always matches the html element's theme
 * This is important for the https://github.com/cmfcmf/docusaurus-search-local plugin styles
 */
export function useThemeSync() {
  useEffect(() => {
    function syncThemeToBody() {
      const htmlElement = document.documentElement;
      const bodyElement = document.body;

      if (!htmlElement || !bodyElement) return;

      const htmlTheme = htmlElement.getAttribute('data-theme');
      const bodyTheme = bodyElement.getAttribute('data-theme');

      // Always ensure body matches html
      if (htmlTheme !== bodyTheme) {
        console.log(
          `[ThemeSync] Syncing body theme: ${bodyTheme} -> ${htmlTheme}`,
        );
        bodyElement.setAttribute('data-theme', htmlTheme || 'light');
      }
    }

    // Initial sync
    syncThemeToBody();

    // Create MutationObserver to watch for changes to html data-theme
    const htmlObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme' &&
          mutation.target === document.documentElement
        ) {
          syncThemeToBody();
        }
      });
    });

    // Create MutationObserver to watch for external changes to body data-theme
    const bodyObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme' &&
          mutation.target === document.body
        ) {
          // Reset body to match html if it was changed externally
          const htmlTheme = document.documentElement.getAttribute('data-theme');
          const bodyTheme = document.body.getAttribute('data-theme');

          if (htmlTheme !== bodyTheme) {
            console.log(
              `[ThemeSync] Body theme was changed externally, resetting: ${bodyTheme} -> ${htmlTheme}`,
            );
            document.body.setAttribute('data-theme', htmlTheme || colorMode);
          }
        }
      });
    });

    // Start observing
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Handle storage events (theme changes in other tabs)
    const handleStorageChange = e => {
      if (e.key === 'theme') {
        setTimeout(syncThemeToBody, 10);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      htmlObserver.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
}
