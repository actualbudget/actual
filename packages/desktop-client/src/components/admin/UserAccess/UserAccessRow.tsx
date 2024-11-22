// @ts-strict-ignore
import React, { memo, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { getUserAccessErrors } from 'loot-core/shared/errors';
import { type UserAvailable } from 'loot-core/types/models';

import { useActions } from '../../../hooks/useActions';
import { useMetadataPref } from '../../../hooks/useMetadataPref';
import { theme } from '../../../style';
import { View } from '../../common/View';
import { Checkbox } from '../../forms';
import { Row, Cell } from '../../table';

type UserAccessProps = {
  access: UserAvailable;
  hovered?: boolean;
  onHover?: (id: string | null) => void;
};

export const UserAccessRow = memo(
  ({ access, hovered, onHover }: UserAccessProps) => {
    const backgroundFocus = hovered;
    const [marked, setMarked] = useState(
      access.owner === 1 || access.haveAccess === 1,
    );
    const [cloudFileId] = useMetadataPref('cloudFileId');
    const actions = useActions();

    const handleAccessToggle = async () => {
      const newValue = !marked;
      if (newValue) {
        const { error } = await send('access-add', {
          fileId: cloudFileId as string,
          userId: access.userId,
        });

        if (error) {
          handleError(error);
        }
      } else {
        const { someDeletionsFailed } = await send('access-delete-all', {
          fileId: cloudFileId as string,
          ids: [access.userId],
        });

        if (someDeletionsFailed) {
          actions.addNotification({
            type: 'error',
            title: 'Access Revocation Incomplete',
            message: 'Some access permissions were not revoked successfully.',
            sticky: true,
          });
        }
      }
      setMarked(newValue);
    };

    const handleError = (error: string) => {
      if (error === 'token-expired') {
        actions.addNotification({
          type: 'error',
          id: 'login-expired',
          title: 'Login expired',
          sticky: true,
          message: getUserAccessErrors(error),
          button: {
            title: 'Go to login',
            action: () => {
              actions.signOut();
            },
          },
        });
      } else {
        actions.addNotification({
          type: 'error',
          title: 'Something happened while editing access',
          sticky: true,
          message: getUserAccessErrors(error),
        });
      }
    };

    return (
      <Row
        height="auto"
        style={{
          fontSize: 13,
          backgroundColor: backgroundFocus
            ? theme.tableRowBackgroundHover
            : theme.tableBackground,
        }}
        collapsed={true}
        onMouseEnter={() => onHover && onHover(access.userId)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <Cell
          width={100}
          plain
          style={{ padding: '0 15px', paddingLeft: 5, alignItems: 'center' }}
        >
          <Checkbox
            defaultChecked={marked}
            disabled={access.owner === 1}
            onClick={handleAccessToggle}
          />
        </Cell>
        <Cell
          name="displayName"
          width="flex"
          plain
          style={{ color: theme.tableText }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              padding: '3px 5px',
            }}
          >
            <span>{access.displayName ?? access.userName}</span>
          </View>
        </Cell>
        <Cell
          name="displayName"
          width={100}
          plain
          style={{ color: theme.tableText }}
        >
          <View
            style={{ padding: '0 15px', paddingLeft: 5, alignItems: 'center' }}
          >
            <Checkbox
              checked={access.owner === 1}
              disabled={access.owner === 1}
            />
          </View>
        </Cell>
      </Row>
    );
  },
);

UserAccessRow.displayName = 'UserRow';
