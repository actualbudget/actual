import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function UnsupportedDirectivesNotice({
  hasErrorTemplate,
  hasSpendTemplate,
  onClose,
}: {
  hasErrorTemplate: boolean;
  hasSpendTemplate: boolean;
  onClose: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 32,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <SvgAlertTriangle
        width={32}
        height={32}
        style={{ color: theme.errorText }}
      />
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.pageText,
        }}
      >
        <Trans>This category isn&rsquo;t supported in the UI yet</Trans>
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.pageTextSubdued,
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        {hasErrorTemplate ? (
          <Trans>
            One or more <code>#template</code> lines in this category&rsquo;s
            notes couldn&rsquo;t be parsed. Fix them as text first, then re-open
            this modal to migrate.
          </Trans>
        ) : hasSpendTemplate ? (
          <Trans>
            This category uses a <code>spend from</code> template, which the
            budget automations UI doesn&rsquo;t handle yet. Keep editing it as
            text in the category&rsquo;s notes.
          </Trans>
        ) : (
          <Trans>
            This category uses a <code>#cleanup</code> directive, which the
            budget automations UI doesn&rsquo;t handle yet. Keep editing it as
            text in the category&rsquo;s notes.
          </Trans>
        )}
      </Text>
      <Button onPress={onClose}>
        <Trans>Close</Trans>
      </Button>
    </View>
  );
}

const CLEANUP_DIRECTIVE = /^\s*#cleanup\b/;

export function hasCleanupLine(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes.split('\n').some(line => CLEANUP_DIRECTIVE.test(line));
}
