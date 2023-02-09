/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export default async function middleware(err, req, res, _next) {
  console.log('ERROR', err);
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}
