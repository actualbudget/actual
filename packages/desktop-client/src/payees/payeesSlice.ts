import { createSlice } from '@reduxjs/toolkit';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { send } from 'loot-core/platform/client/fetch';
import { locationService } from 'loot-core/shared/location';
import { groupById } from 'loot-core/shared/util';
import { type AccountEntity, type PayeeEntity } from 'loot-core/types/models';

import { getAccountsById } from '@desktop-client/accounts/accountsSlice';
import { resetApp } from '@desktop-client/app/appSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'payees';

type PayeesState = {
  commonPayees: PayeeEntity[];
  isCommonPayeesLoading: boolean;
  isCommonPayeesLoaded: boolean;
  isCommonPayeesDirty: boolean;
  payees: PayeeEntity[];
  isPayeesLoading: boolean;
  isPayeesLoaded: boolean;
  isPayeesDirty: boolean;
  nearbyPayees: PayeeEntity[];
  isNearbyPayeesLoading: boolean;
  isNearbyPayeesLoaded: boolean;
  isNearbyPayeesDirty: boolean;
};

const initialState: PayeesState = {
  commonPayees: [],
  isCommonPayeesLoading: false,
  isCommonPayeesLoaded: false,
  isCommonPayeesDirty: false,
  payees: [],
  isPayeesLoading: false,
  isPayeesLoaded: false,
  isPayeesDirty: false,
  nearbyPayees: [],
  isNearbyPayeesLoading: false,
  isNearbyPayeesLoaded: false,
  isNearbyPayeesDirty: false,
};

const payeesSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    markPayeesDirty(state) {
      _markPayeesDirty(state);
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);

    builder.addCase(createPayee.fulfilled, state => {
      _markPayeesDirty(state);
      state.isNearbyPayeesDirty = true;
    });

    builder.addCase(updatePayeeLocationIfNeeded.fulfilled, (state, action) => {
      // If location was successfully saved, mark nearby payees as dirty to trigger reload
      if (action.payload.locationSaved) {
        state.isNearbyPayeesDirty = true;
      }
    });

    builder.addCase(deletePayeeLocation.fulfilled, (state, action) => {
      // If location was successfully deleted, mark nearby payees as dirty to trigger reload
      if (action.payload.success) {
        state.isNearbyPayeesDirty = true;
      }
    });

    builder.addCase(reloadCommonPayees.fulfilled, (state, action) => {
      _loadCommonPayees(state, action.payload);
    });

    builder.addCase(reloadCommonPayees.rejected, state => {
      state.isCommonPayeesLoading = false;
    });

    builder.addCase(reloadCommonPayees.pending, state => {
      state.isCommonPayeesLoading = true;
    });

    builder.addCase(getCommonPayees.fulfilled, (state, action) => {
      _loadCommonPayees(state, action.payload);
    });

    builder.addCase(getCommonPayees.rejected, state => {
      state.isCommonPayeesLoading = false;
    });

    builder.addCase(getCommonPayees.pending, state => {
      state.isCommonPayeesLoading = true;
    });

    builder.addCase(reloadPayees.fulfilled, (state, action) => {
      _loadPayees(state, action.payload);
    });

    builder.addCase(reloadPayees.rejected, state => {
      state.isPayeesLoading = false;
    });

    builder.addCase(reloadPayees.pending, state => {
      state.isPayeesLoading = true;
    });

    builder.addCase(getPayees.fulfilled, (state, action) => {
      _loadPayees(state, action.payload);
    });

    builder.addCase(getPayees.rejected, state => {
      state.isPayeesLoading = false;
    });

    builder.addCase(getPayees.pending, state => {
      state.isPayeesLoading = true;
    });

    builder.addCase(getNearbyPayees.fulfilled, (state, action) => {
      _loadNearbyPayees(state, action.payload);
    });

    builder.addCase(getNearbyPayees.rejected, state => {
      state.isNearbyPayeesLoading = false;
    });

    builder.addCase(getNearbyPayees.pending, state => {
      state.isNearbyPayeesLoading = true;
    });

    builder.addCase(reloadNearbyPayees.fulfilled, (state, action) => {
      _loadNearbyPayees(state, action.payload);
    });

    builder.addCase(reloadNearbyPayees.rejected, state => {
      state.isNearbyPayeesLoading = false;
    });

    builder.addCase(reloadNearbyPayees.pending, state => {
      state.isNearbyPayeesLoading = true;
    });
  },
});

type CreatePayeePayload = {
  name: PayeeEntity['name'];
  locationAccess?: boolean;
};

function translatePayees(
  payees: PayeeEntity[] | null | undefined,
): PayeeEntity[] | null | undefined {
  return (
    payees?.map(payee =>
      payee.name === 'Starting Balance'
        ? { ...payee, name: t('Starting Balance') }
        : payee,
    ) ?? payees
  );
}

export const createPayee = createAppAsyncThunk(
  `${sliceName}/createPayee`,
  async ({ name, locationAccess }: CreatePayeePayload) => {
    const id: PayeeEntity['id'] = await send('payee-create', {
      name: name.trim(),
    });

    // If locationAccess is enabled and we're on mobile (narrow width),
    // attempt to save the current location for this payee
    if (locationAccess) {
      try {
        await locationService.savePayeeLocationIfNeeded(id);
      } catch (error) {
        // Silently handle location errors - don't block payee creation
        console.info('Could not save location for new payee', { error });
      }
    }

    return id;
  },
);

export const updatePayeeLocationIfNeeded = createAppAsyncThunk(
  `${sliceName}/updatePayeeLocationIfNeeded`,
  async (payeeId: PayeeEntity['id']) => {
    try {
      const saved = await locationService.savePayeeLocationIfNeeded(payeeId);
      return { payeeId, locationSaved: saved };
    } catch (error) {
      console.info('Could not save location for existing payee', { error });
    }

    return { payeeId, locationSaved: false };
  },
);

export const deletePayeeLocation = createAppAsyncThunk(
  `${sliceName}/deletePayeeLocation`,
  async (locationId: string) => {
    try {
      await locationService.deletePayeeLocation(locationId);
      return { locationId, success: true };
    } catch (error) {
      console.info('Could not delete payee location', { error });
      return { locationId, success: false };
    }
  },
);

export const getCommonPayees = createAppAsyncThunk(
  `${sliceName}/getCommonPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('common-payees-get');
    return translatePayees(payees) as PayeeEntity[];
  },
  {
    condition: (_, { getState }) => {
      const { payees } = getState();
      return (
        !payees.isCommonPayeesLoading &&
        (payees.isCommonPayeesDirty || !payees.isCommonPayeesLoaded)
      );
    },
  },
);

export const reloadCommonPayees = createAppAsyncThunk(
  `${sliceName}/reloadCommonPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('common-payees-get');
    return translatePayees(payees) as PayeeEntity[];
  },
);

async function fetchNearbyPayees(locationParams?: {
  latitude: number;
  longitude: number;
  maxDistance?: number;
}): Promise<PayeeEntity[]> {
  if (
    !locationParams ||
    locationParams.latitude == null ||
    locationParams.longitude == null
  ) {
    return [];
  }

  return locationService.getNearbyPayees(
    {
      latitude: locationParams.latitude,
      longitude: locationParams.longitude,
    },
    locationParams.maxDistance,
  );
}

export const reloadNearbyPayees = createAppAsyncThunk(
  `${sliceName}/reloadNearbyPayees`,
  async (locationParams?: {
    latitude: number;
    longitude: number;
    maxDistance?: number;
  }) => {
    return fetchNearbyPayees(locationParams);
  },
);

export const getNearbyPayees = createAppAsyncThunk(
  `${sliceName}/getNearbyPayees`,
  async (locationParams?: {
    latitude: number;
    longitude: number;
    maxDistance?: number;
  }) => fetchNearbyPayees(locationParams),
  {
    condition: (_, { getState }) => {
      const { payees } = getState();
      return (
        !payees.isNearbyPayeesLoading &&
        (payees.isNearbyPayeesDirty || !payees.isNearbyPayeesLoaded)
      );
    },
  },
);

export const getPayees = createAppAsyncThunk(
  `${sliceName}/getPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('payees-get');
    return translatePayees(payees) as PayeeEntity[];
  },
  {
    condition: (_, { getState }) => {
      const { payees } = getState();
      return (
        !payees.isPayeesLoading &&
        (payees.isPayeesDirty || !payees.isPayeesLoaded)
      );
    },
  },
);

export const reloadPayees = createAppAsyncThunk(
  `${sliceName}/reloadPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('payees-get');
    return translatePayees(payees) as PayeeEntity[];
  },
);

export const getActivePayees = memoizeOne(
  (payees: PayeeEntity[], accounts: AccountEntity[]) => {
    const accountsById = getAccountsById(accounts);

    return translatePayees(
      payees.filter(payee => {
        if (payee.transfer_acct) {
          const account = accountsById[payee.transfer_acct];
          return account != null && !account.closed;
        }
        return true;
      }) as PayeeEntity[],
    );
  },
);

export const getPayeesById = memoizeOne(
  (payees: PayeeEntity[] | null | undefined) =>
    groupById(translatePayees(payees)),
);

export const { name, reducer, getInitialState } = payeesSlice;

export const actions = {
  ...payeesSlice.actions,
  createPayee,
  getCommonPayees,
  reloadCommonPayees,
  getPayees,
  reloadPayees,
  getNearbyPayees,
  reloadNearbyPayees,
  updatePayeeLocationIfNeeded,
  deletePayeeLocation,
};

export const { markPayeesDirty } = payeesSlice.actions;

function _loadCommonPayees(
  state: PayeesState,
  commonPayees: PayeesState['commonPayees'],
) {
  state.commonPayees = translatePayees(commonPayees) as PayeeEntity[];
  state.isCommonPayeesLoading = false;
  state.isCommonPayeesLoaded = true;
  state.isCommonPayeesDirty = false;
}

function _loadNearbyPayees(
  state: PayeesState,
  nearbyPayees: PayeesState['nearbyPayees'],
) {
  state.nearbyPayees = nearbyPayees;
  state.isNearbyPayeesLoading = false;
  state.isNearbyPayeesLoaded = true;
  state.isNearbyPayeesDirty = false;
}

function _loadPayees(state: PayeesState, payees: PayeesState['payees']) {
  state.payees = translatePayees(payees) as PayeeEntity[];
  state.isPayeesLoading = false;
  state.isPayeesLoaded = true;
  state.isPayeesDirty = false;
}

function _markPayeesDirty(state: PayeesState) {
  state.isCommonPayeesDirty = true;
  state.isPayeesDirty = true;
  state.isNearbyPayeesDirty = true;
}
