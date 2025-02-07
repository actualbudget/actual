import express from 'express';
import * as uuid from 'uuid';
import {
  errorMiddleware,
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares.js';
import validateSession from './util/validate-user.js';
import { isAdmin } from './account-db.js';
import * as UserService from './services/user-service.js';

let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

export { app as handlers };

app.get('/owner-created/', (req, res) => {
  try {
    const ownerCount = UserService.getOwnerCount();
    res.json(ownerCount > 0);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve owner count' });
  }
});

app.get('/users/', validateSessionMiddleware, (req, res) => {
  const users = UserService.getAllUsers();
  res.json(
    users.map((u) => ({
      ...u,
      owner: u.owner === 1,
      enabled: u.enabled === 1,
    })),
  );
});

app.post('/users', validateSessionMiddleware, async (req, res) => {
  if (!isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const { userName, role, displayName, enabled } = req.body;

  if (!userName || !role) {
    res.status(400).send({
      status: 'error',
      reason: `${!userName ? 'user-cant-be-empty' : 'role-cant-be-empty'}`,
      details: `${!userName ? 'Username' : 'Role'} cannot be empty`,
    });
    return;
  }

  const roleIdFromDb = UserService.validateRole(role);
  if (!roleIdFromDb) {
    res.status(400).send({
      status: 'error',
      reason: 'role-does-not-exists',
      details: 'Selected role does not exist',
    });
    return;
  }

  const userIdInDb = UserService.getUserByUsername(userName);
  if (userIdInDb) {
    res.status(400).send({
      status: 'error',
      reason: 'user-already-exists',
      details: `User ${userName} already exists`,
    });
    return;
  }

  const userId = uuid.v4();
  UserService.insertUser(
    userId,
    userName,
    displayName || null,
    enabled ? 1 : 0,
  );

  res.status(200).send({ status: 'ok', data: { id: userId } });
});

app.patch('/users', validateSessionMiddleware, async (req, res) => {
  if (!isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const { id, userName, role, displayName, enabled } = req.body;

  if (!userName || !role) {
    res.status(400).send({
      status: 'error',
      reason: `${!userName ? 'user-cant-be-empty' : 'role-cant-be-empty'}`,
      details: `${!userName ? 'Username' : 'Role'} cannot be empty`,
    });
    return;
  }

  const roleIdFromDb = UserService.validateRole(role);
  if (!roleIdFromDb) {
    res.status(400).send({
      status: 'error',
      reason: 'role-does-not-exists',
      details: 'Selected role does not exist',
    });
    return;
  }

  const userIdInDb = UserService.getUserById(id);
  if (!userIdInDb) {
    res.status(400).send({
      status: 'error',
      reason: 'cannot-find-user-to-update',
      details: `Cannot find user ${userName} to update`,
    });
    return;
  }

  UserService.updateUserWithRole(
    userIdInDb,
    userName,
    displayName || null,
    enabled ? 1 : 0,
    role,
  );

  res.status(200).send({ status: 'ok', data: { id: userIdInDb } });
});

app.delete('/users', validateSessionMiddleware, async (req, res) => {
  if (!isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const ids = req.body.ids;
  let totalDeleted = 0;
  ids.forEach((item) => {
    const ownerId = UserService.getOwnerId();

    if (item === ownerId) return;

    UserService.deleteUserAccess(item);
    UserService.transferAllFilesFromUser(ownerId, item);
    const usersDeleted = UserService.deleteUser(item);
    totalDeleted += usersDeleted;
  });

  if (ids.length === totalDeleted) {
    res
      .status(200)
      .send({ status: 'ok', data: { someDeletionsFailed: false } });
  } else {
    res.status(400).send({
      status: 'error',
      reason: 'not-all-deleted',
      details: '',
    });
  }
});

app.get('/access', validateSessionMiddleware, (req, res) => {
  const fileId = req.query.fileId;

  const { granted } = UserService.checkFilePermission(
    fileId,
    res.locals.user_id,
  ) || {
    granted: 0,
  };

  if (granted === 0 && !isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return false;
  }

  const fileIdInDb = UserService.getFileById(fileId);
  if (!fileIdInDb) {
    res.status(404).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'File not found at server',
    });
    return false;
  }

  const accesses = UserService.getUserAccess(
    fileId,
    res.locals.user_id,
    isAdmin(res.locals.user_id),
  );

  res.json(accesses);
});

app.post('/access', (req, res) => {
  const userAccess = req.body || {};
  const session = validateSession(req, res);

  if (!session) return;

  const { granted } = UserService.checkFilePermission(
    userAccess.fileId,
    session.user_id,
  ) || {
    granted: 0,
  };

  if (granted === 0 && !isAdmin(session.user_id)) {
    res.status(400).send({
      status: 'error',
      reason: 'file-denied',
      details: "You don't have permissions over this file",
    });
    return;
  }

  const fileIdInDb = UserService.getFileById(userAccess.fileId);
  if (!fileIdInDb) {
    res.status(404).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'File not found at server',
    });
    return;
  }

  if (!userAccess.userId) {
    res.status(400).send({
      status: 'error',
      reason: 'user-cant-be-empty',
      details: 'User cannot be empty',
    });
    return;
  }

  if (UserService.countUserAccess(userAccess.fileId, userAccess.userId) > 0) {
    res.status(400).send({
      status: 'error',
      reason: 'user-already-have-access',
      details: 'User already have access',
    });
    return;
  }

  UserService.addUserAccess(userAccess.userId, userAccess.fileId);

  res.status(200).send({ status: 'ok', data: {} });
});

app.delete('/access', (req, res) => {
  const fileId = req.query.fileId;
  const session = validateSession(req, res);
  if (!session) return;

  const { granted } = UserService.checkFilePermission(
    fileId,
    session.user_id,
  ) || {
    granted: 0,
  };

  if (granted === 0 && !isAdmin(session.user_id)) {
    res.status(400).send({
      status: 'error',
      reason: 'file-denied',
      details: "You don't have permissions over this file",
    });
    return;
  }

  const fileIdInDb = UserService.getFileById(fileId);
  if (!fileIdInDb) {
    res.status(404).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'File not found at server',
    });
    return;
  }

  const ids = req.body.ids;
  let totalDeleted = UserService.deleteUserAccessByFileId(ids, fileId);

  if (ids.length === totalDeleted) {
    res
      .status(200)
      .send({ status: 'ok', data: { someDeletionsFailed: false } });
  } else {
    res.status(400).send({
      status: 'error',
      reason: 'not-all-deleted',
      details: '',
    });
  }
});

app.get('/access/users', validateSessionMiddleware, async (req, res) => {
  const fileId = req.query.fileId;

  const { granted } = UserService.checkFilePermission(
    fileId,
    res.locals.user_id,
  ) || {
    granted: 0,
  };

  if (granted === 0 && !isAdmin(res.locals.user_id)) {
    res.status(400).send({
      status: 'error',
      reason: 'file-denied',
      details: "You don't have permissions over this file",
    });
    return;
  }

  const fileIdInDb = UserService.getFileById(fileId);
  if (!fileIdInDb) {
    res.status(404).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'File not found at server',
    });
    return;
  }

  const users = UserService.getAllUserAccess(fileId);
  res.json(users);
});

app.post(
  '/access/transfer-ownership/',
  validateSessionMiddleware,
  (req, res) => {
    const newUserOwner = req.body || {};

    const { granted } = UserService.checkFilePermission(
      newUserOwner.fileId,
      res.locals.user_id,
    ) || {
      granted: 0,
    };

    if (granted === 0 && !isAdmin(res.locals.user_id)) {
      res.status(400).send({
        status: 'error',
        reason: 'file-denied',
        details: "You don't have permissions over this file",
      });
      return;
    }

    const fileIdInDb = UserService.getFileById(newUserOwner.fileId);
    if (!fileIdInDb) {
      res.status(404).send({
        status: 'error',
        reason: 'invalid-file-id',
        details: 'File not found at server',
      });
      return;
    }

    if (!newUserOwner.newUserId) {
      res.status(400).send({
        status: 'error',
        reason: 'user-cant-be-empty',
        details: 'Username cannot be empty',
      });
      return;
    }

    const newUserIdFromDb = UserService.getUserById(newUserOwner.newUserId);
    if (newUserIdFromDb === 0) {
      res.status(400).send({
        status: 'error',
        reason: 'new-user-not-found',
        details: 'New user not found',
      });
      return;
    }

    UserService.updateFileOwner(newUserOwner.newUserId, newUserOwner.fileId);

    res.status(200).send({ status: 'ok', data: {} });
  },
);

app.use(errorMiddleware);
