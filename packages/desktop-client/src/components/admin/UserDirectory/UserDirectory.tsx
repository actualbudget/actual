// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
} from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import {
  type NewUserEntity,
  type UserEntity,
} from 'loot-core/types/models/user';

import { useActions } from '../../../hooks/useActions';
import { SelectedProvider, useSelected } from '../../../hooks/useSelected';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Link } from '../../common/Link';
import { Search } from '../../common/Search';
import { Stack } from '../../common/Stack';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { SimpleTable } from '../../common/SimpleTable';

import { UserDirectoryHeader } from './UserDirectoryHeader';
import { UserDirectoryRow } from './UserDirectoryRow';

type ManageUserDirectoryContentProps = {
  isModal: boolean;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

function getUserDirectoryErrors(reason) {
  switch (reason) {
    case 'unauthorized':
      return 'You are not logged in.';
    case 'token-expired':
      return 'Login expired, please login again.';
    case 'user-cant-be-empty':
      return 'Please enter a value for the username; the field cannot be empty.';
    case 'role-cant-be-empty':
      return 'Select a role; the field cannot be empty.';
    case 'user-already-exists':
      return 'The username you entered already exists. Please choose a different username.';
    case 'not-all-deleted':
      return 'Not all users were deleted. Check if one of the selected users is the master user.';
    case 'role-does-not-exists':
      return 'Selected role does not exists, possibly a bug? Visit https://actualbudget.org/contact/ for support.';
    default:
      return `An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: ${reason})`;
  }
}

function UserDirectoryContent({
  isModal,
  setLoading,
}: ManageUserDirectoryContentProps) {
  const [allUsers, setAllUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const dispatch = useDispatch();
  const actions = useActions();

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

    setAllUsers(loadedUsers);
    setLoading(false);
    return loadedUsers;
  }, [setLoading]);

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
    const { error } = await send('user-delete-all', [...selectedInst.items]);

    if (error) {
      if (error === 'token-expired') {
        actions.addNotification({
          type: 'error',
          title: 'Login expired',
          sticky: true,
          message: getUserDirectoryErrors(error),
          button: {
            title: 'Go to login',
            action: () => actions.goToLoginFromManagement(),
          },
        });
      } else {
        actions.addNotification({
          type: 'error',
          title: 'Something happened while deleting users',
          sticky: true,
          message: getUserDirectoryErrors(error),
        });
      }
    }

    await loadUsers();
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }, [actions, loadUsers, selectedInst, setLoading]);

  const onEditUser = useCallback(
    user => {
      dispatch(
        pushModal('edit-user', {
          user,
          onSave: async () => {
            await loadUsers();
            setLoading(false);
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
      pushModal('edit-user', {
        user,
        onSave: async () => {
          await loadUsers();
          setLoading(false);
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
              Manage and view users who can create new budgets or be invited to
              access existing ones.{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/budgeting/users/"
                linkColor="muted"
              >
                Learn more
              </Link>
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder="Filter users..."
            value={filter}
            onChange={onSearchChange}
          />
        </View>

        <View style={{ flex: 1 }}>
          <UserDirectoryHeader />
          <SimpleTable
            loadMore={loadMore}
            // Hide the last border of the item in the table
            style={{ marginBottom: -1 }}
          >
            {filteredUsers.length === 0 ? (
              <EmptyMessage text="No users" style={{ marginTop: 15 }} />
            ) : (
              <UsersList
                users={filteredUsers}
                selectedItems={selectedInst.items}
                hoveredUser={hoveredUser}
                onHover={onHover}
                onEditUser={onEditUser}
              />
            )}
          </SimpleTable>
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
                Delete {selectedInst.items.size} users
              </Button>
            )}
            <Button variant="primary" onPress={onAddUser}>
              Add new user
            </Button>
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}

function EmptyMessage({ text, style }) {
  return (
    <View
      style={{
        textAlign: 'center',
        color: theme.pageTextSubdued,
        fontStyle: 'italic',
        fontSize: 13,
        marginTop: 5,
        style,
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
