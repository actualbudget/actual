// @ts-strict-ignore
import * as asyncStorage from '../../platform/server/asyncStorage';
import { UserAvailable, UserEntity } from '../../types/models/user';
import { createApp } from '../app';
import { del, get, patch, post } from '../post';
import { getServer } from '../server-config';

import { AdminHandlers } from './types/handlers';

// Expose functions to the client
export const app = createApp<AdminHandlers>();

app.method('user-delete-all', async function (ids) {
  const userToken = await asyncStorage.getItem('user-token');
  if (userToken) {
    try {
      const res = await del(
        getServer().BASE_SERVER + '/admin/users',
        {
          ids,
        },
        {
          'X-ACTUAL-TOKEN': userToken,
        },
      );

      if (res) {
        return res;
      }
    } catch (err) {
      return { error: err.reason };
    }
  }

  return { someDeletionsFailed: true };
});

app.method('users-get', async function () {
  const userToken = await asyncStorage.getItem('user-token');

  if (userToken) {
    const res = await get(getServer().BASE_SERVER + '/admin/users/', {
      headers: {
        'X-ACTUAL-TOKEN': userToken,
      },
    });

    if (res) {
      try {
        const list = JSON.parse(res) as UserEntity[];
        return list;
      } catch (err) {
        return { error: 'Failed to parse response: ' + err.message };
      }
    }
  }

  return null;
});

app.method('user-add', async function (user) {
  const userToken = await asyncStorage.getItem('user-token');

  if (userToken) {
    try {
      const res = await post(getServer().BASE_SERVER + '/admin/users/', user, {
        'X-ACTUAL-TOKEN': userToken,
      });

      return res as UserEntity;
    } catch (err) {
      return { error: err.reason };
    }
  }

  return null;
});

app.method('user-update', async function (user) {
  const userToken = await asyncStorage.getItem('user-token');

  if (userToken) {
    try {
      const res = await patch(getServer().BASE_SERVER + '/admin/users/', user, {
        'X-ACTUAL-TOKEN': userToken,
      });

      return res as UserEntity;
    } catch (err) {
      return { error: err.reason };
    }
  }

  return null;
});

app.method('access-add', async function (access) {
  const userToken = await asyncStorage.getItem('user-token');

  if (userToken) {
    try {
      await post(getServer().BASE_SERVER + '/admin/access/', access, {
        'X-ACTUAL-TOKEN': userToken,
      });

      return {};
    } catch (err) {
      return { error: err.reason };
    }
  }

  return null;
});

app.method('access-delete-all', async function ({ fileId, ids }) {
  const userToken = await asyncStorage.getItem('user-token');
  if (userToken) {
    try {
      const res = await del(
        getServer().BASE_SERVER + `/admin/access?fileId=${fileId}`,
        {
          token: userToken,
          ids,
        },
      );

      if (res) {
        return res;
      }
    } catch (err) {
      return { error: err.reason };
    }
  }

  return { someDeletionsFailed: true };
});

app.method('access-get-available-users', async function (fileId) {
  const userToken = await asyncStorage.getItem('user-token');

  if (userToken) {
    const res = await get(
      `${getServer().BASE_SERVER + '/admin/access/users'}?fileId=${fileId}`,
      {
        headers: {
          'X-ACTUAL-TOKEN': userToken,
        },
      },
    );

    if (res) {
      try {
        return JSON.parse(res) as UserAvailable[];
      } catch (err) {
        return { error: 'Failed to parse response: ' + err.message };
      }
    }
  }

  return [];
});

app.method('transfer-ownership', async function ({ fileId, newUserId }) {
  const userToken = await asyncStorage.getItem('user-token');

  if (userToken) {
    try {
      await post(
        getServer().BASE_SERVER + '/admin/access/transfer-ownership/',
        { fileId, newUserId },
        {
          'X-ACTUAL-TOKEN': userToken,
        },
      );
    } catch (err) {
      return { error: err.reason };
    }
  }

  return {};
});

app.method('owner-created', async function () {
  const res = await get(getServer().BASE_SERVER + '/admin/owner-created/');

  if (res) {
    return JSON.parse(res) as boolean;
  }

  return null;
});
