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
import {
  type NewUserAccessEntity,
  type UserAccessEntity,
} from 'loot-core/types/models/userAccess';

import { useLocalPref } from '../../../hooks/useLocalPref';
import { SelectedProvider, useSelected } from '../../../hooks/useSelected';
import { SvgDotsHorizontalTriple, SvgLockOpen } from '../../../icons/v1';
import { SvgLockClosed } from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button';
import { Link } from '../../common/Link';
import { Popover } from '../../common/Popover';
import { Search } from '../../common/Search';
import { Stack } from '../../common/Stack';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { SimpleTable } from '../../rules/SimpleTable';

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
  const selectedInst = useSelected('manage-access', allAccess, []);
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

    const loadedAccess = (await send('access-get', cloudFileId)) ?? [];

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

  async function onDeleteSelected() {
    setLoading(true);
    const { someDeletionsFailed } = await send('user-delete-all', [
      ...selectedInst.items,
    ]);

    if (someDeletionsFailed) {
      alert('Some access were not revoked');
    }

    await loadAccess();
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }

  function onAddAccess() {
    const access: NewUserAccessEntity = {
      userId: '',
      fileId: cloudFileId,
    };

    dispatch(
      pushModal('edit-access', {
        access,
        onSave: async () => {
          await loadAccess();
          setLoading(false);
        },
      }),
    );
  }

  const onHover = useCallback(id => {
    setHoveredUserAccess(id);
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
            type="bare"
            aria-label="Menu"
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
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
                type="bare"
                aria-label="Menu"
                onClick={e => {
                  e.stopPropagation();
                  dispatch(
                    pushModal('transfer-ownership', {
                      onSave: async () => {
                        await loadAccess();
                        setLoading(false);
                      },
                    }),
                  );
                }}
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
            {filteredAccesses.length === 0 ? (
              <EmptyMessage text="No users" style={{ marginTop: 15 }} />
            ) : (
              <UserAccessList
                accesses={filteredAccesses}
                selectedItems={selectedInst.items}
                hoveredAccess={hoveredUserAccess}
                onHover={onHover}
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
              <Button onClick={onDeleteSelected}>
                Revoke access from {selectedInst.items.size} users
              </Button>
            )}
            <Button type="primary" onClick={onAddAccess}>
              Give access
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

export function UserAccess({
  isModal,
  setLoading = () => {},
}: ManageUsersProps) {
  return <UserAccessContent isModal={isModal} setLoading={setLoading} />;
}

type UsersAccessListProps = {
  accesses: UserAccessEntity[];
  selectedItems: Set<string>;
  hoveredAccess?: string;
  onHover?: (id: string | null) => void;
};

function UserAccessList({
  accesses,
  selectedItems,
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
        const selected = selectedItems.has(access.userId);

        return (
          <UserAccessRow
            key={access.userId}
            access={access}
            hovered={hovered}
            selected={selected}
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
