import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgQuestion } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';

import { LabeledCheckbox } from '@desktop-client/components/forms/LabeledCheckbox';
import { ToggleField } from '@desktop-client/components/mobile/MobileForms';

type CheckboxOptionProps = {
  id: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  helpMode?: 'desktop' | 'mobile';
  children: ReactNode;
};

function CheckboxOption({
  id,
  checked,
  onChange,
  disabled,
  helpMode = 'desktop',
  children,
}: CheckboxOptionProps) {
  if (helpMode === 'mobile') {
    return (
      <SpaceBetween
        style={{
          marginBottom: 5,
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Text>{children}</Text>
        <ToggleField
          id={id}
          isOn={checked}
          onToggle={onChange}
          isDisabled={disabled}
        />
      </SpaceBetween>
    );
  }

  return (
    <LabeledCheckbox
      id={id}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    >
      {children}
    </LabeledCheckbox>
  );
}

type CheckboxOptionWithHelpProps = {
  id: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  helpText: string;
  helpMode: 'desktop' | 'mobile';
  children: ReactNode;
};

function CheckboxOptionWithHelp({
  id,
  checked,
  onChange,
  disabled,
  helpText,
  helpMode,
  children,
}: CheckboxOptionWithHelpProps) {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = useState(false);

  if (helpMode === 'desktop') {
    return (
      <LabeledCheckbox
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      >
        <Tooltip content={helpText}>
          <SpaceBetween gap={5}>
            <Text>{children}</Text>
            <SvgQuestion height={12} width={12} cursor="pointer" />
          </SpaceBetween>
        </Tooltip>
      </LabeledCheckbox>
    );
  }

  return (
    <SpaceBetween
      direction="vertical"
      gap={5}
      style={{ marginBottom: 5, width: '100%' }}
    >
      <SpaceBetween style={{ justifyContent: 'space-between', width: '100%' }}>
        <SpaceBetween gap={5}>
          <Text>{children}</Text>
          <Button
            variant="bare"
            aria-label={t('Help')}
            onPress={() => setShowHelp(!showHelp)}
            style={{
              padding: 0,
              height: 'auto',
              minHeight: 'auto',
            }}
          >
            <SvgQuestion height={12} width={12} />
          </Button>
        </SpaceBetween>
        <ToggleField
          id={id}
          isOn={checked}
          onToggle={onChange}
          isDisabled={disabled}
        />
      </SpaceBetween>
      {showHelp && (
        <Text
          style={{
            fontSize: 13,
            color: theme.pageTextSubdued,
          }}
        >
          {helpText}
        </Text>
      )}
    </SpaceBetween>
  );
}

type BankSyncCheckboxOptionsProps = {
  importPending: boolean;
  setImportPending: (value: boolean) => void;
  importNotes: boolean;
  setImportNotes: (value: boolean) => void;
  reimportDeleted: boolean;
  setReimportDeleted: (value: boolean) => void;
  importTransactions: boolean;
  setImportTransactions: (value: boolean) => void;
  updateDates: boolean;
  setUpdateDates: (value: boolean) => void;
  helpMode?: 'desktop' | 'mobile';
};

export function BankSyncCheckboxOptions({
  importPending,
  setImportPending,
  importNotes,
  setImportNotes,
  reimportDeleted,
  setReimportDeleted,
  importTransactions,
  setImportTransactions,
  updateDates,
  setUpdateDates,
  helpMode = 'desktop',
}: BankSyncCheckboxOptionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <CheckboxOption
        id="form_pending"
        checked={importPending}
        onChange={() => setImportPending(!importPending)}
        disabled={!importTransactions}
        helpMode={helpMode}
      >
        <Trans>Import pending transactions</Trans>
      </CheckboxOption>

      <CheckboxOption
        id="form_notes"
        checked={importNotes}
        onChange={() => setImportNotes(!importNotes)}
        disabled={!importTransactions}
        helpMode={helpMode}
      >
        <Trans>Import transaction notes</Trans>
      </CheckboxOption>

      <CheckboxOptionWithHelp
        id="form_reimport_deleted"
        checked={reimportDeleted}
        onChange={() => setReimportDeleted(!reimportDeleted)}
        disabled={!importTransactions}
        helpText={t(
          'By default imported transactions that you delete will be re-imported with the next bank sync operation. To disable this behaviour - untick this box.',
        )}
        helpMode={helpMode}
      >
        <Trans>Reimport deleted transactions</Trans>
      </CheckboxOptionWithHelp>

      <CheckboxOptionWithHelp
        id="form_import_transactions"
        checked={!importTransactions}
        onChange={() => setImportTransactions(!importTransactions)}
        helpText={t(
          'Selecting this option will disable importing transactions and only import the account balance for use in reconciliation',
        )}
        helpMode={helpMode}
      >
        <Trans>Investment Account</Trans>
      </CheckboxOptionWithHelp>

      <CheckboxOptionWithHelp
        id="form_update_dates"
        checked={updateDates}
        onChange={() => setUpdateDates(!updateDates)}
        helpText={t(
          'By enabling this, the transaction date will be overwritten by the one provided by the bank.',
        )}
        helpMode={helpMode}
      >
        <Trans>Update Dates</Trans>
      </CheckboxOptionWithHelp>
    </>
  );
}
