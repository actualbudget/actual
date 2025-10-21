import React, { useState, type ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgQuestion } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { CheckboxOption } from '@desktop-client/components/modals/ImportTransactionsModal/CheckboxOption';

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
      <CheckboxOption
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      >
        <Tooltip content={helpText}>
          <View
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {children}
            <SvgQuestion height={12} width={12} cursor="pointer" />
          </View>
        </Tooltip>
      </CheckboxOption>
    );
  }

  return (
    <View>
      <CheckboxOption
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      >
        <View
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {children}
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
        </View>
      </CheckboxOption>
      {showHelp && (
        <Text
          style={{
            fontSize: 13,
            color: theme.pageTextSubdued,
            marginTop: 5,
            marginLeft: 28,
            marginBottom: 10,
          }}
        >
          {helpText}
        </Text>
      )}
    </View>
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
        checked={importPending && importTransactions}
        onChange={() => setImportPending(!importPending)}
        disabled={!importTransactions}
      >
        <Trans>Import pending transactions</Trans>
      </CheckboxOption>

      <CheckboxOption
        id="form_notes"
        checked={importNotes && importTransactions}
        onChange={() => setImportNotes(!importNotes)}
        disabled={!importTransactions}
      >
        <Trans>Import transaction notes</Trans>
      </CheckboxOption>

      <CheckboxOptionWithHelp
        id="form_reimport_deleted"
        checked={reimportDeleted && importTransactions}
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
