import { type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';

type PayeeRuleCountLabelProps = {
  count: number;
  style?: CSSProperties;
};

export function PayeeRuleCountLabel({
  count,
  style,
}: PayeeRuleCountLabelProps) {
  return (
    <Text style={style}>
      {count > 0 ? (
        <Trans count={count}>{{ count }} associated rules</Trans>
      ) : (
        <Trans>Create rule</Trans>
      )}
    </Text>
  );
}
