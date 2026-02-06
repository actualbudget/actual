export function handleError(func) {
  return (req, res) => {
    func(req, res).catch(err => {
      console.log('Error', req.originalUrl, err.message || String(err));
      const reason = err.reason ?? err.message ?? 'internal-error';
      if (
        reason === 'decrypt-failure' ||
        reason === 'encrypted-secret-requires-password'
      ) {
        res.status(400).send({ status: 'error', reason });
        return;
      }
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
