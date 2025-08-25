import { createSlice } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type TagEntity } from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'tags';

type TagsState = {
  tags: TagEntity[];
  isTagsLoading: boolean;
  isTagsLoaded: boolean;
  isTagsDirty: boolean;
};

const initialState: TagsState = {
  tags: [],
  isTagsLoading: false,
  isTagsLoaded: false,
  isTagsDirty: false,
};

const tagSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    markTagsDirty(state) {
      _markTagsDirty(state);
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);

    builder.addCase(createTag.fulfilled, _markTagsDirty);
    builder.addCase(deleteTag.fulfilled, _markTagsDirty);
    builder.addCase(deleteAllTags.fulfilled, _markTagsDirty);
    builder.addCase(updateTag.fulfilled, _markTagsDirty);

    builder.addCase(reloadTags.fulfilled, (state, action) => {
      _loadTags(state, action.payload);
    });

    builder.addCase(reloadTags.rejected, state => {
      state.isTagsLoading = false;
    });

    builder.addCase(reloadTags.pending, state => {
      state.isTagsLoading = true;
    });

    builder.addCase(getTags.fulfilled, (state, action) => {
      _loadTags(state, action.payload);
    });

    builder.addCase(getTags.rejected, state => {
      state.isTagsLoading = false;
    });

    builder.addCase(getTags.pending, state => {
      state.isTagsLoading = true;
    });

    builder.addCase(findTags.fulfilled, (state, action) => {
      _loadTags(state, action.payload);
    });

    builder.addCase(findTags.rejected, state => {
      state.isTagsLoading = false;
    });

    builder.addCase(findTags.pending, state => {
      state.isTagsLoading = true;
    });
  },
});

export const getTags = createAppAsyncThunk(
  `${sliceName}/getTags`,
  async () => {
    const tags: TagEntity[] = await send('tags-get');
    return tags;
  },
  {
    condition: (_, { getState }) => {
      const { tags } = getState();
      return !tags.isTagsLoading && (tags.isTagsDirty || !tags.isTagsLoaded);
    },
  },
);

export const reloadTags = createAppAsyncThunk(
  `${sliceName}/reloadTags`,
  async () => {
    const tags: TagEntity[] = await send('tags-get');
    return tags;
  },
);

export const createTag = createAppAsyncThunk(
  `${sliceName}/createTag`,
  async ({ tag, color, description }: Omit<TagEntity, 'id'>) => {
    const id = await send('tags-create', { tag, color, description });
    return id;
  },
);

export const deleteTag = createAppAsyncThunk(
  `${sliceName}/deleteTag`,
  async (tag: TagEntity) => {
    const id = await send('tags-delete', tag);
    return id;
  },
);

export const deleteAllTags = createAppAsyncThunk(
  `${sliceName}/deleteAllTags`,
  async (ids: Array<TagEntity['id']>) => {
    const id = await send('tags-delete-all', ids);
    return id;
  },
);

export const updateTag = createAppAsyncThunk(
  `${sliceName}/updateTag`,
  async (tag: TagEntity) => {
    const id = await send('tags-update', tag);
    return id;
  },
);

export const findTags = createAppAsyncThunk(
  `${sliceName}/findTags`,
  async () => {
    const tags: TagEntity[] = await send('tags-find');
    return tags;
  },
);

export const { name, reducer, getInitialState } = tagSlice;

export const actions = {
  ...tagSlice.actions,
  getTags,
  reloadTags,
  createTag,
  deleteTag,
  deleteAllTags,
  updateTag,
  findTags,
};

export const { markTagsDirty } = tagSlice.actions;

function _loadTags(state: TagsState, tags: TagsState['tags']) {
  state.tags = tags;
  state.isTagsLoading = false;
  state.isTagsLoaded = true;
  state.isTagsDirty = false;
}

function _markTagsDirty(state: TagsState) {
  state.isTagsDirty = true;
}
