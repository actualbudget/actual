import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import { Checkbox } from '@desktop-client/components/forms';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

import { Setting } from './UI';

interface AIModel {
  id: string;
  description?: string;
}

export function AISettings() {
  const { t } = useTranslation();
  const [provider, setProvider] = useSyncedPref('ai-provider');
  const [apiKey, setApiKey] = useSyncedPref('ai-api-key');
  const [model, setModel] = useSyncedPref('ai-model');
  const [suggestCategories, setSuggestCategories] =
    useSyncedPref('ai-suggest-categories');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Set default provider to OpenAI (only supported provider for now)
  const currentProvider = 'openai';

  // Determine if we should show advanced options (models and features)
  // Show if: API key is already saved OR test was successful
  const hasStoredApiKey = Boolean(apiKey);
  const shouldShowAdvancedOptions =
    hasStoredApiKey && (testResult?.success || model); // Show if key exists AND (tested successfully OR model already selected)

  // Load models automatically if API key is already stored and we haven't loaded them yet
  useEffect(() => {
    const shouldAutoLoadModels =
      hasStoredApiKey &&
      !loadingModels &&
      availableModels.length === 0 &&
      !testResult;

    if (shouldAutoLoadModels) {
      setLoadingModels(true);
      send('api/ai-get-models', {
        provider: currentProvider,
        apiKey,
      })
        .then(models => {
          setAvailableModels(models);
          // Set default model if none selected
          if (!model && models.length > 0) {
            setModel(models[0].id);
          }
        })
        .catch(error => {
          console.error('Error fetching models:', error);
          // Fall back to default models
          setAvailableModels(getDefaultModels(currentProvider));
        })
        .finally(() => {
          setLoadingModels(false);
        });
    }
  }, [hasStoredApiKey, loadingModels, availableModels.length, testResult, apiKey, currentProvider, model, setModel]);

  const handleTestConnection = async () => {
    if (!apiKey) {
      setTestResult({
        success: false,
        error: 'Please enter your API key first',
      });
      return;
    }

    // Save provider
    setProvider(currentProvider);

    setTesting(true);
    setTestResult(null);

    try {
      const result = await send('api/ai-test-config', {
        provider: currentProvider,
        apiKey,
        model: model || getDefaultModel(currentProvider),
      });
      setTestResult(result);

      // If test successful, fetch available models
      if (result.success) {
        setLoadingModels(true);
        try {
          const models = await send('api/ai-get-models', {
            provider: currentProvider,
            apiKey,
          });
          setAvailableModels(models);

          // Set default model if test successful and no model selected
          if (!model && models.length > 0) {
            setModel(models[0].id);
          }
        } catch (error) {
          console.error('Error fetching models:', error);
          // Fall back to default models
          setAvailableModels(getDefaultModels(currentProvider));
          if (!model) {
            setModel(getDefaultModel(currentProvider));
          }
        } finally {
          setLoadingModels(false);
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  const getDefaultModel = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      default:
        return '';
    }
  };

  const getDefaultModels = (provider: string): AIModel[] => {
    switch (provider) {
      case 'openai':
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
      case 'anthropic':
        return [
          {
            id: 'claude-3-haiku-20240307',
            description: 'Fastest',
          },
          {
            id: 'claude-3-sonnet-20240229',
            description: 'Balanced',
          },
          {
            id: 'claude-3-opus-20240229',
            description: 'Most capable',
          },
        ];
      default:
        return [];
    }
  };

  const providerOptions: Array<[string, string]> = [
    ['openai', 'OpenAI'],
    // ['anthropic', 'Anthropic (Claude) - Coming Soon'],
    // ['custom', 'Custom Provider - Coming Soon'],
  ];

  // Convert available models to Select options format
  const modelSelectOptions: Array<[string, string]> = availableModels.map(
    m => {
      // Use id as the display name, with description as additional info
      const label = m.description ? `${m.id} - ${m.description}` : m.id;
      return [m.id, label];
    },
  );

  return (
    <Setting>
      <Text>
        <Trans>
          <strong>AI Assistant.</strong> Configure generative AI to help with
          transaction categorization and other features. Your API key is stored
          locally and only used to make API calls from your device.
        </Trans>
      </Text>

      <View style={{ gap: '1em', marginTop: '1em' }}>
        <View style={{ gap: '0.5em' }}>
          <Text style={{ fontWeight: 500 }}>
            <Trans>AI Provider</Trans>
          </Text>
          <Select
            value={currentProvider}
            onChange={e => {
              const newProvider = e.target.value;
              setProvider(newProvider);
              if (newProvider) {
                setModel(getDefaultModel(newProvider));
              }
            }}
            options={providerOptions}
            disabled={true}
          />
          <Text style={{ fontSize: '0.85em', color: theme.pageTextSubdued }}>
            <Trans>
              OpenAI is currently the only supported provider. Support for
              Anthropic (Claude) and custom providers is coming soon.
            </Trans>
          </Text>
        </View>

        <View style={{ gap: '0.5em' }}>
          <Text style={{ fontWeight: 500 }}>
            <Trans>API Key</Trans>
          </Text>
          <View
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}
          >
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey || ''}
              onChange={e => setApiKey(e.target.value)}
              placeholder={t('Enter your API key...')}
              style={{ flex: 1 }}
            />
            <Button
              variant="bare"
              onPress={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? t('Hide') : t('Show')}
            </Button>
          </View>
          <Text style={{ fontSize: '0.85em', color: theme.pageTextSubdued }}>
            <Trans>
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenAI Platform
              </a>
              . You'll need to create an account and add billing information.
            </Trans>
          </Text>
        </View>

        <View style={{ gap: '0.5em' }}>
          <Button
            variant="primary"
            onPress={handleTestConnection}
            isDisabled={testing || !apiKey}
          >
            {testing ? t('Testing...') : t('Test Connection')}
          </Button>
          {testResult && (
            <Text
              style={{
                color: testResult.success
                  ? theme.noticeTextLight
                  : theme.errorText,
                fontWeight: 500,
              }}
            >
              {testResult.success ? (
                <Trans>✓ Connection successful!</Trans>
              ) : (
                <Trans>✗ Connection failed: {testResult.error}</Trans>
              )}
            </Text>
          )}
          {!hasStoredApiKey && (
            <Text
              style={{
                fontSize: '0.85em',
                color: theme.pageTextSubdued,
                fontStyle: 'italic',
                marginTop: '0.5em',
              }}
            >
              <Trans>
                💡 Enter your API key and test the connection to configure AI features.
              </Trans>
            </Text>
          )}
        </View>

        {shouldShowAdvancedOptions && (
          <>
            <View style={{ gap: '0.5em' }}>
              <Text style={{ fontWeight: 500 }}>
                <Trans>Model</Trans>
              </Text>
              {loadingModels ? (
                <Text style={{ fontSize: '0.9em', color: theme.pageTextSubdued }}>
                  <Trans>Loading available models...</Trans>
                </Text>
              ) : (
                <>
                  <Select
                    value={model || (availableModels[0]?.id ?? '')}
                    onChange={e => setModel(e.target.value)}
                    options={modelSelectOptions}
                    disabled={loadingModels || modelSelectOptions.length === 0}
                  />
                  <Text
                    style={{ fontSize: '0.85em', color: theme.pageTextSubdued }}
                  >
                    <Trans>
                      Models are loaded from your OpenAI account. Select the model
                      that best fits your needs and budget.
                    </Trans>
                  </Text>
                </>
              )}
            </View>

            <View style={{ marginTop: '1em', gap: '0.5em' }}>
              <Text style={{ fontWeight: 600, fontSize: '1.1em' }}>
                <Trans>Features</Trans>
              </Text>

              <label style={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={suggestCategories === 'true'}
                  onChange={() =>
                    setSuggestCategories(
                      suggestCategories === 'true' ? 'false' : 'true',
                    )
                  }
                />
                <View>
                  <Text>
                    <Trans>AI Category Suggestions</Trans>
                  </Text>
                  <Text
                    style={{
                      fontSize: '0.85em',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    <Trans>
                      Automatically suggest categories for new transactions
                      based on transaction details and history
                    </Trans>
                  </Text>
                </View>
              </label>
            </View>

            <View
              style={{
                marginTop: '1em',
                padding: '1em',
                backgroundColor: theme.tableBackground,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  fontSize: '0.85em',
                  color: theme.pageTextSubdued,
                  fontStyle: 'italic',
                }}
              >
                <Trans>
                  <strong>Privacy Note:</strong> When AI features are enabled,
                  transaction data (payee, amount, notes) will be sent to your
                  chosen AI provider's API. Your API key and transaction data
                  are never stored on Actual's servers. Review your AI
                  provider's privacy policy for how they handle data.
                </Trans>
              </Text>
            </View>
          </>
        )}
      </View>
    </Setting>
  );
}

