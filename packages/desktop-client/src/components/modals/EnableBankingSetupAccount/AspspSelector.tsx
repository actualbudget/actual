import { useCallback, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import type { EnableBankingBank } from 'loot-core/types/models/enablebanking';

import type { AspspSelectorProps } from './types';
import { WaitingIndicator } from './WaitingIndicator';

import { Warning } from '@desktop-client/components/alerts';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { Link } from '@desktop-client/components/common/Link';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { COUNTRY_OPTIONS } from '@desktop-client/components/util/countries';

export function AspspSelector({
  init_country,
  init_aspsp,
  onComplete,
  onError,
}: AspspSelectorProps) {
  const { t } = useTranslation();

  const onErrorRef = useRef(onError);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onErrorRef.current = onError;
    onCompleteRef.current = onComplete;
  }, [onError, onComplete]);

  const [availableCountries, setAvailableCountries] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [availableAspsps, setAvailableAspsps] = useState<
    EnableBankingBank[] | null
  >(null);
  const [country, setCountry] = useState<{ id: string; name: string } | null>(
    COUNTRY_OPTIONS.find(country => country.id === init_country) ?? null,
  );
  const [aspsp, setAspsp] = useState<string | null>(
    init_aspsp ? init_aspsp : null,
  );
  const [startingAuth, setStartingAuth] = useState<boolean>(false);
  const autoTriggeredRef = useRef(false);

  const onLink = useCallback(async () => {
    if (country === null || aspsp === null) {
      onErrorRef.current({ error_code: 'INTERNAL_ERROR', error_type: '' });
      return;
    }
    setStartingAuth(true);
    try {
      const { data, error } = await send('enablebanking-startauth', {
        country: country.id,
        aspsp,
      });
      if (error) {
        onErrorRef.current(error);
        return;
      }

      if (data === undefined) {
        onErrorRef.current({
          error_code: 'INTERNAL_ERROR',
          error_type: 'No data returned from enablebanking-startauth',
        });
        return;
      }

      onCompleteRef.current(data);
    } catch (err) {
      onErrorRef.current({
        error_code: 'INTERNAL_ERROR',
        error_type: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setStartingAuth(false);
    }
  }, [aspsp, country]);

  useEffect(() => {
    if (
      init_country &&
      init_aspsp &&
      country &&
      aspsp &&
      !startingAuth &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      void onLink();
    }
  }, [aspsp, country, init_aspsp, init_country, onLink, startingAuth]);

  useEffect(() => {
    let cancelled = false;
    send('enablebanking-countries')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          onErrorRef.current(error);
          return;
        }
        if (data) {
          const cids = new Set(data);
          const nextAvailableCountries = COUNTRY_OPTIONS.filter(val =>
            cids.has(val.id),
          );
          setAvailableCountries(nextAvailableCountries);
        }
      })
      .catch(() => {
        if (cancelled) return;
        onErrorRef.current({ error_code: 'INTERNAL_ERROR', error_type: '' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!country) {
      return;
    }

    let cancelled = false;
    send('enablebanking-banks', { country: country.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          onErrorRef.current(error);
          return;
        }
        if (data) {
          setAvailableAspsps(data);
        }
      })
      .catch(() => {
        if (cancelled) return;
        onErrorRef.current({ error_code: 'INTERNAL_ERROR', error_type: '' });
      });

    return () => {
      cancelled = true;
    };
  }, [country]);

  const onSelectCountry = (country_id: string) => {
    if (!country || country_id !== country.id) {
      setCountry(
        COUNTRY_OPTIONS.find(country => country.id === country_id) ?? null,
      );
      setAspsp(null);
      setAvailableAspsps(null);
    }
  };

  if (availableCountries === null) {
    return (
      <WaitingIndicator
        message={t('Getting the available countries from Enable Banking.')}
      />
    );
  }

  return (
    <View>
      <FormField>
        <FormLabel
          title={t('Choose the country of your bank:')}
          htmlFor="country-field"
        />
        <Autocomplete
          focused
          strict
          highlightFirst
          suggestions={[...availableCountries].sort((a, b) =>
            a.name.localeCompare(b.name),
          )}
          onSelect={onSelectCountry}
          value={country ? country.id : null}
          inputProps={{
            id: 'country-field',
            placeholder: t('(please select)'),
          }}
        />
      </FormField>
      {country && !availableAspsps && (
        <WaitingIndicator
          message={t('Getting banks for {{countryName}}.', {
            countryName: country.name,
          })}
        />
      )}

      {country && availableAspsps && (
        <FormField>
          <FormLabel title={t('Choose your bank:')} htmlFor="bank-field" />
          <Autocomplete
            focused
            strict
            highlightFirst
            key={country.id}
            suggestions={availableAspsps
              .map(bank => {
                return { id: bank.name, ...bank };
              })
              .sort((a, b) => a.name.localeCompare(b.name))}
            onSelect={setAspsp}
            value={aspsp}
            inputProps={{
              id: 'bank-field',
              placeholder: t('(please select)'),
            }}
          />
        </FormField>
      )}
      {country && aspsp && (
        <View>
          <Warning>
            <Trans>
              By enabling bank sync, you will be granting Enable Banking (a
              third party service) read-only access to your entire account's
              transaction history. This service is not affiliated with Actual in
              any way. Make sure you've read and understand Enable Banking's{' '}
              <Link
                variant="external"
                to="https://enablebanking.com/privacy/"
                linkColor="purple"
              >
                Privacy Policy
              </Link>{' '}
              before proceeding.
            </Trans>
          </Warning>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <ButtonWithLoading
              variant="primary"
              autoFocus
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                flexGrow: 1,
              }}
              onPress={onLink}
              isLoading={startingAuth}
            >
              <Trans>Link bank in browser</Trans> &rarr;
            </ButtonWithLoading>
          </View>
        </View>
      )}
    </View>
  );
}
