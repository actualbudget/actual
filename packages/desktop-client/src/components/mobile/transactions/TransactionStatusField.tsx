import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { ToggleField } from '#components/mobile/MobileForms';

type TransactionStatusFieldProps = {
  isCleared: boolean;
  isReconciled: boolean;
  onToggleCleared: (isOn: boolean) => void;
  onToggleReconciled: (isOn: boolean) => void;
};

const labelClassName = css({
  display: 'block',
  marginBottom: 5,
  marginTop: 25,
  fontSize: 14,
  color: theme.tableRowHeaderText,
  padding: `0 ${styles.mobileEditingPadding}px`,
  userSelect: 'none',
});

const accessibleToggleClassName = css({
  position: 'relative',
  '& input': {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    width: '100%',
    height: '100%',
    margin: 0,
    opacity: 0,
    visibility: 'visible',
    cursor: 'pointer',
  },
});

export function TransactionStatusField({
  isCleared,
  isReconciled,
  onToggleCleared,
  onToggleReconciled,
}: TransactionStatusFieldProps) {
  const id = isReconciled ? 'reconciled' : 'cleared';

  return (
    <>
      <label className={labelClassName} htmlFor={id}>
        {isReconciled ? <Trans>Reconciled</Trans> : <Trans>Cleared</Trans>}
      </label>
      <ToggleField
        id={id}
        isOn={isReconciled || isCleared}
        onToggle={isReconciled ? onToggleReconciled : onToggleCleared}
        className={accessibleToggleClassName}
      />
    </>
  );
}
