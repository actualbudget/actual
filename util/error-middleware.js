async function middleware(err, req, res, _next) {
  console.log('ERROR', err);
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

module.exports = middleware;
