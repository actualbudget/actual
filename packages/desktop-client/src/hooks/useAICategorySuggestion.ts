import { useState, useCallback, useEffect } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import type { TransactionEntity } from 'loot-core/types/models';

import { useFeatureFlag } from './useFeatureFlag';
import { useSyncedPref } from './useSyncedPref';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning?: string;
}

export function useAICategorySuggestion() {
  const isAIEnabled = useFeatureFlag('aiAssistant');
  const [aiSuggestCategories] = useSyncedPref('ai-suggest-categories');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEnabled = isAIEnabled && aiSuggestCategories === 'true';

  const suggestCategory = useCallback(
    async (transaction: Partial<TransactionEntity>) => {
      if (!isEnabled) {
        return null;
      }

      // Don't suggest if category already set or if it's a parent transaction
      if (transaction.category || transaction.is_parent) {
        return null;
      }

      setLoading(true);
      setError(null);
      setSuggestion(null);

      try {
        const result = await send('api/ai-suggest-category', { transaction });

        if (result) {
          setSuggestion(result);
          return result;
        }

        return null;
      } catch (err) {
        console.error('Error getting AI category suggestion:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isEnabled],
  );

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return {
    suggestCategory,
    clearSuggestion,
    suggestion,
    loading,
    error,
    isEnabled,
  };
}

