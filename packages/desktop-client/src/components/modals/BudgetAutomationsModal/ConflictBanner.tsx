import { Text } from '@actual-app/components/text';

import { Error } from '#components/alerts';
import {
  GlobalConflictDetail,
  GlobalConflictTitle,
} from '#components/budget/goals/automationMessages';
import type { GlobalConflictKind } from '#components/budget/goals/validateAutomation';

type ConflictBannerProps = {
  conflict: GlobalConflictKind;
};

export function ConflictBanner({ conflict }: ConflictBannerProps) {
  return (
    <Error
      style={{
        padding: '8px 12px',
        margin: '12px 24px 0',
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <Text>
        <strong>
          <GlobalConflictTitle conflict={conflict} />.
        </strong>{' '}
        <GlobalConflictDetail conflict={conflict} />
      </Text>
    </Error>
  );
}
