import validateUser from './validate-user.js';

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
async function errorMiddleware(err, req, res, _next) {
  console.log('ERROR', err);
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateUserMiddleware = async (req, res, next) => {
  let user = await validateUser(req, res);
  if (!user) {
    return;
  }
  next();
};

export { validateUserMiddleware, errorMiddleware };
