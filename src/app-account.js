import express from 'express';
import errorMiddleware from './util/error-middleware.js';
import validateUser from './util/validate-user.js';
import {
  bootstrap,
  login,
  changePassword,
  needsBootstrap,
} from './account-db.js';

let app = express();
app.use(errorMiddleware);

export { app as handlers };

// Non-authenticated endpoints:
//
// /needs-bootstrap
// /boostrap (special endpoint for setting up the instance, cant call again)
// /login

app.get('/needs-bootstrap', (req, res) => {
  res.send({
    status: 'ok',
    data: { bootstrapped: !needsBootstrap() },
  });
});

app.post('/bootstrap', (req, res) => {
  let { error, token } = bootstrap(req.body.password);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  } else {
    res.send({ status: 'ok', data: { token } });
  }
});

app.post('/login', (req, res) => {
  let token = login(req.body.password);
  res.send({ status: 'ok', data: { token } });
});

app.post('/change-password', (req, res) => {
  let user = validateUser(req, res);
  if (!user) return;

  let { error } = changePassword(req.body.password);

  if (error) {
    res.send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: {} });
});

app.get('/validate', (req, res) => {
  let user = validateUser(req, res);
  if (user) {
    res.send({ status: 'ok', data: { validated: true } });
  }
});

app.use(errorMiddleware);
