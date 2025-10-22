import React, { useState, type ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgQuestion } from '@actual-app/components/icons/v1';
import { Stack } from '@actual-app/components/stack';
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
      <Stack
        direction="row"
        align="center"
        justify="space-between"
        style={{ marginBottom: 5 }}
      >
        <Text>{children}</Text>
        <ToggleField
          id={id}
          isOn={checked}
          onToggle={onChange}
          isDisabled={disabled}
        />
      </Stack>
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
          <Stack direction="row" align="center" spacing={1}>
            <Text>{children}</Text>
            <SvgQuestion height={12} width={12} cursor="pointer" />
          </Stack>
        </Tooltip>
      </LabeledCheckbox>
    );
  }

  return (
    <Stack direction="column" spacing={1} style={{ marginBottom: 5 }}>
      <Stack direction="row" align="center" justify="space-between">
        <Stack direction="row" align="center" spacing={1}>
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
        </Stack>
        <ToggleField
          id={id}
          isOn={checked}
          onToggle={onChange}
          isDisabled={disabled}
        />
      </Stack>
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
    </Stack>
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
    </>
  );
}
