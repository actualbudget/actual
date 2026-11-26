import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type FeatureControlProps = {
  feedbackLink?: string;
  children: ReactNode;
};

/**
 * The control of an experimental feature's row, with the link to where
 * feedback on the feature is collected beside it.
 */
export function FeatureControl({
  feedbackLink,
  children,
}: FeatureControlProps) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      {feedbackLink && (
        <Link variant="external" to={feedbackLink} linkColor="purple">
          <Trans>Give feedback</Trans>
        </Link>
      )}
      {children}
    </View>
  );
}
