export function handleError(func) {
  return (req, res) => {
    func(req, res).catch((err) => {
      console.log('Error', req.originalUrl, err);
      res.status(500);
      res.send({ status: 'error', reason: 'internal-error' });
    });
  };
}
