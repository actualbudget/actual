import express from 'express';
import errorMiddleware from './util/error-middleware.js';
import validateUser, { validateAuthHeader } from './util/validate-user.js';
import {
  bootstrap,
  login,
  changePassword,
  needsBootstrap,
  getLoginMethod,
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
    data: { bootstrapped: !needsBootstrap(), loginMethod: getLoginMethod() },
  });
});

app.post('/bootstrap', (req, res) => {
  let { error, token } = bootstrap(req.body.password);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: { token } });
});

app.post('/login', (req, res) => {
  let loginMethod = getLoginMethod(req);
  console.log('Logging in via ' + loginMethod);
  let tokenRes = null;
  switch (loginMethod) {
    case 'header': {
      let headerVal = req.get('x-actual-password') || '';
      console.debug('HEADER VALUE: ' + headerVal);
      if (headerVal == '') {
        res.send({ status: 'error', reason: 'invalid-header' });
        return;
      } else {
        if (validateAuthHeader(req)) {
          tokenRes = login(headerVal);
        } else {
          res.send({ status: 'error', reason: 'proxy-not-trusted' });
          return;
        }
      }
      break;
    }
    case 'password':
    default:
      tokenRes = login(req.body.password);
      break;
  }
  let { error, token } = tokenRes;

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

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
