import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type AccountEmptyMessageProps = {
  onAdd: () => void;
};

export function AccountEmptyMessage({ onAdd }: AccountEmptyMessageProps) {
  return (
    <View
      style={{
        color: theme.tableText,
        backgroundColor: theme.tableBackground,
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: 550,
          marginTop: 75,
          fontSize: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ textAlign: 'center', lineHeight: '1.4em' }}>
          <Trans>
            For Actual to be useful, you need to <strong>add an account</strong>
            . You can link an account to automatically download transactions, or
            manage it locally yourself.
          </Trans>
        </Text>

        <Button
          variant="primary"
          style={{ marginTop: 20 }}
          autoFocus
          onPress={onAdd}
        >
          <Trans>Add account</Trans>
        </Button>

        <View
          style={{ marginTop: 20, fontSize: 13, color: theme.tableTextLight }}
        >
          <Trans>In the future, you can add accounts from the sidebar.</Trans>
        </View>
      </View>
    </View>
  );
}
