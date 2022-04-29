let { getAccountDb } = require('../account-db');

function validateUser(req, res) {
  let { token } = req.body || {};

  if (!token) {
    token = req.headers['x-actual-token'];
  }

  let db = getAccountDb();
  let rows = db.all('SELECT * FROM sessions WHERE token = ?', [token]);

  if (rows.length === 0) {
    res.status(401);
    res.send({
      status: 'error',
      reason: 'unauthorized',
      details: 'token-not-found'
    });
    return null;
  }

  return rows[0];
}

module.exports = { validateUser };
