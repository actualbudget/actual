async function middleware(err, req, res) {
  console.log('ERROR', err);
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

module.exports = middleware;
