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
          maxWidth: 550,
          marginTop: 75,
          padding: '0 20px',
          fontSize: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ textAlign: 'center', lineHeight: '1.5em' }}>
          <Trans>
            <strong>Let's add your first account.</strong> Accounts hold your
            transactions, like everyday spending, savings, credit cards, or
            cash. Once an account exists you can import a statement file from
            your bank (CSV, OFX, QFX, QIF), connect it to your bank, or add
            transactions yourself.
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
          <Trans>You can add more accounts at any time from the sidebar.</Trans>
        </View>
      </View>
    </View>
  );
}
