import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { useModalState } from '#hooks/useModalState';
import { pushModal } from '#modals/modalsSlice';
import { loadPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

import { AppBackground } from './AppBackground';

type Props = {
  currencyCode: string;
};

function openBudgetUpdate(currencyCode: string, required = true) {
  return pushModal({
    modal: {
      name: 'amount-encoding',
      options: { currencyCode, required },
    },
  });
}

/**
 * Records the amount encoding of a budget that selected a currency before
 * recorded precision existed. When the stored precision stays the same no
 * amount changes, so the update runs without asking. A precision change, or
 * any failure, falls back to the backup and confirmation dialog.
 */
export function PrecisionGraduationGate({ currencyCode }: Props) {
  const dispatch = useDispatch();
  const { activeModal } = useModalState();
  const [needsReview, setNeedsReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function updateWithoutRescale() {
      const preflight = await send('amount-encoding/preflight', {
        currencyCode,
      });
      if (
        cancelled ||
        preflight.pending ||
        preflight.source.precision !== preflight.target.precision
      ) {
        return false;
      }
      const result = await send('amount-encoding/transition', {
        currencyCode,
        sourceToken: preflight.sourceToken,
      });
      if (cancelled) return true;
      if ('error' in result) {
        if (!result.retryable) return false;
        // The local update committed but publishing it failed; offer retry.
        dispatch(openBudgetUpdate(currencyCode, false));
      }
      await dispatch(loadPrefs());
      return true;
    }
    updateWithoutRescale().then(
      updated => {
        if (!cancelled && !updated) setNeedsReview(true);
      },
      () => {
        if (!cancelled) setNeedsReview(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [currencyCode, dispatch]);

  useEffect(() => {
    if (needsReview && !activeModal) {
      dispatch(openBudgetUpdate(currencyCode));
    }
  }, [needsReview, activeModal, currencyCode, dispatch]);

  return (
    <>
      <AppBackground />
      <View
        style={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            gap: 15,
            maxWidth: 420,
            textAlign: 'center',
            color: theme.pageText,
          }}
        >
          <Text style={{ ...styles.veryLargeText, fontWeight: 600 }}>
            <Trans>Update this budget</Trans>
          </Text>
          <Text style={{ fontSize: 15, color: theme.pageTextLight }}>
            {needsReview ? (
              <Trans>
                This budget needs a one-time update to how it stores amounts
                before you can keep using it.
              </Trans>
            ) : (
              <Trans>Updating how this budget stores amounts…</Trans>
            )}
          </Text>
          {needsReview && (
            <Button
              variant="primary"
              onPress={() => dispatch(openBudgetUpdate(currencyCode))}
            >
              <Trans>Continue budget update</Trans>
            </Button>
          )}
        </View>
      </View>
    </>
  );
}
