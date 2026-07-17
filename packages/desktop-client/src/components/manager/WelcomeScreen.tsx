import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgLogo } from '@actual-app/components/icons/logo';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, keyframes } from '@emotion/css';

import { createBudget } from '#budgetfiles/budgetfilesSlice';
import { Link } from '#components/common/Link';
import { useServerURL } from '#components/ServerContext';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

const fadeInUp = keyframes({
  from: { opacity: 0, transform: 'translateY(12px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

function entrance(delay: number) {
  return css({
    opacity: 0,
    animationName: fadeInUp,
    animationDuration: '500ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'forwards',
    animationDelay: `${delay}ms`,
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      opacity: 1,
    },
  });
}

export function WelcomeScreen() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const serverURL = useServerURL();
  const { isNarrowWidth } = useResponsive();

  const buttonStyle = {
    fontSize: 15,
    padding: '12px 15px',
    flexShrink: 0,
    ...(isNarrowWidth && { minHeight: styles.mobileMinHeight }),
  };

  return (
    <View
      style={{
        alignItems: 'center',
        gap: isNarrowWidth ? 25 : 12,
        width: '100%',
        maxWidth: 480,
        fontSize: 15,
        maxHeight: '100%',
        overflowY: 'auto',
        paddingTop: 20,
        // Keep the last line clear of the absolutely-positioned
        // server bar at the bottom of the screen.
        paddingBottom: 'calc(45px + env(safe-area-inset-bottom))',
      }}
    >
      <View
        className={entrance(0)}
        style={{ alignItems: 'center', gap: 10, flexShrink: 0 }}
      >
        <SvgLogo
          width={45}
          height={45}
          style={{ color: theme.pageTextPositive }}
        />
        <Text style={{ ...styles.veryLargeText, textAlign: 'center' }}>
          <Trans>Welcome to Actual</Trans>
        </Text>
        <Text
          style={{
            color: theme.pageTextLight,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          <Trans>Your finances - made simple</Trans>
        </Text>
      </View>

      <View
        className={entrance(150)}
        style={{ alignItems: 'center', flexShrink: 0 }}
      >
        <Paragraph
          style={{ textAlign: 'center', maxWidth: 400, marginBottom: 0 }}
        >
          <Trans>
            Actual is a super fast, privacy-focused app for managing your
            finances. It is 100% free and open source: everything stays on your
            device, no data is collected, and there is nothing to sign up for.
          </Trans>
        </Paragraph>
      </View>

      <View
        className={entrance(300)}
        style={{
          width: '100%',
          maxWidth: 400,
          gap: 10,
          flexShrink: 0,
          marginTop: 10,
        }}
      >
        <Button
          variant="primary"
          autoFocus={!isNarrowWidth}
          style={buttonStyle}
          onPress={() => dispatch(createBudget({}))}
        >
          <Trans>Start budgeting</Trans>
        </Button>
        <Button
          style={buttonStyle}
          onPress={() => dispatch(createBudget({ testMode: true }))}
        >
          <Trans>Try the demo</Trans>
        </Button>
        {!serverURL && (
          <Button
            style={buttonStyle}
            onPress={() => navigate('/config-server')}
          >
            <Trans>Connect to a sync server</Trans>
          </Button>
        )}
      </View>

      <View
        className={entrance(450)}
        style={{
          alignItems: 'center',
          gap: isNarrowWidth ? 12 : 5,
          flexShrink: 0,
          marginTop: 10,
        }}
      >
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Coming from another budgeting app?</Trans>
        </Text>
        <Button
          variant="bare"
          style={{ color: theme.pageTextLink }}
          onPress={() => dispatch(pushModal({ modal: { name: 'import' } }))}
        >
          <Trans>Import my budget</Trans>
        </Button>
        <Paragraph
          style={{
            color: theme.pageTextLight,
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 400,
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          <Trans>
            New to budgeting? Take the{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/tour/"
              linkColor="purple"
            >
              guided tour
            </Link>{' '}
            to learn how Actual works.
          </Trans>
        </Paragraph>
      </View>
    </View>
  );
}
