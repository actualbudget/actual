import https from 'https';

import jwt from 'jws';

import { SecretName, secretsService } from '../services/secrets-service.js';

let pluggyApiKey = null;

export const pluggyaiService = {
  /**
   * Check if the PluggyAi service is configured to be used.
   * @returns {boolean}
   */
  isConfigured: () => {
    return !!(
      secretsService.get(SecretName.pluggyai_clientId) &&
      secretsService.get(SecretName.pluggyai_clientSecret) &&
      secretsService.get(SecretName.pluggyai_itemIds)
    );
  },

  /**
   *
   * @returns {Promise<void>}
   */
  setToken: async () => {
    const generateApiKey = async () => {
      const clientId = await secretsService.get(SecretName.pluggyai_clientId);
      const clientSecret = await secretsService.get(
        SecretName.pluggyai_clientSecret,
      );

      const body = JSON.stringify({ clientId, clientSecret });

      return new Promise((resolve, reject) => {
        const options = {
          method: 'POST',
          port: 443,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        };

        const req = https.request(
          new URL(`https://api.pluggy.ai/auth`),
          options,
          res => {
            let data = '';
            res.on('data', chunk => {
              data += chunk;
            });
            res.on('end', () => {
              if (res.statusCode === 403) {
                reject(new Error('Forbidden'));
              } else if (res.statusCode === 401) {
                reject(new Error('Unauthorized'));
              } else {
                try {
                  const results = JSON.parse(data);
                  results.sferrors = results.errors;
                  results.hasError = false;
                  results.errors = {};
                  resolve(results);
                } catch (e) {
                  console.log(`Error parsing JSON response: ${data}`);
                  reject(e);
                }
              }
            });
          },
        );

        req.on('error', e => {
          reject(e);
        });

        req.write(body);

        req.end();
      });
    };
    const isExpiredJwtToken = token => {
      if (!token) return true;

      const decodedToken = jwt.decode(token);
      if (!decodedToken) {
        return true;
      }
      const payload = decodedToken.payload;
      const clockTimestamp = Math.floor(Date.now() / 1000);
      return clockTimestamp >= payload.exp;
    };

    if (!pluggyApiKey) {
      pluggyApiKey = secretsService.get(SecretName.pluggyai_apiKey);
    }

    if (isExpiredJwtToken(pluggyApiKey)) {
      try {
        pluggyApiKey = (await generateApiKey())?.apiKey;
        secretsService.set(SecretName.pluggyai_apiKey, pluggyApiKey);
      } catch (error) {
        console.error(`Error getting apiKey for Pluggy.ai account: ${error}`);
        throw error;
      }
    }
  },
  getAccountsByItemId: itemId => {
    const options = {
      method: 'GET',
      port: 443,
      headers: { 'Content-Length': 0, 'X-API-KEY': pluggyApiKey },
    };
    return new Promise((resolve, reject) => {
      const req = https.request(
        new URL(`https://api.pluggy.ai/accounts?itemId=${itemId}`),
        options,
        res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 403) {
              reject(new Error('Forbidden'));
            } else {
              try {
                const results = JSON.parse(data);
                results.sferrors = results.errors;
                results.hasError = false;
                results.errors = {};
                resolve(results);
              } catch (e) {
                console.log(`Error parsing JSON response: ${data}`);
                reject(e);
              }
            }
          });
        },
      );
      req.on('error', e => {
        reject(e);
      });
      req.end();
    });
  },
  getAccountById: accountId => {
    const options = {
      method: 'GET',
      port: 443,
      headers: { 'Content-Length': 0, 'X-API-KEY': pluggyApiKey },
    };
    return new Promise((resolve, reject) => {
      const req = https.request(
        new URL(`https://api.pluggy.ai/accounts/${accountId}`),
        options,
        res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 403) {
              reject(new Error('Forbidden'));
            } else {
              try {
                const results = JSON.parse(data);
                results.sferrors = results.errors;
                results.hasError = false;
                results.errors = {};
                resolve(results);
              } catch (e) {
                console.log(`Error parsing JSON response: ${data}`);
                reject(e);
              }
            }
          });
        },
      );
      req.on('error', e => {
        reject(e);
      });
      req.end();
    });
  },
  getTransactionsByAccountId: (
    accountId,
    startDate,
    endDate,
    pageSize,
    page,
  ) => {
    const options = {
      method: 'GET',
      port: 443,
      headers: { 'Content-Length': 0, 'X-API-KEY': pluggyApiKey },
    };
    return new Promise((resolve, reject) => {
      const req = https.request(
        new URL(
          `https://api.pluggy.ai/transactions?accountId=${accountId}&from=${startDate}&to=${endDate}&pageSize=${pageSize}&page=${page}`,
        ),
        options,
        res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', async () => {
            if (res.statusCode === 403) {
              reject(new Error('Forbidden'));
            } else {
              try {
                const results = JSON.parse(data);
                resolve(results);
              } catch (e) {
                console.log(`Error parsing JSON response: ${data}`);
                reject(e);
              }
            }
          });
        },
      );
      req.on('error', e => {
        reject(e);
      });
      req.end();
    });
  },
};
