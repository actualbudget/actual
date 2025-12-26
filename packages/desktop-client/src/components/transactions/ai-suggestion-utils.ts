// Utility to trigger AI category suggestions when transaction details change
import { send } from 'loot-core/platform/client/fetch';
import type { TransactionEntity } from 'loot-core/types/models';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning?: string;
}

let suggestionCache: Map<string, CategorySuggestion> = new Map();

/**
 * Get AI category suggestion for a transaction
 * Results are cached based on payee+amount to avoid redundant API calls
 */
export async function getAICategorySuggestion(
  transaction: Partial<TransactionEntity>,
  enabled: boolean,
): Promise<CategorySuggestion | null> {
  // Don't suggest if not enabled or if category already set
  if (!enabled || transaction.category || transaction.is_parent) {
    return null;
  }

  // Don't suggest for transactions without a payee
  if (!transaction.payee || !transaction.account) {
    return null;
  }

  // Create cache key
  const cacheKey = `${transaction.payee}-${transaction.amount}-${transaction.account}`;

  // Check cache first
  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey) || null;
  }

  try {
    const result = await send('api/ai-suggest-category', { transaction });

    if (result) {
      // Cache the result
      suggestionCache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('Error getting AI category suggestion:', error);
    return null;
  }
}

/**
 * Clear the suggestion cache
 */
export function clearAISuggestionCache() {
  suggestionCache.clear();
}

/**
 * Apply an AI suggestion to a transaction
 */
export function applyAISuggestion(
  transaction: TransactionEntity,
  suggestion: CategorySuggestion,
): Partial<TransactionEntity> {
  return {
    ...transaction,
    category: suggestion.categoryId,
  };
}

