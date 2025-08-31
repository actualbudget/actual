import React, { useEffect, useState, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { sendCatch, send } from 'loot-core/platform/client/fetch';
import {
  EnableBankingAuthenticationStartResponse,
  EnableBankingBank,
  EnableBankingErrorCode,
  EnableBankingErrorInterface,
  EnableBankingToken,
} from 'loot-core/types/models/enablebanking';

import { Error, Warning } from '@desktop-client/components/alerts';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { COUNTRY_OPTIONS } from '@desktop-client/components/util/countries';
import { useEnableBankingStatus } from '@desktop-client/hooks/useEnableBankingStatus';
import {
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';
import { start } from 'repl';

// TODO: Errorhandling


function renderError(
  error: EnableBankingErrorInterface,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const error_messages:Partial<Record<EnableBankingErrorCode,string>> = {
    "TIME_OUT": t('Timed out. Please try again.'),
    "ENABLEBANKING_APPLICATION_INACTIVE": t('Your Enable Banking application is inactive. Please reconfigure.'),
    "INTERNAL_ERROR": t('An internal error occurred. Please try again.'),
  }

  return (
    <Error style={{ alignSelf: 'center', marginBottom: 10 }}>
      {error.error_code in error_messages
        ? error_messages[error.error_code]
        : t(
            'An error occurred while linking your account, sorry! The potential issue could be: {{ message }}',
            { message: error.error_type },
          )}
    </Error>
  );
}

type EnableBankingSetupAccountModalProps = Extract<
  ModalType,
  { name: 'enablebanking-setup-account' }
>['options'];

export function EnableBankingSetupAccountModal({
  onSuccess,
}: EnableBankingSetupAccountModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [error, setError] = useState<EnableBankingErrorInterface | null>(null);

  const {
    configuredEnableBanking: isConfigured,
    isLoading: isConfigurationLoading,
  } = useEnableBankingStatus();

  async function onClose() {
    await send('enablebanking-stoppolling');
  }

  const WaitingIndicator = ({message}:{message:string}) =>{
    return (
      <View style={{ alignItems: 'center', marginTop: 15 }}>
        <AnimatedLoading
          color={theme.pageTextDark}
          style={{ width: 20, height: 20 }}
        />
        <View style={{ marginTop: 10, color: theme.pageText }}>
          {message}
        </View>
      </View>
    );
  }

  const AspspSelector = ({init_country, init_aspsp,onComplete,onError}:
    {init_country?:string, init_aspsp?:string,onComplete:(data:EnableBankingAuthenticationStartResponse)=> void, onError:(error:EnableBankingErrorInterface)=>void}) =>{
    const [availableCountries, setAvailableCountries] = useState<{id:string, name:string}[]|null>(null);
    const [availableAspsps, setAvailableAspsps] = useState<EnableBankingBank[] |null> (null);
    const [country, setCountry] = useState<{id:string, name:string}|null>(init_country?availableCountries.find((country) => country.id === init_country):null);
    const [aspsp, setAspsp] = useState<string|null>(init_aspsp?init_aspsp:null);
    const [startingAuth, setStartingAuth] = useState<boolean>(false);

    useEffect(()=>{
      send("enablebanking-countries")
        .then(({data,error}) =>{
          if(data){
            const cids = new Set(data);
            const availableCountries = COUNTRY_OPTIONS.filter(val => cids.has(val.id));
            setAvailableCountries(availableCountries);
            return;
          }
          onError(error);
        })

    },[send])

    useEffect(()=>{
      console.log(country)
      if(country){
        send("enablebanking-banks",{country:country.id})
        .then(({data,error})=>{
          if(data){
            setAvailableAspsps(data)
            return;
          }
          onError(error);
        })
      }

    },[country])

    const onSelectCountry = (country_id) => {
      if(!country || country_id != country.id){
        setCountry(availableCountries.find((country) => country.id === country_id));
        setAspsp(null);
        setAvailableAspsps(null);
        }
    }

    const onLink = async () =>{
      setStartingAuth(true);
      const {data,error} = await send('enablebanking-startauth', {
        country:country.id,
        aspsp: aspsp,
      });
      if (error) {
        // Handle the error from start auth.
        onError(error);
        setStartingAuth(false);
        return;
      }
      
      onComplete(data);
      setStartingAuth(false);
    }


    if(availableCountries === null){
      return <WaitingIndicator message={t("Getting the available countries from Enable Banking.")} />
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
          suggestions={availableCountries.sort((a, b) =>
            a.name.localeCompare(b.name),
          )}
          onSelect={onSelectCountry}
          value={country? country.id :null}
          inputProps={{
            id: 'country-field',
            placeholder: t('(please select)'),
          }}
        />
      </FormField>
      {(country && !availableAspsps && <WaitingIndicator message = {`Getting aspsps for ${country.name}.`}/>)}

      {(availableAspsps && 
      <FormField>
        <FormLabel
          title={t('Choose your bank:')}
          htmlFor="bank-field"
        />
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
      </FormField>)}
      {(country && aspsp &&
      <View>
        <Warning>
        <Trans>
          By enabling bank sync, you will be granting Enable Banking (a
          third party service) read-only access to your entire account’s
          transaction history. This service is not affiliated with Actual in
          any way. Make sure you’ve read and understand Enable Banking’s{' '}
          <Link
            variant="external"
            to="https://gocardless.com/privacy/"
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
            isLoading = {startingAuth}
          >
            <Trans>Link bank in browser</Trans> &rarr;
          </ButtonWithLoading>
        </View>
        </View>
      )}
      

    </View>);
  }

  const PollingComponent = ({authenticationStartResponse, onComplete, onError}:
    {authenticationStartResponse:EnableBankingAuthenticationStartResponse, 
      onComplete:(token:EnableBankingToken)=>void,
      onError:(error)=>void}) =>{
    useEffect(()=>{
      (async () =>{
        const { redirect_url, state } = authenticationStartResponse;
        //open redirect_url in browser
        window.Actual.openURLInBrowser(redirect_url);
        //polling starts here.
        const {data,error} = await send('enablebanking-pollauth', { state });

        if (error) {
          onError(error);
          return;
        }
        onComplete(data);
      })();

    }, [authenticationStartResponse])

    return <WaitingIndicator message={t("Please complete the authentication in the opened window.")} />
    
  }

  const CompletedAuthorizationIndicator = ({onContinue}:{onContinue:()=> void}) =>{
    return (
    <Button
      variant="primary"
      autoFocus
      style={{
        padding: '10px 0',
        fontSize: 15,
        fontWeight: 600,
        marginTop: 10,
      }}
      onPress={onContinue}
    >
      <Trans>Success! Click to continue</Trans> &rarr;
    </Button>
              );

  }

  const [phase, setPhase] = useState<"checkingAvailable"|"selectingAspsp"|"polling"|"done">("checkingAvailable");
  const [authenticationStartResponse, setAuthenticationStartResponse] = useState<EnableBankingAuthenticationStartResponse|null>(null);
  const [token, setToken] = useState<EnableBankingToken|null>(null);

  const resetState = ()=>{
    setPhase("checkingAvailable");
    setAuthenticationStartResponse(null);
    setToken(null);
  }

  useEffect(()=>{
    if(!isConfigurationLoading && phase == "checkingAvailable"){
      setPhase("selectingAspsp");
    }
  }, [isConfigurationLoading]);

  let component = <WaitingIndicator message="Checking if Enable Banking is available..." />

  switch(phase){
    case "selectingAspsp":
      component = <AspspSelector onComplete = {(response:EnableBankingAuthenticationStartResponse)=>{
        setAuthenticationStartResponse(response);
        setPhase("polling");
      }} onError = {(error)=>{setError(error); resetState();}}/>;
      break;
    case "polling":
      component = <PollingComponent authenticationStartResponse={authenticationStartResponse} onComplete={(token)=>{
        setToken(token);
        setPhase("done");
      }}  onError={(error)=>{
        setError(error)
        resetState();
      }} />;
      break;
    case "done":
      component = <CompletedAuthorizationIndicator onContinue={async ()=>{
        await onSuccess(token);
      }} />
  }
  return (
    <Modal
      name="enablebanking-setup-account"
      onClose={onClose}
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Link Your Bank')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            {error && renderError(error, t)}
            <Paragraph style={{ fontSize: 15 }}>
              <Trans>
                To link your bank account, you will be redirected to a new page
                where EnableBanking will ask to connect to your bank. Enable
                Banking will not be able to withdraw funds from your accounts.
              </Trans>
            </Paragraph>
            {(component)}
          </View>
        </>
      )}
    </Modal>
  );
}
