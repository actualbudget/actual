// @ts-strict-ignore
import { aqlQuery } from '../aql';
import * as db from '../db';
import { q } from '../../shared/query';
import type { TransactionEntity } from '../../types/models';

export type AIProvider = 'openai' | 'anthropic' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning?: string;
}

export interface AIModel {
  id: string;
  description?: string;
}

/**
 * Fetch available models from OpenAI API
 */
export async function fetchOpenAIModels(apiKey: string): Promise<AIModel[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.statusText);
      return getDefaultOpenAIModels();
    }

    const data = await response.json();

    // Filter to only GPT models that support chat completions
    const chatModels = data.data
      .filter((model: any) =>
        model.id.startsWith('gpt-') &&
        !model.id.includes('instruct') &&
        !model.id.includes('vision')
      )
      .map((model: any) => ({
        id: model.id,
        description: getModelDescription(model.id),
      }))
      .sort((a: AIModel, b: AIModel) => {
        // Sort by preference: gpt-3.5, gpt-4, gpt-4-turbo
        const order = ['gpt-3.5', 'gpt-4-turbo', 'gpt-4'];
        const aIndex = order.findIndex(prefix => a.id.startsWith(prefix));
        const bIndex = order.findIndex(prefix => b.id.startsWith(prefix));
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

    return chatModels.length > 0 ? chatModels : getDefaultOpenAIModels();
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return getDefaultOpenAIModels();
  }
}

/**
 * Get default OpenAI models as fallback
 */
function getDefaultOpenAIModels(): AIModel[] {
  return [
    {
      id: 'gpt-3.5-turbo',
      description: 'Fast and cost-effective (recommended)',
    },
    {
      id: 'gpt-4-turbo',
      description: 'Latest GPT-4 with improved performance',
    },
    {
      id: 'gpt-4',
      description: 'Most capable model',
    },
  ];
}

/**
 * Get description for common models
 */
function getModelDescription(modelId: string): string | undefined {
  if (modelId.includes('gpt-3.5-turbo')) {
    return 'Fast and cost-effective (recommended)';
  } else if (modelId.includes('gpt-4-turbo')) {
    return 'Latest GPT-4 with improved performance';
  } else if (modelId.includes('gpt-4') && !modelId.includes('turbo')) {
    return 'Most capable model';
  }
  return undefined;
}

/**
 * Get AI configuration from preferences
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  const prefs = await db.all<Pick<db.DbPreference, 'id' | 'value'>>(
    'SELECT id, value FROM preferences WHERE id IN (?, ?, ?, ?)',
    ['ai-provider', 'ai-api-key', 'ai-model', 'ai-suggest-categories'],
  );

  const config = prefs.reduce((acc, { id, value }) => {
    acc[id] = value;
    return acc;
  }, {} as Record<string, string>);

  if (!config['ai-api-key'] || !config['ai-provider']) {
    return null;
  }

  return {
    provider: (config['ai-provider'] || 'openai') as AIProvider,
    apiKey: config['ai-api-key'],
    model: config['ai-model'] || 'gpt-3.5-turbo',
    enabled: config['ai-suggest-categories'] === 'true',
  };
}

/**
 * Call OpenAI API to get category suggestion
 */
async function callOpenAI(
  config: AIConfig,
  prompt: string,
): Promise<string | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that categorizes financial transactions. ' +
              'Respond with only a JSON object containing categoryId, categoryName, confidence (0-1), and optional reasoning.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

/**
 * Call Anthropic API to get category suggestion
 * @TODO: To be tested - No Anthropic API key available
 */
async function callAnthropic(
  config: AIConfig,
  prompt: string,
): Promise<string | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return null;
  }
}

/**
 * Call custom AI provider
 */
async function callCustomProvider(
  config: AIConfig,
  prompt: string,
): Promise<string | null> {
  // For custom providers, users need to implement their own endpoint
  // This is a placeholder for future extension
  console.warn('Custom AI provider not yet implemented');
  return null;
}

/**
 * Get similar transactions for context
 */
async function getSimilarTransactions(
  payeeName: string,
  accountId: string,
  limit = 10,
): Promise<TransactionEntity[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          { account: accountId },
          { category: { $ne: null } },
          { payee: { $ne: null } },
        ],
      })
      .select('*')
      .orderBy({ date: 'desc' })
      .limit(limit * 2), // Get more initially to filter
  );

  // Simple similarity: exact payee match or payee name contains similar words
  const similar = data.filter((t: TransactionEntity) => {
    if (!t.payee) return false;
    // This would need to be enhanced with actual payee lookup
    return true;
  });

  return similar.slice(0, limit);
}

/**
 * Suggest a category for a transaction using AI
 */
export async function suggestCategory(
  transaction: Partial<TransactionEntity>,
): Promise<CategorySuggestion | null> {
  const config = await getAIConfig();

  if (!config || !config.enabled) {
    return null;
  }

  try {
    // Get available categories
    const categories = await db.getCategories();
    const categoryList = categories
      .filter(c => !c.hidden && !c.is_income)
      .map(c => ({ id: c.id, name: c.name, group: c.cat_group }))
      .slice(0, 50); // Limit to avoid token limits

    // Get similar historical transactions for context
    const similarTransactions = transaction.account
      ? await getSimilarTransactions(
          transaction.payee?.toString() || '',
          transaction.account,
          5,
        )
      : [];

    // Build prompt
    const prompt = `Analyze this transaction and suggest the most appropriate category:

Transaction Details:
- Payee: ${transaction.payee || 'Unknown'}
- Amount: ${transaction.amount || 0}
- Notes: ${transaction.notes || 'None'}
- Date: ${transaction.date || 'Today'}

Available Categories:
${categoryList.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

${
  similarTransactions.length > 0
    ? `Similar Past Transactions:
${similarTransactions
  .map(
    t =>
      `- Amount: ${t.amount}, Category: ${t.category}, Date: ${t.date}, Notes: ${t.notes || 'None'}`,
  )
  .join('\n')}`
    : ''
}

Respond with a JSON object in this exact format:
{
  "categoryId": "category-id-from-list",
  "categoryName": "category-name",
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}`;

    let responseText: string | null = null;

    // Call appropriate AI provider
    switch (config.provider) {
      case 'openai':
        responseText = await callOpenAI(config, prompt);
        break;
      case 'anthropic':
        responseText = await callAnthropic(config, prompt);
        break;
      case 'custom':
        responseText = await callCustomProvider(config, prompt);
        break;
      default:
        console.error('Unknown AI provider:', config.provider);
        return null;
    }

    if (!responseText) {
      return null;
    }

    // Parse response
    const jsonMatch = responseText.match(/\{[\s\S]*}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return null;
    }

    const suggestion: CategorySuggestion = JSON.parse(jsonMatch[0]);

    // Validate the suggestion
    const validCategory = categoryList.find(c => c.id === suggestion.categoryId);
    if (!validCategory) {
      console.error('AI suggested invalid category:', suggestion.categoryId);
      return null;
    }

    return suggestion;
  } catch (error) {
    console.error('Error suggesting category:', error);
    return null;
  }
}

/**
 * Test AI configuration
 */
export async function testAIConfig(
  provider: AIProvider,
  apiKey: string,
  model: string,
): Promise<{ success: boolean; error?: string }> {
  const config: AIConfig = {
    provider,
    apiKey,
    model,
    enabled: true,
  };

  const testPrompt = 'Respond with a JSON object: {"test": "success"}';

  try {
    let response: string | null = null;

    switch (provider) {
      case 'openai':
        response = await callOpenAI(config, testPrompt);
        break;
      case 'anthropic':
        response = await callAnthropic(config, testPrompt);
        break;
      case 'custom':
        response = await callCustomProvider(config, testPrompt);
        break;
    }

    if (!response) {
      return { success: false, error: 'No response from API' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

