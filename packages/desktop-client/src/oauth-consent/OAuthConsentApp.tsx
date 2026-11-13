import { useEffect, useRef, useState } from 'react';
import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgLogo } from '@actual-app/components/icons/logo';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import {
  SvgArrowLeft,
  SvgArrowRight,
  SvgCloudCheck,
} from '@actual-app/components/icons/v1';
import {
  darkThemeCss,
  lightThemeCss,
  paletteCss,
} from '@actual-app/components/themes';
import { View } from '@actual-app/components/view';

import { Background } from '#components/Background';

type Budget = { id: string; name: string };
type ConsentData = {
  clientName?: string;
  csrfToken?: string;
  budgets?: Budget[];
  logoUri?: string;
  redirectUri?: string;
  loginUrl?: string;
};
type ApiResponse = {
  status?: string;
  data?: ConsentData;
  error?: string;
  reason?: string;
};
type ServerInfoResponse = { build?: { version?: string } };

async function readResponse(
  response: Response,
  invalidResponseMessage: string,
): Promise<ApiResponse> {
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object') {
    throw new Error(invalidResponseMessage);
  }
  return result as ApiResponse;
}

function redirectTo(uri: string) {
  window.location.assign(uri);
}

export function OAuthConsentApp() {
  const { t } = useTranslation();
  const authorizationQuery = window.location.search;
  const [clientName, setClientName] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [serverVersion, setServerVersion] = useState('');
  const [fileId, setFileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const budgetTriggerRef = useRef<HTMLButtonElement>(null);
  const outsidePointerDown = useRef(false);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      outsidePointerDown.current =
        target instanceof Element &&
        !target.closest('.budget-select, .budget-popover');
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  useEffect(() => {
    document.title = `${t('Authorize access')} · Actual Budget`;
  }, [t]);

  useEffect(() => {
    let active = true;
    fetch('/info', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        if (!response.ok) return;
        const result = (await response.json()) as ServerInfoResponse;
        if (active && result.build?.version) {
          setServerVersion(result.build.version);
        }
      })
      .catch(() => {
        // The version label is supplemental; consent details remain usable.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/oauth/browser/request${authorizationQuery}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        const result = await readResponse(
          response,
          t('The server returned an invalid response.'),
        );
        if (!active) return;
        if (response.status === 401) {
          if (result.data?.loginUrl) redirectTo(result.data.loginUrl);
          else throw new Error(t('Sign in is required to continue.'));
          return;
        }
        if (!response.ok || result.status !== 'ok' || !result.data) {
          throw new Error(t('Unable to load this authorization request.'));
        }
        if (result.data.redirectUri) {
          redirectTo(result.data.redirectUri);
          return;
        }
        if (
          !result.data.clientName ||
          !result.data.csrfToken ||
          !result.data.budgets
        ) {
          throw new Error(
            t('The server returned incomplete authorization details.'),
          );
        }
        if (active) {
          setClientName(result.data.clientName);
          setLogoUri(result.data.logoUri || '');
          setLogoFailed(false);
          setCsrfToken(result.data.csrfToken);
          setBudgets(result.data.budgets);
        }
      })
      .catch(reason => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : t('Unable to load this authorization request.'),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authorizationQuery, t]);

  async function submit(action: 'consent' | 'deny') {
    if (submitting || !csrfToken || (action === 'consent' && !fileId)) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/oauth/browser/${action}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ csrfToken, fileId, authorizationQuery }),
      });
      const result = await readResponse(
        response,
        t('The server returned an invalid response.'),
      );
      if (!response.ok || result.status !== 'ok' || !result.data?.redirectUri) {
        throw new Error(t('Unable to complete this authorization request.'));
      }
      redirectTo(result.data.redirectUri);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('Unable to complete this authorization request.'),
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="consent-page">
      <style>{paletteCss}</style>
      <style media="(prefers-color-scheme: light)">{lightThemeCss}</style>
      <style media="(prefers-color-scheme: dark)">{darkThemeCss}</style>
      <div className="consent-background" aria-hidden="true">
        <Background />
      </div>
      <section
        className="consent-card"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
      >
        <div className="consent-content">
          {loading ? (
            <output className="status">Checking your request…</output>
          ) : error && !clientName ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : (
            <>
              <div className="connection-icons" aria-hidden="true">
                <div className="connection-icon">
                  {logoUri && !logoFailed ? (
                    <img
                      src={logoUri}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <span>{clientName.trim().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="connection-arrows">
                  <SvgArrowLeft />
                  <SvgArrowRight />
                </span>
                <div className="connection-icon actual-icon">
                  <SvgLogo />
                </div>
              </div>
              <h1 id="consent-title">
                <Trans>Authorize access</Trans>
              </h1>
              <p id="consent-description" className="description">
                <Trans>
                  <strong>{clientName}</strong> will be able to read and change
                  data in the selected budget through the Actual API. Access is
                  limited to the selected budget and can be revoked in API
                  settings.
                </Trans>
              </p>
              <fieldset className="budget-selection" disabled={submitting}>
                <legend>
                  <Trans>Budget</Trans>
                </legend>
                {budgets.length > 0 && (
                  <Select
                    aria-label={t('Budget')}
                    placeholder={t('Choose a budget')}
                    selectedKey={fileId || null}
                    onSelectionChange={key => {
                      if (key !== null) setFileId(String(key));
                    }}
                    onOpenChange={isOpen => {
                      if (isOpen || !outsidePointerDown.current) return;
                      outsidePointerDown.current = false;
                      requestAnimationFrame(() => {
                        if (
                          document.activeElement === budgetTriggerRef.current
                        ) {
                          budgetTriggerRef.current?.blur();
                        }
                      });
                    }}
                    isDisabled={submitting}
                    className="budget-select"
                  >
                    <AriaButton
                      ref={budgetTriggerRef}
                      className="budget-select-trigger"
                    >
                      <SelectValue className="budget-select-value">
                        {({ isPlaceholder, selectedText }) => (
                          <span>
                            {isPlaceholder
                              ? t('Choose a budget')
                              : selectedText}
                          </span>
                        )}
                      </SelectValue>
                      <SvgExpandArrow aria-hidden="true" />
                    </AriaButton>
                    <Popover className="budget-popover">
                      <ListBox
                        aria-label={t('Available budgets')}
                        className="budget-options"
                        items={budgets}
                      >
                        {budget => (
                          <ListBoxItem
                            id={budget.id}
                            key={budget.id}
                            textValue={budget.name}
                            className="budget-option"
                          >
                            <span className="budget-name">{budget.name}</span>
                            <span className="budget-option-status">
                              <SvgCloudCheck aria-hidden="true" />
                              <Trans>Syncing</Trans>
                            </span>
                          </ListBoxItem>
                        )}
                      </ListBox>
                    </Popover>
                  </Select>
                )}
              </fieldset>
              {budgets.length === 0 && (
                <p className="status">
                  <Trans>No budgets are available for authorization.</Trans>
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <View
                className="actions"
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  marginTop: 22,
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  variant="normal"
                  onPress={() => void submit('deny')}
                  isDisabled={submitting || !csrfToken}
                >
                  <Trans>Deny</Trans>
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void submit('consent')}
                  isDisabled={submitting || !fileId || !csrfToken}
                >
                  {submitting ? (
                    <Trans>Submitting…</Trans>
                  ) : (
                    <Trans>Allow access</Trans>
                  )}
                </Button>
              </View>
            </>
          )}
        </div>
      </section>
      <footer>
        <span className="footer-tagline">
          <Trans>Personal finance, under your control.</Trans>
        </span>
        {serverVersion && (
          <span className="server-version">
            <Trans>Server:</Trans> {serverVersion}
          </span>
        )}
      </footer>
    </main>
  );
}
