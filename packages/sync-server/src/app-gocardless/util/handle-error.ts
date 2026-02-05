import type { Request, Response } from 'express';

export function handleError(
  func: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response) => {
    func(req, res).catch(err => {
      console.log('Error', req.originalUrl, err.message || String(err));
      if (err.message === 'missing-file-id') {
        res.status(400).send({
          status: 'error',
          reason: 'missing-file-id',
        });
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
