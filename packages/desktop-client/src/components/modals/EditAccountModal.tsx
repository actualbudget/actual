// @ts-strict-ignore
import { type FormEvent, useState, useEffect } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { toRelaxedNumber } from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';

import { updateAccount } from '@desktop-client/accounts/accountsSlice';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { Checkbox } from '@desktop-client/components/forms';
import { validateAccountName } from '@desktop-client/components/util/accountValidation';
import * as useAccounts from '@desktop-client/hooks/useAccounts';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { closeModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type EditAccountModalProps = {
  account: AccountEntity;
};

export function EditAccountModal({ account }: EditAccountModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const accounts = useAccounts.useAccounts();
  const [name, setName] = useState(account.name);
  const [offbudget, setOffbudget] = useState(account.offbudget === 1);
  const [type, setType] = useState(account.type || 'Bank');
  const [cycleStart, setCycleStart] = useState(String(account.cycle_start || 1));
  const [cycleEnd, setCycleEnd] = useState(String(account.cycle_end || 31));

  const [nameError, setNameError] = useState(null);
  const [cycleError, setCycleError] = useState(null);

  const validateAndSetName = (name: string) => {
    const nameError = validateAccountName(name, account.id, accounts);
    if (nameError) {
      setNameError(nameError);
    } else {
      setName(name);
      setNameError(null);
    }
  };

  const validateCycle = () => {
    const start = parseInt(cycleStart);
    const end = parseInt(cycleEnd);
    if (isNaN(start) || isNaN(end) || start < 1 || start > 31 || end < 1 || end > 31) {
      setCycleError('Cycle days must be between 1 and 31.');
      return false;
    }
    setCycleError(null);
    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nameError = validateAccountName(name, account.id, accounts);
    let cycleIsValid = true;
    if (type === 'Credit') {
      cycleIsValid = validateCycle();
    }

    setNameError(nameError);

    if (!nameError && cycleIsValid) {
      const accountData = {
        id: account.id,
        name,
        offbudget: offbudget ? 1 : 0,
        type,
      };

      if (type === 'Credit') {
        accountData.cycle_start = parseInt(cycleStart);
        accountData.cycle_end = parseInt(cycleEnd);
      }

      dispatch(updateAccount({ account: accountData }));
      dispatch(closeModal());
    }
  };
  return (
    <Modal name="edit-account">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle title={t('Edit Account')} shrinkOnOverflow />
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <Form onSubmit={onSubmit}>
              <InlineField label={t('Name')} width="100%">
                <InitialFocus>
                  <Input
                    name="name"
                    value={name}
                    onChangeValue={setName}
                    onUpdate={value => {
                      const name = value.trim();
                      validateAndSetName(name);
                    }}
                    style={{ flex: 1 }}
                  />
                </InitialFocus>
              </InlineField>
              {nameError && (
                <FormError style={{ marginLeft: 75, color: theme.warningText }}>
                  {nameError}
                </FormError>
              )}

              <InlineField label={t('Type')} width="100%">
                <Select
                  value={type}
                  onChange={setType}
                  options={[
                    ['Bank', 'Bank'],
                    ['Credit', 'Credit'],
                  ]}
                />
              </InlineField>

              {type === 'Credit' && (
                <>
                  <InlineField label={t('Cycle Start Day')} width="100%">
                    <Input
                      name="cycle-start"
                      type="number"
                      value={cycleStart}
                      onChangeValue={setCycleStart}
                      onUpdate={validateCycle}
                      style={{ flex: 1 }}
                    />
                  </InlineField>
                  <InlineField label={t('Cycle End Day')} width="100%">
                    <Input
                      name="cycle-end"
                      type="number"
                      value={cycleEnd}
                      onChangeValue={setCycleEnd}
                      onUpdate={validateCycle}
                      style={{ flex: 1 }}
                    />
                  </InlineField>
                  {cycleError && (
                    <FormError style={{ marginLeft: 75, color: theme.warningText }}>
                      {cycleError}
                    </FormError>
                  )}
                </>
              )}

              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                }}
              >
                <View style={{ flexDirection: 'column' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Checkbox
                      id="offbudget"
                      name="offbudget"
                      checked={offbudget}
                      onChange={() => setOffbudget(!offbudget)}
                      disabled={true}
                    />
                    <label
                      htmlFor="offbudget"
                      style={{
                        userSelect: 'none',
                        verticalAlign: 'center',
                      }}
                    >
                      <Trans>Off budget</Trans>
                    </label>
                  </View>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: '0.7em',
                      color: theme.pageTextLight,
                      marginTop: 3,
                    }}
                  >
                    <Text>
                      <Trans>
                        This cannot be changed later.
                      </Trans>
                    </Text>
                  </div>
                </View>
              </View>

              <ModalButtons>
                <Button onPress={close}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{ marginLeft: 10 }}
                >
                  <Trans>Save</Trans>
                </Button>
              </ModalButtons>
            </Form>
          </View>
        </>
      )}
    </Modal>
  );
}
