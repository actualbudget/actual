import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function WaitingIndicator({ message }: { message: string }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 15 }}>
      <AnimatedLoading
        color={theme.pageTextDark}
        style={{ width: 20, height: 20 }}
      />
      <View style={{ marginTop: 10, color: theme.pageText }}>{message}</View>
    </View>
  );
}
