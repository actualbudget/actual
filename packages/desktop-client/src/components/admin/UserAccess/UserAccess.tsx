// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
  useRef,
} from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { type UserAvailable } from 'loot-core/types/models';
import { type UserAccessEntity } from 'loot-core/types/models/userAccess';

import { useLocalPref } from '../../../hooks/useLocalPref';
import { SvgDotsHorizontalTriple, SvgLockOpen } from '../../../icons/v1';
import { SvgLockClosed } from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Link } from '../../common/Link';
import { Popover } from '../../common/Popover';
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
  const [allAccess, setAllAccess] = useState([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [cloudFileId] = useLocalPref('cloudFileId');
  const dispatch = useDispatch();
  const [ownerName, setOwnerName] = useState('unknown');
  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    const users: UserAvailable[] = await send(
      'access-get-available-users',
      cloudFileId,
    );

    const loadedAccess = users
      .map(user => ({
        ...user,
        displayName: user.displayName ? user.displayName : user.userName,
      }))
      .sort((a, b) => {
        if ((a.owner ?? 0) !== (b.owner ?? 0)) {
          return (b.owner ?? 0) - (a.owner ?? 0);
        }

        if (a.displayName && b.displayName) {
          return a.displayName.localeCompare(b.displayName);
        }

        if (!a.displayName) return 1;
        if (!b.displayName) return -1;

        return 0;
      });
    setAllAccess(loadedAccess);

    return loadedAccess;
  }, [cloudFileId, setLoading]);

  const loadOwner = useCallback(async () => {
    const owner = (await send('file-owner-get', cloudFileId)) ?? {};
    return owner;
  }, [cloudFileId]);

  useEffect(() => {
    async function loadData() {
      await loadAccess();
      const owner = await loadOwner();
      if (owner) {
        setOwnerName(owner?.displayName ?? owner?.userName);
      }
      setLoading(false);
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
            Determine which users can view and manage your budgets..{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/budgeting/users-access/"
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '5px',
        }}
      >
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label="Menu"
          onPress={() => setMenuOpen(true)}
        >
          <SvgDotsHorizontalTriple style={{ width: 16, height: 16 }} />
        </Button>
        <Popover
          triggerRef={triggerRef}
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          style={{ padding: 10 }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                ...styles.altMenuHeaderText,
                ...styles.verySmallText,
                color: theme.pageTextLight,
                marginRight: '5px',
              }}
            >
              Owner:
            </View>
            <View
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                marginRight: '5px',
              }}
            >
              {ownerName}
            </View>
            <Button
              variant="bare"
              aria-label="Menu"
              onPress={() =>
                dispatch(
                  pushModal('transfer-ownership', {
                    onSave: async () => {
                      await loadAccess();
                      setLoading(false);
                    },
                  }),
                )
              }
            >
              <LockToggle style={{ width: 16, height: 16 }} />
            </Button>
          </View>
        </Popover>
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

const LockToggle = props => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'inline-block' }}
    >
      {isHovered ? <SvgLockOpen {...props} /> : <SvgLockClosed {...props} />}
    </div>
  );
};
