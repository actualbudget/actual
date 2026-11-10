import createDebug from 'debug';
import type { Request, Response } from 'express';

import { getGoCardlessErrorDetails } from './gocardless-error-details';

const debugSensitive = createDebug('actual-sensitive:bank-sync');

export function handleError(
  func: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response) => {
    func(req, res).catch(err => {
      console.log('Error', req.method, req.baseUrl + req.path);
      debugSensitive(
        'Error on %s %s: %O',
        req.method,
        req.baseUrl + req.path,
        err,
      );
      const errorDetails = getGoCardlessErrorDetails(err);
      res.send({
        status: 'ok',
        data: {
          error_code: 'INTERNAL_ERROR',
          error_type: err.message ? err.message : 'internal-error',
          ...(errorDetails ? { error_details: errorDetails } : {}),
        },
      });
    });
  };
}
