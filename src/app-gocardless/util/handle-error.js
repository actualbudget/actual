import { inspect } from 'util';

export function handleError(func) {
  return (req, res) => {
    func(req, res).catch((err) => {
      console.log('Error', req.originalUrl, inspect(err, { depth: null }));
      res.send({
        status: 'ok',
        data: {
          error_code: 'INTERNAL_ERROR',
          error_type: err.message ? err.message : 'internal-error',
        },
      });
    });
  };
}
