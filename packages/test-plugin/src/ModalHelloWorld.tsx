import React, { useState, useEffect, useCallback } from 'react';
import { Trans } from 'react-i18next';

import {
  PluginContext,
  Button,
  ModalHeader,
  View,
  Stack,
  Text,
  Input,
  theme,
} from '@actual-app/plugins-core';

type DummyItem = {
  id: number;
  name: string;
  description: string;
  value: number;
  created_at: string;
};

type ModalHelloWorldProps = {
  text: string;
  context: PluginContext;
};

export function ModalHelloWorld({ text, context }: ModalHelloWorldProps) {
  const [items, setItems] = useState<DummyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemValue, setNewItemValue] = useState('');

  // Fetch data from database using AQL
  const fetchItems = useCallback(async () => {
    if (!context.db) {
      setLoading(false);
      return;
    }

    try {
      const result = await context.db.aql(
        context.q('dummy_items').select('*').orderBy({ created_at: 'desc' }),
        { target: 'plugin' },
      );

      setItems((result.data as DummyItem[]) || []);
    } catch {
      // Handle error silently or with user-friendly message
    } finally {
      setLoading(false);
    }
  }, [context]);

  // Add new item to database
  const addItem = async () => {
    if (!context.db || !newItemName.trim()) {
      return;
    }

    try {
      await context.db.runQuery(
        'INSERT INTO dummy_items (name, description, value) VALUES (?, ?, ?)',
        [
          newItemName.trim(),
          newItemDescription.trim(),
          parseFloat(newItemValue) || 0,
        ],
      );

      // Clear form
      setNewItemName('');
      setNewItemDescription('');
      setNewItemValue('');

      // Refresh data
      await fetchItems();
    } catch {
      // Handle error silently or with user-friendly message
    }
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <>
      <ModalHeader title={text} />
      <View style={{ padding: 20, minWidth: 500 }}>
        <View>
          <Text>
            This modal demonstrates database functionality. Below are items from
            the dummy_items table:
          </Text>

          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <>
              <View style={{ marginTop: 10 }}>
                {items.length === 0 ? (
                  <Text>
                    <Trans>No items found</Trans>
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {items.map(item => (
                      <View
                        key={item.id}
                        style={{
                          padding: 16,
                          borderRadius: 4,
                          backgroundColor: theme.tableBackground,
                          gap: 10,
                        }}
                      >
                        <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                        <Text>{item.description}</Text>
                        <Text style={{ color: '#666' }}>
                          Value: ${item.value.toFixed(2)} | Created:{' '}
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ borderTop: '1px solid #ddd', paddingTop: 15 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
                  Add New Item:
                </Text>
                <Stack spacing={2}>
                  <Input
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="Enter item name"
                  />

                  <Input
                    value={newItemDescription}
                    onChange={e => setNewItemDescription(e.target.value)}
                    placeholder="Enter description"
                  />

                  <Input
                    type="number"
                    step="0.01"
                    value={newItemValue}
                    onChange={e => setNewItemValue(e.target.value)}
                    placeholder="0.00"
                  />

                  <View style={{ display: 'flex', gap: 10 }}>
                    <Button
                      variant="primary"
                      onPress={addItem}
                      isDisabled={!newItemName.trim()}
                    >
                      <Trans>Add Item</Trans>
                    </Button>

                    <Button
                      variant="primary"
                      onPress={() => context.popModal()}
                    >
                      <Trans>Close</Trans>
                    </Button>
                  </View>
                </Stack>
              </View>
            </>
          )}
        </View>
      </View>
    </>
  );
}
