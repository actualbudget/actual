import { createSlice } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type TagEntity } from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'people';

type PeopleState = {
  people: TagEntity[];
  isPeopleLoading: boolean;
  isPeopleLoaded: boolean;
  isPeopleDirty: boolean;
};

const initialState: PeopleState = {
  people: [],
  isPeopleLoading: false,
  isPeopleLoaded: false,
  isPeopleDirty: false,
};

const peopleSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    markPeopleDirty(state) {
      _markPeopleDirty(state);
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);

    builder.addCase(createPerson.fulfilled, _markPeopleDirty);
    builder.addCase(deletePerson.fulfilled, _markPeopleDirty);
    builder.addCase(deleteAllPeople.fulfilled, _markPeopleDirty);
    builder.addCase(updatePerson.fulfilled, _markPeopleDirty);

    builder.addCase(reloadPeople.fulfilled, (state, action) => {
      _loadPeople(state, action.payload);
    });

    builder.addCase(reloadPeople.rejected, state => {
      state.isPeopleLoading = false;
    });

    builder.addCase(reloadPeople.pending, state => {
      state.isPeopleLoading = true;
    });

    builder.addCase(getPeople.fulfilled, (state, action) => {
      _loadPeople(state, action.payload);
    });

    builder.addCase(getPeople.rejected, state => {
      state.isPeopleLoading = false;
    });

    builder.addCase(getPeople.pending, state => {
      state.isPeopleLoading = true;
    });

    builder.addCase(findPeople.fulfilled, (state, action) => {
      _loadPeople(state, action.payload);
    });

    builder.addCase(findPeople.rejected, state => {
      state.isPeopleLoading = false;
    });

    builder.addCase(findPeople.pending, state => {
      state.isPeopleLoading = true;
    });
  },
});

export const getPeople = createAppAsyncThunk(
  `${sliceName}/getPeople`,
  async () => {
    const people: TagEntity[] = await send('people-get');
    return people;
  },
  {
    condition: (_, { getState }) => {
      const { people } = getState();
      return (
        !people.isPeopleLoading &&
        (people.isPeopleDirty || !people.isPeopleLoaded)
      );
    },
  },
);

export const reloadPeople = createAppAsyncThunk(
  `${sliceName}/reloadPeople`,
  async () => {
    const people: TagEntity[] = await send('people-get');
    return people;
  },
);

export const createPerson = createAppAsyncThunk(
  `${sliceName}/createPerson`,
  async ({ tag, color, description }: Omit<TagEntity, 'id' | 'type'>) => {
    const id = await send('people-create', { tag, color, description });
    return id;
  },
);

export const deletePerson = createAppAsyncThunk(
  `${sliceName}/deletePerson`,
  async (person: TagEntity) => {
    const id = await send('people-delete', person);
    return id;
  },
);

export const deleteAllPeople = createAppAsyncThunk(
  `${sliceName}/deleteAllPeople`,
  async (ids: Array<TagEntity['id']>) => {
    const id = await send('people-delete-all', ids);
    return id;
  },
);

export const updatePerson = createAppAsyncThunk(
  `${sliceName}/updatePerson`,
  async (person: TagEntity) => {
    const id = await send('people-update', person);
    return id;
  },
);

export const findPeople = createAppAsyncThunk(
  `${sliceName}/findPeople`,
  async () => {
    const people: TagEntity[] = await send('people-find');
    return people;
  },
);

export const { name, reducer, getInitialState } = peopleSlice;

export const actions = {
  ...peopleSlice.actions,
  getPeople,
  reloadPeople,
  createPerson,
  deletePerson,
  deleteAllPeople,
  updatePerson,
  findPeople,
};

export const { markPeopleDirty } = peopleSlice.actions;

function _loadPeople(state: PeopleState, people: PeopleState['people']) {
  state.people = people;
  state.isPeopleLoading = false;
  state.isPeopleLoaded = true;
  state.isPeopleDirty = false;
}

function _markPeopleDirty(state: PeopleState) {
  state.isPeopleDirty = true;
}
