import { useEffect, useState } from 'react';

import { type CatalogTheme } from '@desktop-client/style/customThemes';

const CATALOG_URL = `https://raw.githubusercontent.com/actualbudget/actual/${process.env.REACT_APP_BRANCH || 'master'}/packages/desktop-client/src/data/customThemeCatalog.json`;

/**
 * Custom hook to fetch and manage the theme catalog from GitHub.
 */
export function useThemeCatalog() {
  const [data, setData] = useState<CatalogTheme[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(CATALOG_URL);

        if (!response.ok) {
          throw new Error(`Failed to fetch catalog: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate that data is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid catalog format: expected an array');
        }

        setData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load theme catalog',
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}
