import React, {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type TagEntity } from 'loot-core/types/models';

import {
  InputCell,
  Row,
  useTableNavigator,
} from '@desktop-client/components/table';
import { useInitialMount } from '@desktop-client/hooks/useInitialMount';
import { usePeopleCSS } from '@desktop-client/hooks/usePeopleCSS';
import { useProperFocus } from '@desktop-client/hooks/useProperFocus';
import { createPerson } from '@desktop-client/people/peopleSlice';
import { useDispatch } from '@desktop-client/redux';

type PeopleCreationRowProps = {
  people: TagEntity[];
  onClose: () => void;
};

export const PeopleCreationRow = ({
  onClose,
  people,
}: PeopleCreationRowProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [person, setPerson] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const personInput = useRef<HTMLInputElement>(null);
  const getPeopleCSS = usePeopleCSS();

  const personNames = useMemo(() => people.map(p => p.tag), [people]);

  const tableNavigator = useTableNavigator(
    [{ id: 'new-person' }],
    !person || personNames.includes(person.toLowerCase())
      ? ['person', 'description', 'color', 'cancel']
      : ['person', 'description', 'color', 'cancel', 'add'],
  );

  const colorButtonRef = useRef(null);
  useProperFocus(colorButtonRef, tableNavigator.focusedField === 'color');
  const addButtonRef = useRef(null);
  useProperFocus(addButtonRef, tableNavigator.focusedField === 'add');
  const cancelButtonRef = useRef(null);
  useProperFocus(cancelButtonRef, tableNavigator.focusedField === 'cancel');

  const resetInputs = () => {
    setColor(null);
    setPerson('');
    setDescription('');
    tableNavigator.onEdit('new-person', 'person');
  };

  const isPersonValid = () => {
    return (
      /^[^@\s]+$/.test(person) && // accept any char except whitespaces and '@'
      !personNames.includes(person.toLowerCase()) && // does not exist already (case-insensitive)
      // color is null (default color) or is a 6 char hex color
      (color === null || /^#[0-9a-fA-F]{6}$/.test(color))
    );
  };

  const onAddPerson = () => {
    if (!isPersonValid()) {
      return;
    }

    // Normalize to lowercase when creating
    dispatch(createPerson({ tag: person.toLowerCase(), color, description }));
    resetInputs();
  };

  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount) {
      tableNavigator.onEdit('new-person', 'person');
    }
  }, [isInitialMount, tableNavigator]);

  return (
    <View
      style={{
        paddingBottom: 1,
        backgroundColor: theme.tableBackground,
      }}
      data-testid="new-person"
      {...tableNavigator.getNavigatorProps({
        onKeyUp: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Escape') {
            onClose();
          }
          if (e.key === 'Enter' && person) {
            onAddPerson();
          }
        },
      })}
    >
      <Row
        height={34}
        style={{
          padding: '0px 20px',
          width: '100%',
          backgroundColor: theme.tableBackground,
          gap: 5,
        }}
        collapsed
      >
        <InputCell
          width={250}
          name="person"
          textAlign="flex"
          exposed={tableNavigator.focusedField === 'person'}
          onExpose={name => tableNavigator.onEdit('new-person', name)}
          value={person || t('New person')}
          valueStyle={
            person ? {} : { fontStyle: 'italic', color: theme.tableTextLight }
          }
          inputProps={{
            value: person || '',
            onInput: ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
              setPerson(value.replace(/\s/g, '')),
            placeholder: t('New person'),
            ref: personInput,
          }}
        />

        <InputCell
          width="flex"
          name="description"
          textAlign="flex"
          exposed={tableNavigator.focusedField === 'description'}
          onExpose={name => tableNavigator.onEdit('new-person', name)}
          value={description || t('Person description')}
          valueStyle={
            description
              ? {}
              : { fontStyle: 'italic', color: theme.tableTextLight }
          }
          inputProps={{
            value: description || '',
            onUpdate: setDescription,
            placeholder: t('Person description'),
          }}
        />
      </Row>
      <Row
        height="auto"
        style={{
          padding: '6px 20px',
          width: '100%',
          backgroundColor: theme.tableBackground,
          gap: 10,
          alignItems: 'center',
          borderBottom: '1px solid ' + theme.tableBorderHover,
        }}
        collapsed
      >
        <Trans>Choose Color:</Trans>
        <ColorPicker
          value={color ?? undefined}
          onChange={color => setColor(color.toString('hex'))}
        >
          <Button
            ref={colorButtonRef}
            variant="bare"
            className={getPeopleCSS('', { color })}
          >
            @{person}
          </Button>
        </ColorPicker>
        <SpaceBetween
          gap={10}
          style={{
            marginLeft: 'auto',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="normal"
            style={{ padding: '4px 10px' }}
            onPress={onClose}
            data-testid="close-button"
            ref={cancelButtonRef}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="primary"
            style={{ padding: '4px 10px' }}
            onPress={onAddPerson}
            data-testid="add-button"
            isDisabled={!isPersonValid()}
            ref={addButtonRef}
          >
            <Trans>Add</Trans>
          </Button>
        </SpaceBetween>
      </Row>
    </View>
  );
};
