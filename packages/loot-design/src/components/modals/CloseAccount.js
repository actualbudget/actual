import React, { useState } from 'react';

import { Formik } from 'formik';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { colors } from '../../style';
import { View, Text, Modal, Button, P, Select, FormError } from '../common';

function needsCategory(account, currentTransfer, accounts) {
  const acct = accounts.find(a => a.id === currentTransfer);
  const isOffBudget = acct && acct.offbudget === 1;

  // The user must select a category if transferring from a budgeted
  // account to an off-budget account
  return account.offbudget === 0 && isOffBudget;
}

function CategorySelect({ categoryGroups, ...nativeProps }) {
  return (
    <Select {...nativeProps}>
      <option value="">Select category...</option>
      {categoryGroups.map(group => (
        <optgroup key={group.id} label={group.name}>
          {group.categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

function CloseAccount({
  account,
  accounts,
  categoryGroups,
  balance,
  canDelete,
  actions,
  modalProps
}) {
  let [loading, setLoading] = useState(false);

  let filtered = accounts.filter(a => a.id !== account.id);
  let onbudget = filtered.filter(a => a.offbudget === 0);
  let offbudget = filtered.filter(a => a.offbudget === 1);

  return (
    <Modal
      title="Close Account"
      {...modalProps}
      style={{ flex: 0 }}
      loading={loading}
    >
      {() => (
        <View>
          <P>
            Are you sure you want to close <strong>{account.name}</strong>?{' '}
            {canDelete ? (
              <span>
                This account has no transactions so it will be permanently
                deleted.
              </span>
            ) : (
              <span>
                This account has transactions so we can
                {"'"}t permanently delete it.
              </span>
            )}
          </P>
          <Formik
            validateOnChange={false}
            initialValues={{ transfer: '', category: '' }}
            onSubmit={(values, { setErrors }) => {
              const errors = {};
              if (balance !== 0 && values.transfer === '') {
                errors.transfer = 'required';
              }
              if (
                needsCategory(account, values.transfer, accounts) &&
                values.category === ''
              ) {
                errors.category = 'required';
              }
              setErrors(errors);

              if (Object.keys(errors).length === 0) {
                setLoading(true);

                actions
                  .closeAccount(
                    account.id,
                    values.transfer || null,
                    values.category || null
                  )
                  .then(() => {
                    modalProps.onClose();
                  });
              }
            }}
            render={({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
              setFieldValue
            }) => (
              <form onSubmit={handleSubmit}>
                {balance !== 0 && (
                  <View>
                    <P>
                      This account has a balance of{' '}
                      <strong>{integerToCurrency(balance)}</strong>. To close
                      this account, select a different account to transfer this
                      balance to:
                    </P>

                    <Select
                      name="transfer"
                      value={values.transfer}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      style={{ width: 200, marginBottom: 15 }}
                    >
                      <option value="">Select account...</option>
                      <optgroup label="For Budget">
                        {onbudget.map(acct => (
                          <option key={acct.id} value={acct.id}>
                            {acct.name}
                          </option>
                        ))}
                      </optgroup>

                      <optgroup label="Off Budget">
                        {offbudget.map(acct => (
                          <option key={acct.id} value={acct.id}>
                            {acct.name}
                          </option>
                        ))}
                      </optgroup>
                    </Select>
                    {errors.transfer && (
                      <FormError style={{ marginBottom: 15 }}>
                        Transfer is required
                      </FormError>
                    )}

                    {needsCategory(account, values.transfer, accounts) && (
                      <View style={{ marginBottom: 15 }}>
                        <P>
                          Since you are transferring the balance from a budgeted
                          account to an off-budget account, this transaction
                          must be categorized. Select a category:
                        </P>

                        <CategorySelect
                          categoryGroups={categoryGroups}
                          name="category"
                          value={values.category}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          style={{ width: 200 }}
                        />
                        {errors.category && (
                          <FormError>Category is required</FormError>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {!canDelete && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 12 }}>
                      You can also {/* eslint-disable-next-line */}
                      <a
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          setLoading(true);

                          actions
                            .forceCloseAccount(account.id)
                            .then(() => modalProps.onClose());
                        }}
                        style={{ color: colors.r6 }}
                      >
                        force close
                      </a>{' '}
                      the account which will delete it and all its transactions
                      permanently. Doing so may change your budget unexpectedly
                      since money in it may vanish.
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end'
                  }}
                >
                  <Button
                    type="submit"
                    style={{ marginRight: 10 }}
                    onClick={modalProps.onClose}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" primary>
                    Close Account
                  </Button>
                </View>
              </form>
            )}
          />
        </View>
      )}
    </Modal>
  );
}

export default CloseAccount;
