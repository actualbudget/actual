import React from 'react';

import { Formik } from 'formik';

import { determineOffBudget } from 'loot-core/src/shared/accounts';
import { toRelaxedNumber } from 'loot-core/src/shared/util';

import { colors } from '../../style';
import {
  View,
  Modal,
  ModalButtons,
  Button,
  Input,
  Select,
  InlineField,
  FormError,
  InitialFocus,
  Text,
} from '../common';

function CreateLocalAccount({ modalProps, actions, history }) {
  return (
    <Modal title="Create Local Account" {...modalProps} showBack={false}>
      {() => (
        <View>
          <Formik
            validateOnChange={false}
            initialValues={{
              name: '',
              type: 'checking',
              balance: '0',
            }}
            validate={() => ({})}
            onSubmit={async (values, { setErrors }) => {
              const errors = {};
              if (!values.type) {
                errors.type = 'required';
              }
              if (!values.name) {
                errors.name = 'required';
              }
              if (isNaN(parseFloat(values.balance))) {
                errors.balance = 'format';
              }
              setErrors(errors);

              if (Object.keys(errors).length === 0) {
                modalProps.onClose();
                let id = await actions.createAccount(
                  values.name,
                  values.type,
                  toRelaxedNumber(values.balance),
                  values.offbudget,
                );
                history.push('/accounts/' + id);
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
              setFieldValue,
            }) => (
              <form onSubmit={handleSubmit}>
                <InlineField label="Name" width="75%">
                  <InitialFocus>
                    <Input
                      name="name"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      style={{ flex: 1 }}
                    />
                  </InitialFocus>
                </InlineField>
                {errors.name && (
                  <FormError style={{ marginLeft: 75 }}>
                    Name is required
                  </FormError>
                )}

                <InlineField label="Type" width="75%">
                  <Select
                    name="type"
                    value={values.type}
                    onChange={e => {
                      setFieldValue(
                        'offbudget',
                        determineOffBudget(e.target.value),
                      );
                      handleChange(e);
                    }}
                    onBlur={handleBlur}
                  >
                    <option value="checking">Checking / Cash</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                    <option value="investment">Investment</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="debt">Debt</option>
                    <option value="other">Other</option>
                  </Select>
                </InlineField>
                {errors.type && (
                  <FormError style={{ marginLeft: 75 }}>
                    You must select a type
                  </FormError>
                )}

                <View
                  style={{
                    width: '75%',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                  }}
                >
                  <View style={{ flexDirection: 'column' }}>
                    <label
                      style={{
                        userSelect: 'none',
                        textAlign: 'right',
                        width: '100%',
                        display: 'flex',
                        verticalAlign: 'center',
                        justifyContent: 'flex-end',
                      }}
                      htmlFor="offbudget"
                    >
                      <input
                        id="offbudget"
                        name="offbudget"
                        type="checkbox"
                        checked={!!values.offbudget}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      Off-budget
                    </label>
                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: '0.7em',
                        color: colors.n5,
                        marginTop: 3,
                      }}
                    >
                      <Text>
                        This cannot be changed later. <br /> {'\n'}
                        See{' '}
                        <a
                          href="https://actualbudget.github.io/docs/Accounts/overview/#off-budget-accounts"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: colors.n5,
                          }}
                        >
                          Accounts Overview
                        </a>{' '}
                        for more information.
                      </Text>
                    </div>
                  </View>
                </View>

                <InlineField label="Balance" width="75%">
                  <Input
                    name="balance"
                    value={values.balance}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ flex: 1 }}
                  />
                </InlineField>
                {errors.balance && (
                  <FormError style={{ marginLeft: 75 }}>
                    Balance must be a number
                  </FormError>
                )}

                <ModalButtons>
                  <Button onClick={() => modalProps.onBack()} type="button">
                    Back
                  </Button>
                  <Button primary style={{ marginLeft: 10 }}>
                    Create
                  </Button>
                </ModalButtons>
              </form>
            )}
          />
        </View>
      )}
    </Modal>
  );
}

export default CreateLocalAccount;
