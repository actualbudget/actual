import { createSlice } from '@reduxjs/toolkit';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { send } from 'loot-core/platform/client/connection';
import { groupById } from 'loot-core/shared/util';
import type { AccountEntity, PayeeEntity } from 'loot-core/types/models';

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

    builder.addCase(createPayee.fulfilled, _markPayeesDirty);

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
  },
});

type CreatePayeePayload = {
  name: PayeeEntity['name'];
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
  async ({ name }: CreatePayeePayload) => {
    const id: PayeeEntity['id'] = await send('payee-create', {
      name: name.trim(),
    });
    return id;
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

function _loadPayees(state: PayeesState, payees: PayeesState['payees']) {
  state.payees = translatePayees(payees) as PayeeEntity[];
  state.isPayeesLoading = false;
  state.isPayeesLoaded = true;
  state.isPayeesDirty = false;
}

function _markPayeesDirty(state: PayeesState) {
  state.isCommonPayeesDirty = true;
  state.isPayeesDirty = true;
}
