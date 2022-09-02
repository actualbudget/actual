import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TextInput, NativeModules } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import q from 'loot-core/src/client/query-helpers';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import { throwError } from 'loot-core/src/shared/util';
import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { ListItem } from 'loot-design/src/components/mobile/table';
import { colors } from 'loot-design/src/style';
import Add from 'loot-design/src/svg/v1/Add';

const queries = {
  payees: q('payees').select('*'),
  categories: q('categories')
    .select(['*', 'group.name'])
    .orderBy(['is_income', 'group.name']),
  accounts: q('accounts')
    .select('*')
    .orderBy('name')
};

const ACTScrollViewManager =
  NativeModules && NativeModules.ACTScrollViewManager;

export default function GenericSearchableSelect({
  title,
  dataName,
  canAdd,
  formatItem,
  onSelect
}) {
  let [text, setText] = useState('');
  let inputRef = useRef(null);
  let scrollRef = useRef(null);

  let { data: allData } = useLiveQuery(
    queries[dataName] || throwError(new Error('Unknown data type: ' + dataName))
  );

  let data = useMemo(() => {
    if (allData) {
      let data = allData.filter(item => {
        if (text != '' && text != null) {
          return item.name.toLowerCase().includes(text.toLowerCase());
        }
        return item.name !== '';
      });

      if (canAdd) {
        data.unshift({ id: 'new', name: '' });
      }
      return data;
    }
    return allData;
  }, [allData, text, canAdd]);

  useEffect(() => {
    let list = scrollRef.current;
    if (list) {
      ACTScrollViewManager.activate(
        (list.getNode ? list.getNode() : list).getScrollableNode()
      );
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  let onFilter = text => {
    setText(text);
  };

  let renderItem = ({ item }) => {
    let isNew = item.id === 'new';

    if (isNew && text === '') {
      return null;
    }

    let display = formatItem ? formatItem(item) : item.name;

    return (
      <RectButton
        onPress={() => onSelect && onSelect(isNew ? 'new:' + text : item.id)}
        underlayColor="#f0f0f0"
        activeOpacity={1}
        style={{ backgroundColor: 'white' }}
      >
        <ListItem
          style={{
            backgroundColor: 'transparent',
            borderColor: '#e0e0e0'
          }}
        >
          {isNew ? (
            <>
              <Add
                width={10}
                height={10}
                style={{ color: colors.g3, marginRight: 5 }}
              />
              <Text style={[{ fontSize: 15, flex: 1, color: colors.g3 }]}>
                {'Create Payee ' + text}
              </Text>
            </>
          ) : typeof display === 'string' ? (
            <Text style={[{ fontSize: 15, flex: 1 }]}>{display}</Text>
          ) : (
            display
          )}
        </ListItem>
      </RectButton>
    );
  };

  return (
    <KeyboardAvoidingView>
      <FocusAwareStatusBar barStyle="light-content" />
      <View style={{ padding: 10 }}>
        <Text
          style={{
            textAlign: 'center',
            color: '#505050',
            marginBottom: 10,
            fontSize: 15,
            fontWeight: '600',
            marginVertical: 10
          }}
        >
          {title}
        </Text>
        <TextInput
          ref={inputRef}
          autoCorrect={false}
          blurOnSubmit={false}
          placeholder="Search"
          onChangeText={onFilter}
          style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            padding: 5,
            backgroundColor: 'white',
            borderRadius: 4,
            fontSize: 15
          }}
        />
      </View>
      {data == null ? null : (
        <FlatList
          ref={scrollRef}
          data={data}
          renderItem={renderItem}
          keyboardShouldPersistTaps={true}
          automaticallyAdjustContentInsets={false}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
        />
      )}
    </KeyboardAvoidingView>
  );
}
