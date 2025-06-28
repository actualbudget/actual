// @ts-strict-ignore
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
  type CSSProperties,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as undo from 'loot-core/platform/client/undo';
import { type NewUserEntity, type UserEntity } from 'loot-core/types/models';

import { UserDirectoryHeader } from './UserDirectoryHeader';
import { UserDirectoryRow } from './UserDirectoryRow';

import { InfiniteScrollWrapper } from '@desktop-client/components/common/InfiniteScrollWrapper';
import { Link } from '@desktop-client/components/common/Link';
import { Search } from '@desktop-client/components/common/Search';
import {
  SelectedProvider,
  useSelected,
} from '@desktop-client/hooks/useSelected';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { signOut } from '@desktop-client/users/usersSlice';

type ManageUserDirectoryContentProps = {
  isModal: boolean;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

function useGetUserDirectoryErrors() {
  const { t } = useTranslation();

  const getUserDirectoryErrors = useCallback(
    reason => {
      switch (reason) {
        case 'unauthorized':
          return t('You are not logged in.');
        case 'token-expired':
          return t('Login expired, please log in again.');
        case 'user-cant-be-empty':
          return t(
            'Please enter a value for the username; the field cannot be empty.',
          );
        case 'role-cant-be-empty':
          return t('Select a role; the field cannot be empty.');
        case 'user-already-exists':
          return t(
            'The username you entered already exists. Please choose a different username.',
          );
        case 'not-all-deleted':
          return t(
            'Not all users were deleted. Check if one of the selected users is the server owner.',
          );
        case 'role-does-not-exists':
          return t(
            'Selected role does not exist, possibly a bug? Visit https://actualbudget.org/contact/ for support.',
          );
        default:
          return t(
            'An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: {{reason}})',
            { reason },
          );
      }
    },
    [t],
  );

  return { getUserDirectoryErrors };
}

function UserDirectoryContent({
  isModal,
  setLoading,
}: ManageUserDirectoryContentProps) {
  const { t } = useTranslation();

  const [allUsers, setAllUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const dispatch = useDispatch();

  const { getUserDirectoryErrors } = useGetUserDirectoryErrors();

  const filteredUsers = useMemo(() => {
    return (
      filter === ''
        ? allUsers
        : allUsers.filter(
            user =>
              user.displayName.toLowerCase().includes(filter.toLowerCase()) ||
              user.userName.toLowerCase().includes(filter.toLowerCase()) ||
              user.role.toLowerCase().includes(filter.toLowerCase()),
          )
    ).slice(0, 100 + page * 50);
  }, [allUsers, filter, page]);
  const selectedInst = useSelected('manage-users', allUsers, []);
  const selectedCount = selectedInst.items.size;

  const [hoveredUser, setHoveredUser] = useState(null);

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
      setPage(0);
    },
    [setFilter],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);

    const loadedUsers = (await send('users-get')) ?? [];
    if ('error' in loadedUsers) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            id: 'error',
            title: t('Error getting users'),
            sticky: true,
            message: getUserDirectoryErrors(loadedUsers.error),
          },
        }),
      );
      setLoading(false);
      return;
    }

    setAllUsers(loadedUsers);
    setLoading(false);
    return loadedUsers;
  }, [dispatch, getUserDirectoryErrors, setLoading, t]);

  useEffect(() => {
    async function loadData() {
      await loadUsers();
      setLoading(false);
    }

    loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  }, [setLoading, loadUsers]);

  function loadMore() {
    setPage(page => page + 1);
  }

  const onDeleteSelected = useCallback(async () => {
    setLoading(true);
    const res = await send('user-delete-all', [...selectedInst.items]);

    const error = res['error'];
    const someDeletionsFailed = res['someDeletionsFailed'];
    if (error || someDeletionsFailed) {
      if (error === 'token-expired') {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              id: 'login-expired',
              title: t('Login expired'),
              sticky: true,
              message: getUserDirectoryErrors(error),
              button: {
                title: t('Go to login'),
                action: () => {
                  dispatch(signOut());
                },
              },
            },
          }),
        );
      } else {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              title: t('Something happened while deleting users'),
              sticky: true,
              message: getUserDirectoryErrors(error),
            },
          }),
        );
      }
    }

    await loadUsers();
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }, [
    setLoading,
    selectedInst,
    loadUsers,
    dispatch,
    t,
    getUserDirectoryErrors,
  ]);

  const onEditUser = useCallback(
    user => {
      dispatch(
        pushModal({
          modal: {
            name: 'edit-user',
            options: {
              user,
              onSave: async () => {
                await loadUsers();
                setLoading(false);
              },
            },
          },
        }),
      );
    },
    [dispatch, loadUsers, setLoading],
  );

  function onAddUser() {
    const user: NewUserEntity = {
      userName: '',
      role: null,
      enabled: true,
      displayName: '',
    };

    dispatch(
      pushModal({
        modal: {
          name: 'edit-user',
          options: {
            user,
            onSave: async () => {
              await loadUsers();
              setLoading(false);
            },
          },
        },
      }),
    );
  }

  const onHover = useCallback(id => {
    setHoveredUser(id);
  }, []);

  return (
    <SelectedProvider instance={selectedInst}>
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: isModal ? '0 13px 15px' : '0 0 15px',
            flexShrink: 0,
          }}
        >
          <View
            style={{
              color: theme.pageTextLight,
              flexDirection: 'row',
              alignItems: 'center',
              width: '50%',
            }}
          >
            <Text>
              <Trans>
                Manage and view users who can create new budgets or be invited
                to access existing ones.
              </Trans>{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/config/multi-user/"
                linkColor="muted"
              >
                <Trans>Learn more</Trans>
              </Link>
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Filter users...')}
            value={filter}
            onChange={onSearchChange}
          />
        </View>

        <View style={{ flex: 1 }}>
          <UserDirectoryHeader />
          <InfiniteScrollWrapper loadMore={loadMore}>
            {filteredUsers.length === 0 ? (
              <EmptyMessage text={t('No users')} style={{ marginTop: 15 }} />
            ) : (
              <UsersList
                users={filteredUsers}
                selectedItems={selectedInst.items}
                hoveredUser={hoveredUser}
                onHover={onHover}
                onEditUser={onEditUser}
              />
            )}
          </InfiniteScrollWrapper>
        </View>
        <View
          style={{
            paddingBlock: 15,
            paddingInline: isModal ? 13 : 0,
            borderTop: isModal && '1px solid ' + theme.pillBorder,
            flexShrink: 0,
          }}
        >
          <Stack direction="row" align="center" justify="flex-end" spacing={2}>
            {selectedInst.items.size > 0 && (
              <Button onPress={onDeleteSelected}>
                <Trans count={selectedCount}>
                  Delete {{ selectedCount }} users
                </Trans>
              </Button>
            )}
            <Button variant="primary" onPress={onAddUser}>
              <Trans>Add new user</Trans>
            </Button>
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}

type EmptyMessageProps = {
  text: string;
  style?: CSSProperties;
};

function EmptyMessage({ text, style }: EmptyMessageProps) {
  return (
    <View
      style={{
        textAlign: 'center',
        color: theme.pageTextSubdued,
        fontStyle: 'italic',
        fontSize: 13,
        marginTop: 5,
        ...style,
      }}
    >
      {text}
    </View>
  );
}

type ManageUsersProps = {
  isModal: boolean;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

export function UserDirectory({
  isModal,
  setLoading = () => {},
}: ManageUsersProps) {
  return <UserDirectoryContent isModal={isModal} setLoading={setLoading} />;
}

type UsersListProps = {
  users: UserEntity[];
  selectedItems: Set<string>;
  hoveredUser?: string;
  onHover?: (id: string | null) => void;
  onEditUser?: (rule: UserEntity) => void;
};

function UsersList({
  users,
  selectedItems,
  hoveredUser,
  onHover,
  onEditUser,
}: UsersListProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <View>
      {users.map(user => {
        const hovered = hoveredUser === user.id;
        const selected = selectedItems.has(user.id);

        return (
          <UserDirectoryRow
            key={user.id}
            user={user}
            hovered={hovered}
            selected={selected}
            onHover={onHover}
            onEditUser={onEditUser}
          />
        );
      })}
    </View>
  );
}
