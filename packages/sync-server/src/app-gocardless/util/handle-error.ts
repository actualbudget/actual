import type { Request, Response } from 'express';

export function handleError(
  func: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response) => {
    func(req, res).catch(err => {
      const error = err as { message?: string };
      console.log('Error', req.originalUrl, error.message || String(err));
      res.send({
        status: 'ok',
        data: {
          error_code: 'INTERNAL_ERROR',
          error_type: error.message ? error.message : 'internal-error',
        },
      });
    });
  };
}
