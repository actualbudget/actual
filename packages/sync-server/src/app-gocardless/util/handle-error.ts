import type { Request, Response } from 'express';

export function handleError(
  func: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response) => {
    func(req, res).catch(err => {
      const message = err instanceof Error ? err.message : undefined;
      console.log('Error', req.originalUrl, message || String(err));
      res.send({
        status: 'ok',
        data: {
          error_code: 'INTERNAL_ERROR',
          error_type: message ? message : 'internal-error',
        },
      });
    });
  };
}
