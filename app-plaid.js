// This app is unused right now. Maybe you could use it as a starting
// point for Plaid integration!

const express = require('express');
const uuid = require('uuid');
const fetch = require('node-fetch');
const plaid = require('plaid');
const { middleware: connectDb } = require('./db');
const { handleError } = require('./util/handle-error');
const { validateSubscribedUser } = require('./util/validate-user');
const config = require('./load-config');

const app = express();

let plaidClient;
function init() {
  plaidClient = new plaid.Client({
    clientID: config.plaid.client_id,
    secret: config.plaid.secret,
    env: config.plaid.env,
    options: { version: '2019-05-29' }
  });
}

async function validateToken(req, res) {
  let { token } = req.body;
  let rows = await req.runQuery(
    'SELECT * FROM webTokens WHERE token_id = $1',
    [token],
    true
  );
  if (rows.length === 0) {
    res.send(JSON.stringify({ status: 'error', reason: 'not-found' }));
    return null;
  }

  // Tokens are only valid for 10 minutes
  let validTime = 1000 * 60 * 10;
  let row = rows[0];
  let timeCreated = JSON.parse(row.time_created);

  if (Date.now() - timeCreated >= validTime) {
    res.send(JSON.stringify({ status: 'error', reason: 'expired' }));
    return null;
  }

  return row;
}

app.post(
  '/create-web-token',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }

    let token = uuid.v4();
    await req.runQuery('DELETE FROM webTokens WHERE user_id = $1', [user.id]);
    await req.runQuery(
      'INSERT INTO webTokens (user_id, token_id, time_created) VALUES ($1, $2, $3)',
      [user.id, token, Date.now()]
    );
    res.send(
      JSON.stringify({
        status: 'ok',
        data: token
      })
    );
  })
);

app.post(
  '/validate-web-token',
  connectDb,
  handleError(async (req, res) => {
    let token = await validateToken(req, res);
    if (!token) {
      return;
    }

    res.send(JSON.stringify({ status: 'ok' }));
  })
);

app.post(
  '/put-web-token-contents',
  connectDb,
  handleError(async (req, res) => {
    let token = await validateToken(req, res);
    if (!token) {
      return;
    }

    let { data } = req.body;

    await req.runQuery(
      'UPDATE webTokens SET contents = $1 WHERE token_id = $2',
      [JSON.stringify(data), token.token_id]
    );
    res.send(
      JSON.stringify({
        status: 'ok',
        data: null
      })
    );
  })
);

app.post(
  '/get-web-token-contents',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }

    let token = await validateToken(req, res);
    if (!token) {
      return;
    }

    let rows = await req.runQuery(
      'SELECT * FROM webTokens WHERE user_id = $1 AND token_id = $2',
      [user.id, token.token_id],
      true
    );

    if (rows.length === 0) {
      res.send(
        JSON.stringify({
          status: 'error',
          reason: 'not-found'
        })
      );
    }

    res.send(
      JSON.stringify({
        status: 'ok',
        data: JSON.parse(rows[0].contents)
      })
    );
  })
);

app.post(
  '/make_link_token',
  connectDb,
  handleError(async (req, res) => {
    let token = await validateToken(req, res);
    if (!token) {
      return;
    }

    let result = await plaidClient.createLinkToken({
      user: {
        client_user_id: token.user_id
      },
      client_name: 'Actual',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    });
    res.send(JSON.stringify({ status: 'ok', data: result.link_token }));
  })
);

app.post(
  '/handoff_public_token',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }
    let { item_id, public_token } = req.body;

    let url = config.plaid.env + '/item/public_token/exchange';
    let resData = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: config.plaid.client_id,
        secret: config.plaid.secret,
        public_token: public_token
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Actual Budget'
      }
    }).then((res) => res.json());

    await req.runQuery(
      'INSERT INTO access_tokens (item_id, user_id, access_token) VALUES ($1, $2, $3)',
      [item_id, user.id, resData.access_token]
    );

    res.send(JSON.stringify({ status: 'ok' }));
  })
);

app.post(
  '/remove-access-token',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }
    let { item_id } = req.body;

    const rows = await req.runQuery(
      'SELECT * FROM access_tokens WHERE user_id = $1 AND item_id = $2',
      [user.id, item_id],
      true
    );
    if (rows.length === 0) {
      throw new Error('access token not found');
    }
    const { access_token } = rows[0];

    const url = config.plaid.env + '/item/remove';
    const resData = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: config.plaid.client_id,
        secret: config.plaid.secret,
        access_token: access_token
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Actual Budget'
      }
    }).then((res) => res.json());

    if (resData.removed !== true) {
      console.log('[Error] Item not removed: ' + access_token.slice(0, 3));
    }

    await req.runQuery(
      'UPDATE access_tokens SET deleted = TRUE WHERE access_token = $1',
      [access_token]
    );

    res.send(
      JSON.stringify({
        status: 'ok',
        data: resData
      })
    );
  })
);

app.post(
  '/accounts',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }
    const { item_id } = req.body;

    const rows = await req.runQuery(
      'SELECT * FROM access_tokens WHERE user_id = $1 AND item_id = $2',
      [user.id, item_id],
      true
    );

    if (rows.length === 0) {
      throw new Error('access token not found');
    }
    const { access_token } = rows[0];

    const url = config.plaid.env + '/accounts/get';
    const resData = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: config.plaid.client_id,
        secret: config.plaid.secret,
        access_token: access_token
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Actual Budget'
      }
    }).then((res) => res.json());

    res.send(
      JSON.stringify({
        status: 'ok',
        data: resData
      })
    );
  })
);

app.post(
  '/transactions',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }
    let { item_id, start_date, end_date, account_id, count, offset } = req.body;

    let resData;

    const rows = await req.runQuery(
      'SELECT * FROM access_tokens WHERE user_id = $1 AND item_id = $2 AND deleted = FALSE',
      [user.id, item_id],
      true
    );

    if (rows.length === 0) {
      res.status(400);
      res.send('access-token-not-found');
      return;
    }

    const { access_token } = rows[0];

    const url = config.plaid.env + '/transactions/get';
    resData = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: config.plaid.client_id,
        secret: config.plaid.secret,
        access_token: access_token,
        start_date: start_date,
        end_date: end_date,
        options: {
          account_ids: [account_id],
          count: count,
          offset: offset
        }
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Actual Budget'
      }
    }).then((res) => res.json());

    res.send(
      JSON.stringify({
        status: 'ok',
        data: resData
      })
    );
  })
);

app.post(
  '/make-public-token',
  connectDb,
  handleError(async (req, res) => {
    let user = await validateSubscribedUser(req, res);
    if (!user) {
      return;
    }
    let { item_id } = req.body;

    const rows = await req.runQuery(
      'SELECT * FROM access_tokens WHERE user_id = $1 AND item_id = $2',
      [user.id, item_id],
      true
    );

    if (rows.length === 0) {
      throw new Error('access token not found');
    }
    const { access_token } = rows[0];

    let result = await plaidClient.createLinkToken({
      user: {
        client_user_id: user.id
      },
      client_name: 'Actual',
      country_codes: ['US'],
      language: 'en',
      access_token: access_token
    });

    res.send(
      JSON.stringify({
        status: 'ok',
        data: result
      })
    );
  })
);

module.exports.handlers = app;
module.exports.init = init;
