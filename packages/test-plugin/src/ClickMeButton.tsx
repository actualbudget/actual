import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components';
import { PluginContext } from '@actual-app/plugins-core';

type ClickMeButtonProps = {
  context: PluginContext;
};

export function ClickMeButton({ context }: ClickMeButtonProps) {
  return (
    <Button
      onPress={() => {
        context.navigate('/custom/test');
      }}
      variant="primary"
    >
      <Trans>Click me</Trans>
    </Button>
  );
}
