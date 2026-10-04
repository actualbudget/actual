import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';

import {
  useCreateAccountGroupMutation,
  useMoveAccountGroupMutation,
} from '#account-groups';
import { useUpdateAccountMutation } from '#accounts';
import {
  AccountGroupAutocomplete,
  NEW_ACCOUNT_GROUP_ID,
} from '#components/autocomplete/AccountGroupAutocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { useAccount } from '#hooks/useAccount';
import { useAccountGroups } from '#hooks/useAccountGroups';

import { AccountGroupRow } from './AccountGroupRow';
import { SelectedIndicator } from './SelectedIndicator';

type AccountGroupsModalProps = {
  accountId: AccountEntity['id'];
};

export function AccountGroupsModal({ accountId }: AccountGroupsModalProps) {
  const { t } = useTranslation();
  const account = useAccount(accountId);
  const { data: groups = [], isPlaceholderData } = useAccountGroups();

  const createGroup = useCreateAccountGroupMutation();
  const moveGroup = useMoveAccountGroupMutation();
  const updateAccount = useUpdateAccountMutation();

  const selectedGroupId =
    account != null &&
    groups.some(group => group.id === account.account_group_id)
      ? account.account_group_id
      : null;

  const onSelect = (groupId: AccountGroupEntity['id'] | null) => {
    updateAccount.mutate({
      account: { id: accountId, account_group_id: groupId },
    });
  };

  return (
    <Modal name="account-groups">
      {({ state }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={t('Account group')} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {isPlaceholderData ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <AnimatedLoading width={20} height={20} />
            </View>
          ) : (
            <View style={{ gap: 2 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <SelectedIndicator selected={selectedGroupId == null} />
                <Button
                  variant="bare"
                  onPress={() => onSelect(null)}
                  style={{ flex: 1, justifyContent: 'flex-start' }}
                >
                  <Text style={{ fontStyle: 'italic' }}>
                    <Trans>None</Trans>
                  </Text>
                </Button>
              </View>
              {groups.map((group, index) => (
                <AccountGroupRow
                  key={group.id}
                  group={group}
                  selected={selectedGroupId === group.id}
                  onSelect={() => onSelect(group.id)}
                  onMoveUp={
                    index > 0 && !moveGroup.isPending
                      ? () =>
                          moveGroup.mutate({
                            id: group.id,
                            targetId: groups[index - 1].id,
                          })
                      : undefined
                  }
                  onMoveDown={
                    index < groups.length - 1 && !moveGroup.isPending
                      ? () =>
                          moveGroup.mutate({
                            id: group.id,
                            targetId: groups[index + 2]?.id ?? null,
                          })
                      : undefined
                  }
                />
              ))}
              {groups.length === 0 && (
                <Text
                  style={{ color: theme.pageTextSubdued, padding: '5px 0' }}
                >
                  <Trans>
                    No account groups yet. Add one below to start grouping your
                    accounts.
                  </Trans>
                </Text>
              )}
              <View style={{ marginTop: 10 }}>
                <AccountGroupAutocomplete
                  key={selectedGroupId ?? 'none'}
                  groups={groups}
                  value={null}
                  inputProps={{
                    placeholder: t('Find or create a group…'),
                  }}
                  onSelect={async (groupId, rawValue) => {
                    if (groupId === NEW_ACCOUNT_GROUP_ID) {
                      try {
                        const newId = await createGroup.mutateAsync({
                          name: rawValue.trim(),
                        });
                        onSelect(newId);
                      } catch {
                        // Creation failures surface as a notification
                      }
                    } else if (groupId) {
                      onSelect(groupId);
                    }
                  }}
                />
              </View>
            </View>
          )}
        </>
      )}
    </Modal>
  );
}
