import { useEffect } from 'react';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { useSearchParams } from 'react-router';

export const ENABLEBANKING_CALLBACK_MESSAGE_TYPE = 'enablebanking-callback';

export function EnableBankingCallbackPage() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const state = params.get('state');

  useEffect(() => {
    if (code && window.opener) {
      window.opener.postMessage(
        { type: ENABLEBANKING_CALLBACK_MESSAGE_TYPE, code, state },
        window.location.origin,
      );
      window.close();
    }
  }, [code, state]);

  return (
    <View
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
        backgroundColor: theme.pageBackground,
        color: theme.pageText,
      }}
    >
      {code ? (
        <>
          <View style={{ fontSize: 18, fontWeight: 600 }}>
            Authentication complete
          </View>
          <View style={{ fontSize: 14, color: theme.pageTextSubdued }}>
            You can close this window and return to Actual.
          </View>
          <View
            style={{
              marginTop: 16,
              fontSize: 13,
              color: theme.pageTextSubdued,
            }}
          >
            If the window did not close automatically, copy the code below and
            paste it into Actual:
          </View>
          <View
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '10px 16px',
              backgroundColor: theme.tableHeaderBackground,
              borderRadius: 4,
              userSelect: 'text',
              wordBreak: 'break-all',
            }}
          >
            {code}
          </View>
          <Button
            variant="primary"
            onPress={() => {
              void navigator.clipboard.writeText(code);
            }}
          >
            Copy code
          </Button>
        </>
      ) : (
        <View style={{ color: theme.errorText }}>
          No authorization code found in the URL.
        </View>
      )}
    </View>
  );
}
