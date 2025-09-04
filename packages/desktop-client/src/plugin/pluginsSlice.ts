import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Query, type AQLQueryOptions } from 'plugins-core/index';

import { send } from 'loot-core/platform/client/fetch';

import { resetApp } from '@desktop-client/app/appSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'plugins';

export const getPluginFiles = createAppAsyncThunk(
  `${sliceName}/getPluginFiles`,
  async (args: { pluginUrl: string }) => {
    const result = await send('plugin-files', args);
    return result;
  },
);

export const createPluginDatabase = createAppAsyncThunk(
  `${sliceName}/createPluginDatabase`,
  async (args: { pluginId: string }) => {
    const result = await send('plugin-create-database', args);
    return result;
  },
);

export const queryPluginDatabase = createAppAsyncThunk(
  `${sliceName}/queryPluginDatabase`,
  async (args: {
    pluginId: string;
    sql: string;
    params?: (string | number)[];
    fetchAll?: boolean;
  }) => {
    const result = await send('plugin-database-query', args);
    return result;
  },
);

export const execPluginDatabase = createAppAsyncThunk(
  `${sliceName}/execPluginDatabase`,
  async (args: { pluginId: string; sql: string }) => {
    const result = await send('plugin-database-exec', args);
    return result;
  },
);

export const transactionPluginDatabase = createAppAsyncThunk(
  `${sliceName}/transactionPluginDatabase`,
  async (args: {
    pluginId: string;
    operations: Array<{
      type: 'exec' | 'query';
      sql: string;
      params?: (string | number)[];
      fetchAll?: boolean;
    }>;
  }) => {
    const result = await send('plugin-database-transaction', args);
    return result;
  },
);

export const runPluginMigrations = createAppAsyncThunk(
  `${sliceName}/runPluginMigrations`,
  async (args: {
    pluginId: string;
    migrations: Array<[number, string, string, string]>;
  }) => {
    const result = await send('plugin-run-migrations', args);
    return result;
  },
);

export const getPluginMigrations = createAppAsyncThunk(
  `${sliceName}/getPluginMigrations`,
  async (args: { pluginId: string }) => {
    const result = await send('plugin-database-get-migrations', args);
    return result;
  },
);

export const setPluginMetadata = createAppAsyncThunk(
  `${sliceName}/setPluginMetadata`,
  async (args: { pluginId: string; key: string; value: string }) => {
    const result = await send('plugin-database-set-metadata', args);
    return result;
  },
);

export const getPluginMetadata = createAppAsyncThunk(
  `${sliceName}/getPluginMetadata`,
  async (args: { pluginId: string; key: string }) => {
    const result = await send('plugin-database-get-metadata', args);
    return result;
  },
);

export const queryPluginAql = createAppAsyncThunk(
  `${sliceName}/queryPluginAql`,
  async (args: {
    pluginId: string;
    query: Query;
    options?: AQLQueryOptions;
  }) => {
    const result = await send('plugin-aql-query', args);
    return result;
  },
);

type PluginFile = {
  name: string;
  content: string;
  type: 'file' | 'directory';
  path: string;
};

type PluginsState = {
  files: Record<string, PluginFile[]>; // keyed by pluginUrl
  databases: Record<string, boolean>; // keyed by pluginId, value indicates if database exists
  metadata: Record<string, Record<string, string>>; // keyed by pluginId, then by metadata key
  migrations: Record<string, string[]>; // keyed by pluginId
  loading: {
    files: Record<string, boolean>; // keyed by pluginUrl
    databases: Record<string, boolean>; // keyed by pluginId
    queries: Record<string, boolean>; // keyed by operation identifier
  };
  errors: {
    files: Record<string, string | null>; // keyed by pluginUrl
    databases: Record<string, string | null>; // keyed by pluginId
    queries: Record<string, string | null>; // keyed by operation identifier
  };
};

const initialState: PluginsState = {
  files: {},
  databases: {},
  metadata: {},
  migrations: {},
  loading: {
    files: {},
    databases: {},
    queries: {},
  },
  errors: {
    files: {},
    databases: {},
    queries: {},
  },
};

const pluginsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    clearPluginFiles(state, action: PayloadAction<{ pluginUrl: string }>) {
      const { pluginUrl } = action.payload;
      delete state.files[pluginUrl];
      delete state.loading.files[pluginUrl];
      delete state.errors.files[pluginUrl];
    },
    clearPluginDatabase(state, action: PayloadAction<{ pluginId: string }>) {
      const { pluginId } = action.payload;
      delete state.databases[pluginId];
      delete state.metadata[pluginId];
      delete state.migrations[pluginId];
      delete state.loading.databases[pluginId];
      delete state.errors.databases[pluginId];
    },
    clearPluginErrors(state) {
      state.errors = {
        files: {},
        databases: {},
        queries: {},
      };
    },
  },
  extraReducers: builder => {
    builder
      .addCase(resetApp, () => initialState)
      // Plugin files
      .addCase(getPluginFiles.pending, (state, action) => {
        const pluginUrl = action.meta.arg.pluginUrl;
        state.loading.files[pluginUrl] = true;
        state.errors.files[pluginUrl] = null;
      })
      .addCase(getPluginFiles.fulfilled, (state, action) => {
        const pluginUrl = action.meta.arg.pluginUrl;
        state.loading.files[pluginUrl] = false;
        state.files[pluginUrl] = action.payload as PluginFile[];
      })
      .addCase(getPluginFiles.rejected, (state, action) => {
        const pluginUrl = action.meta.arg.pluginUrl;
        state.loading.files[pluginUrl] = false;
        state.errors.files[pluginUrl] =
          action.error.message || 'Failed to load plugin files';
      })
      // Plugin database creation
      .addCase(createPluginDatabase.pending, (state, action) => {
        const pluginId = action.meta.arg.pluginId;
        state.loading.databases[pluginId] = true;
        state.errors.databases[pluginId] = null;
      })
      .addCase(createPluginDatabase.fulfilled, (state, action) => {
        const pluginId = action.meta.arg.pluginId;
        state.loading.databases[pluginId] = false;
        const result = action.payload as { success: boolean };
        state.databases[pluginId] = result.success;
      })
      .addCase(createPluginDatabase.rejected, (state, action) => {
        const pluginId = action.meta.arg.pluginId;
        state.loading.databases[pluginId] = false;
        state.errors.databases[pluginId] =
          action.error.message || 'Failed to create plugin database';
      })
      // Plugin migrations
      .addCase(getPluginMigrations.fulfilled, (state, action) => {
        const pluginId = action.meta.arg.pluginId;
        state.migrations[pluginId] = action.payload as string[];
      })
      .addCase(runPluginMigrations.fulfilled, () => {
        // Migration results are handled by the calling code
        // but we could store them if needed
      })
      // Plugin metadata
      .addCase(getPluginMetadata.fulfilled, (state, action) => {
        const { pluginId, key } = action.meta.arg;
        if (!state.metadata[pluginId]) {
          state.metadata[pluginId] = {};
        }
        state.metadata[pluginId][key] = action.payload as string;
      })
      .addCase(setPluginMetadata.fulfilled, (state, action) => {
        const { pluginId, key, value } = action.meta.arg;
        if (!state.metadata[pluginId]) {
          state.metadata[pluginId] = {};
        }
        state.metadata[pluginId][key] = value;
      });
  },
});

export const { name, reducer, getInitialState } = pluginsSlice;

export const actions = {
  ...pluginsSlice.actions,
  getPluginFiles,
  createPluginDatabase,
  queryPluginDatabase,
  execPluginDatabase,
  transactionPluginDatabase,
  runPluginMigrations,
  getPluginMigrations,
  setPluginMetadata,
  getPluginMetadata,
  queryPluginAql,
};

export const { clearPluginFiles, clearPluginDatabase, clearPluginErrors } =
  actions;
