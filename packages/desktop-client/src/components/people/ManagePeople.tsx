import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { SvgSearchAlternate } from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getNormalisedString } from 'loot-core/shared/normalisation';

import { PeopleCreationRow } from './PeopleCreationRow';
import { PeopleHeader } from './PeopleHeader';
import { PeopleList } from './PeopleList';

import { Search } from '@desktop-client/components/common/Search';
import { usePeople } from '@desktop-client/hooks/usePeople';
import {
  SelectedProvider,
  useSelected,
} from '@desktop-client/hooks/useSelected';
import {
  deleteAllPeople,
  findPeople,
} from '@desktop-client/people/peopleSlice';
import { useDispatch } from '@desktop-client/redux';

export function ManagePeople() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('');
  const [hoveredPerson, setHoveredPerson] = useState<string>();
  const [create, setCreate] = useState(false);
  const people = usePeople();

  const filteredPeople = useMemo(() => {
    return filter === ''
      ? people
      : people.filter(person =>
          getNormalisedString(person.tag).includes(getNormalisedString(filter)),
        );
  }, [filter, people]);

  const selectedInst = useSelected('manage-people', filteredPeople, []);

  const onDeleteSelected = useCallback(async () => {
    dispatch(deleteAllPeople([...selectedInst.items]));
    selectedInst.dispatch({ type: 'select-none' });
  }, [dispatch, selectedInst]);

  return (
    <SelectedProvider instance={selectedInst}>
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 0 15px',
            flexShrink: 0,
          }}
        >
          <View
            style={{
              color: theme.pageTextLight,
              flexDirection: 'row',
              alignItems: 'center',
              width: '50%',
            }}
          >
            <Trans>User defined people tags with color and description.</Trans>
          </View>
        </View>
        <SpaceBetween gap={10} style={{ marginTop: 12, alignItems: 'center' }}>
          <Button variant="bare" onPress={() => setCreate(true)}>
            <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
            <Trans>Add New</Trans>
          </Button>
          <Button variant="bare" onPress={() => dispatch(findPeople())}>
            <SvgSearchAlternate
              width={10}
              height={10}
              style={{ marginRight: 3 }}
            />
            <Trans>Find Existing People</Trans>
          </Button>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Filter people...')}
            value={filter}
            onChange={setFilter}
          />
        </SpaceBetween>
        <View style={{ flex: 1, marginTop: 12 }}>
          <PeopleHeader />
          {create && (
            <PeopleCreationRow
              onClose={() => setCreate(false)}
              people={people}
            />
          )}
          {people.length ? (
            <PeopleList
              people={filteredPeople}
              selectedItems={selectedInst.items}
              hoveredPerson={hoveredPerson}
              onHover={id => setHoveredPerson(id ?? undefined)}
            />
          ) : (
            <View
              style={{
                background: theme.tableBackground,
                fontStyle: 'italic',
              }}
            >
              <Text style={{ margin: 'auto', padding: '20px' }}>
                <Trans>No People</Trans>
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            paddingBlock: 15,
            paddingInline: 0,
            borderTop: theme.pillBorder,
            flexShrink: 0,
          }}
        >
          <SpaceBetween
            gap={10}
            style={{ alignItems: 'center', justifyContent: 'flex-end' }}
          >
            {selectedInst.items.size > 0 && (
              <Button onPress={onDeleteSelected}>
                <Trans count={selectedInst.items.size}>
                  Delete {selectedInst.items.size} people
                </Trans>
              </Button>
            )}
          </SpaceBetween>
        </View>
      </View>
    </SelectedProvider>
  );
}
