// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
  type CSSProperties,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { type Handlers } from 'loot-core/types/handlers';
import { type UserAvailable } from 'loot-core/types/models';
import { type UserAccessEntity } from 'loot-core/types/models/userAccess';

import { useMetadataPref } from '../../../hooks/useMetadataPref';
import { SvgLockOpen } from '../../../icons/v1';
import { SvgLockClosed } from '../../../icons/v2';
import { useDispatch } from '../../../redux';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Link } from '../../common/Link';
import { Search } from '../../common/Search';
import { SimpleTable } from '../../common/SimpleTable';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { UserAccessHeader } from './UserAccessHeader';
import { UserAccessRow } from './UserAccessRow';

type ManageUserAccessContentProps = {
  isModal: boolean;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

function UserAccessContent({
  isModal,
  setLoading,
}: ManageUserAccessContentProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [allAccess, setAllAccess] = useState([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [cloudFileId] = useMetadataPref('cloudFileId');

  const filteredAccesses = useMemo(
    () =>
      (filter === ''
        ? allAccess
        : allAccess.filter(
            access =>
              access?.displayName
                .toLowerCase()
                .includes(filter.toLowerCase()) ?? false,
          )
      ).slice(0, 100 + page * 50),
    [allAccess, filter, page],
  );
  const [hoveredUserAccess, setHoveredUserAccess] = useState(null);

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
      setPage(0);
    },
    [setFilter],
  );

  const loadAccess = useCallback(async () => {
    setLoading(true);
    const data: Awaited<ReturnType<Handlers['access-get-available-users']>> =
      await send('access-get-available-users', cloudFileId as string);

    const sortUsers = (a: UserAvailable, b: UserAvailable) => {
      if ((a.owner ?? 0) !== (b.owner ?? 0)) {
        return (b.owner ?? 0) - (a.owner ?? 0);
      }
      return (a.displayName ?? '').localeCompare(b.displayName ?? '');
    };

    if ('error' in data) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            id: 'error',
            title: t('Error getting available users'),
            sticky: true,
            message: data.error,
          },
        }),
      );
      return [];
    }

    const loadedAccess = data
      .map(user => ({
        ...user,
        displayName: user.displayName || user.userName,
      }))
      .sort(sortUsers);

    setAllAccess(loadedAccess);
    return loadedAccess;
  }, [cloudFileId, dispatch, setLoading, t]);

  const loadOwner = useCallback(async () => {
    const file = (await send('get-user-file-info', cloudFileId as string)) ?? {
      usersWithAccess: [],
    };
    const owner = file?.usersWithAccess.filter(user => user.owner);

    if (owner.length > 0) {
      return owner[0];
    }

    return null;
  }, [cloudFileId]);

  useEffect(() => {
    async function loadData() {
      try {
        await loadAccess();
      } catch (error) {
        console.error('Error loading user access data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  }, [setLoading, loadAccess, loadOwner]);

  function loadMore() {
    setPage(page => page + 1);
  }

  const onHover = useCallback(id => {
    setHoveredUserAccess(id);
  }, []);

  return (
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
              Determine which users can view and manage your budgets
            </Trans>{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/budgeting/users-access/"
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
        <UserAccessHeader />
        <SimpleTable
          loadMore={loadMore}
          // Hide the last border of the item in the table
          style={{ marginBottom: -1 }}
        >
          <UserAccessList
            accesses={filteredAccesses}
            hoveredAccess={hoveredUserAccess}
            onHover={onHover}
          />
        </SimpleTable>
      </View>
      <View
        style={{
          paddingBlock: 15,
          paddingInline: isModal ? 13 : 0,
          borderTop: isModal && '1px solid ' + theme.pillBorder,
          flexShrink: 0,
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <LockToggle
          style={{ width: 16, height: 16 }}
          onToggleSave={async () => {
            await loadAccess();
            setLoading(false);
          }}
        />
      </View>
    </View>
  );
}

type ManageUsersProps = {
  isModal: boolean;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

export function UserAccess({
  isModal,
  setLoading = () => {},
}: ManageUsersProps) {
  return <UserAccessContent isModal={isModal} setLoading={setLoading} />;
}

type UsersAccessListProps = {
  accesses: UserAccessEntity[];
  hoveredAccess?: string;
  onHover?: (id: string | null) => void;
};

function UserAccessList({
  accesses,
  hoveredAccess,
  onHover,
}: UsersAccessListProps) {
  if (accesses.length === 0) {
    return null;
  }

  return (
    <View>
      {accesses.map(access => {
        const hovered = hoveredAccess === access.userId;

        return (
          <UserAccessRow
            key={access.userId}
            access={access}
            hovered={hovered}
            onHover={onHover}
          />
        );
      })}
    </View>
  );
}

type LockToggleProps = {
  style: CSSProperties;
  onToggleSave: () => void;
};

function LockToggle({ style, onToggleSave }: LockToggleProps) {
  const [hover, setHover] = useState(false);
  const dispatch = useDispatch();

  return (
    <Button
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      variant="primary"
      aria-label="Menu"
      onPress={() =>
        dispatch(
          pushModal({
            modal: {
              name: 'transfer-ownership',
              options: {
                onSave: () => onToggleSave(),
              },
            },
          }),
        )
      }
    >
      {hover && <SvgLockOpen style={{ ...style, marginRight: 5 }} />}
      {!hover && <SvgLockClosed style={{ ...style, marginRight: 5 }} />}{' '}
      <Trans>Transfer ownership</Trans>
    </Button>
  );
}
