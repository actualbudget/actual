export function handleError(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Sophtron error:', error);
      res.status(500).send({
        status: 'error',
        data: {
          error_type: 'UNKNOWN',
          error_code: 'UNKNOWN',
          message: error.message || 'An unknown error occurred',
        },
      });
    }
  };
}
