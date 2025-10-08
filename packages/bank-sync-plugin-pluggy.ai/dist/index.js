import { attachPluginMiddleware, saveSecret, getSecret, BankSyncErrorCode, } from '@actual-app/plugins-core-sync-server';
import express from 'express';
import { PluggyClient } from 'pluggy-sdk';
// Import manifest (used during build)
import './manifest';
// Create Express app
const app = express();
// Use JSON middleware for parsing request bodies
app.use(express.json());
// Attach the plugin middleware to enable IPC communication with sync-server
attachPluginMiddleware(app);
// Pluggy client singleton
let pluggyClient = null;
async function getPluggyClient(req) {
    // Try to get credentials from secrets first
    const clientIdResult = await getSecret(req, 'clientId');
    const clientSecretResult = await getSecret(req, 'clientSecret');
    const clientId = clientIdResult.value || req.body.clientId;
    const clientSecret = clientSecretResult.value || req.body.clientSecret;
    if (!clientId || !clientSecret) {
        throw new Error('Pluggy.ai credentials not configured');
    }
    if (!pluggyClient) {
        pluggyClient = new PluggyClient({
            clientId,
            clientSecret,
        });
    }
    return pluggyClient;
}
/**
 * GET /status
 * Check if Pluggy.ai is configured
 */
app.get('/status', async (req, res) => {
    try {
        const clientIdResult = await getSecret(req, 'clientId');
        const configured = clientIdResult.value != null;
        res.json({
            status: 'ok',
            data: {
                configured,
            },
        });
    }
    catch (error) {
        res.json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /accounts
 * Fetch accounts from Pluggy.ai
 * Body: { itemIds: string, clientId?: string, clientSecret?: string }
 *
 * If clientId and clientSecret are provided, they will be saved as secrets
 */
app.post('/accounts', async (req, res) => {
    try {
        const { itemIds, clientId, clientSecret } = req.body;
        // If credentials are provided in request, save them
        if (clientId && clientSecret) {
            await saveSecret(req, 'clientId', clientId);
            await saveSecret(req, 'clientSecret', clientSecret);
        }
        // Get itemIds from request or from stored secrets
        let itemIdsArray;
        if (itemIds) {
            // Parse itemIds from request (can be comma-separated string or array)
            if (typeof itemIds === 'string') {
                itemIdsArray = itemIds.split(',').map((id) => id.trim());
            }
            else if (Array.isArray(itemIds)) {
                itemIdsArray = itemIds;
            }
            else {
                res.json({
                    status: 'error',
                    error: 'itemIds must be a string or array',
                });
                return;
            }
            // Save itemIds for future use
            await saveSecret(req, 'itemIds', itemIdsArray.join(','));
        }
        else {
            // Try to get itemIds from secrets
            const storedItemIds = await getSecret(req, 'itemIds');
            if (!storedItemIds.value) {
                res.json({
                    status: 'error',
                    error: 'itemIds is required (comma-separated string or array). Please provide itemIds in request or configure them first.',
                });
                return;
            }
            itemIdsArray = storedItemIds.value
                .split(',')
                .map((id) => id.trim());
        }
        if (!itemIdsArray.length) {
            res.json({
                status: 'error',
                error: 'At least one item ID is required',
            });
            return;
        }
        const client = await getPluggyClient(req);
        let accounts = [];
        // Fetch all accounts and their items with connector info
        for (const itemId of itemIdsArray) {
            const partial = await client.fetchAccounts(itemId);
            // For each account, also fetch the item to get connector details
            for (const account of partial.results) {
                try {
                    const item = await client.fetchItem(itemId);
                    // Attach item info to account for transformation
                    account.itemData = item;
                }
                catch (error) {
                    console.error(`[PLUGGY ACCOUNTS] Error fetching item ${itemId}:`, error);
                }
            }
            accounts = accounts.concat(partial.results);
        }
        // Transform Pluggy accounts to GenericBankSyncAccount format
        const transformedAccounts = accounts.map((account) => {
            const institution = account.itemData?.connector?.name ||
                account.item?.connector?.name ||
                'Unknown Institution';
            const connectorId = account.itemData?.connector?.id ||
                account.item?.connector?.id ||
                account.itemId;
            return {
                account_id: account.id,
                name: account.name,
                institution,
                balance: account.balance || 0,
                mask: account.number?.substring(account.number.length - 4),
                official_name: account.name,
                orgDomain: account.itemData?.connector?.institutionUrl ||
                    account.item?.connector?.institutionUrl ||
                    null,
                orgId: connectorId?.toString() || null,
            };
        });
        res.json({
            status: 'ok',
            data: {
                accounts: transformedAccounts,
            },
        });
    }
    catch (error) {
        console.error('[PLUGGY ACCOUNTS] Error:', error);
        // Extract Pluggy error message and code if available
        let pluggyMessage = 'Unknown error';
        let pluggyCode;
        if (error instanceof Error) {
            pluggyMessage = error.message;
            // Try to parse Pluggy SDK error format from error message
            // Pluggy errors often include the error details in the message
            try {
                // Check if error has a structured format
                const errorAny = error;
                if (errorAny.message && typeof errorAny.message === 'string') {
                    pluggyMessage = errorAny.message;
                }
                if (errorAny.code !== undefined) {
                    pluggyCode = errorAny.code;
                }
            }
            catch (e) {
                // Ignore parse errors
            }
        }
        const errorResponse = {
            error_type: BankSyncErrorCode.UNKNOWN_ERROR,
            error_code: BankSyncErrorCode.UNKNOWN_ERROR,
            status: 'error',
            reason: pluggyMessage, // Use the Pluggy error message directly
        };
        // Map HTTP status codes to error types
        const errorMessageLower = pluggyMessage.toLowerCase();
        if (pluggyCode === 401 || errorMessageLower.includes('401') || errorMessageLower.includes('unauthorized') || errorMessageLower.includes('invalid credentials')) {
            errorResponse.error_type = BankSyncErrorCode.INVALID_CREDENTIALS;
            errorResponse.error_code = BankSyncErrorCode.INVALID_CREDENTIALS;
        }
        else if (pluggyCode === 403 || errorMessageLower.includes('403') || errorMessageLower.includes('forbidden')) {
            errorResponse.error_type = BankSyncErrorCode.UNAUTHORIZED;
            errorResponse.error_code = BankSyncErrorCode.UNAUTHORIZED;
        }
        else if (pluggyCode === 429 || errorMessageLower.includes('429') || errorMessageLower.includes('rate limit')) {
            errorResponse.error_type = BankSyncErrorCode.RATE_LIMIT;
            errorResponse.error_code = BankSyncErrorCode.RATE_LIMIT;
        }
        else if (pluggyCode === 400 || errorMessageLower.includes('400') || errorMessageLower.includes('bad request')) {
            errorResponse.error_type = BankSyncErrorCode.INVALID_REQUEST;
            errorResponse.error_code = BankSyncErrorCode.INVALID_REQUEST;
        }
        else if (pluggyCode === 404 || errorMessageLower.includes('404') || errorMessageLower.includes('not found')) {
            errorResponse.error_type = BankSyncErrorCode.ACCOUNT_NOT_FOUND;
            errorResponse.error_code = BankSyncErrorCode.ACCOUNT_NOT_FOUND;
        }
        else if (errorMessageLower.includes('network') || errorMessageLower.includes('connect') || errorMessageLower.includes('econnrefused')) {
            errorResponse.error_type = BankSyncErrorCode.NETWORK_ERROR;
            errorResponse.error_code = BankSyncErrorCode.NETWORK_ERROR;
        }
        else if ((pluggyCode && typeof pluggyCode === 'number' && pluggyCode >= 500) || errorMessageLower.includes('500') || errorMessageLower.includes('502') || errorMessageLower.includes('503')) {
            errorResponse.error_type = BankSyncErrorCode.SERVER_ERROR;
            errorResponse.error_code = BankSyncErrorCode.SERVER_ERROR;
        }
        errorResponse.details = {
            originalError: pluggyMessage,
            pluggyCode: pluggyCode,
        };
        res.json({
            status: 'ok',
            data: errorResponse,
        });
    }
});
/**
 * POST /transactions
 * Fetch transactions from Pluggy.ai
 * Body: { accountId: string, startDate: string, clientId?: string, clientSecret?: string }
 */
app.post('/transactions', async (req, res) => {
    try {
        const { accountId, startDate } = req.body;
        if (!accountId) {
            res.json({
                status: 'error',
                error: 'accountId is required',
            });
            return;
        }
        const client = await getPluggyClient(req);
        const transactions = await getTransactions(client, accountId, startDate);
        const account = (await client.fetchAccount(accountId));
        let startingBalance = parseInt(Math.round(account.balance * 100).toString());
        if (account.type === 'CREDIT') {
            startingBalance = -startingBalance;
        }
        const date = getDate(new Date(account.updatedAt));
        const balances = [
            {
                balanceAmount: {
                    amount: startingBalance,
                    currency: account.currencyCode,
                },
                balanceType: 'expected',
                referenceDate: date,
            },
        ];
        const all = [];
        const booked = [];
        const pending = [];
        for (const trans of transactions) {
            const transRecord = trans;
            const newTrans = {};
            newTrans.booked = !(transRecord.status === 'PENDING');
            const transactionDate = new Date(transRecord.date);
            if (transactionDate < new Date(startDate) && !transRecord.sandbox) {
                continue;
            }
            newTrans.date = getDate(transactionDate);
            newTrans.payeeName = getPayeeName(transRecord);
            newTrans.notes = transRecord.descriptionRaw || transRecord.description;
            if (account.type === 'CREDIT') {
                if (transRecord.amountInAccountCurrency) {
                    transRecord.amountInAccountCurrency =
                        transRecord.amountInAccountCurrency * -1;
                }
                transRecord.amount = transRecord.amount * -1;
            }
            let amountInCurrency = transRecord.amountInAccountCurrency ??
                transRecord.amount;
            amountInCurrency = Math.round(amountInCurrency * 100) / 100;
            newTrans.transactionAmount = {
                amount: amountInCurrency,
                currency: transRecord.currencyCode,
            };
            newTrans.transactionId = transRecord.id;
            newTrans.sortOrder = transactionDate.getTime();
            delete transRecord.amount;
            const finalTrans = { ...flattenObject(transRecord), ...newTrans };
            if (newTrans.booked) {
                booked.push(finalTrans);
            }
            else {
                pending.push(finalTrans);
            }
            all.push(finalTrans);
        }
        const sortFunction = (a, b) => {
            const aRec = a;
            const bRec = b;
            return bRec.sortOrder - aRec.sortOrder;
        };
        const bookedSorted = booked.sort(sortFunction);
        const pendingSorted = pending.sort(sortFunction);
        const allSorted = all.sort(sortFunction);
        res.json({
            status: 'ok',
            data: {
                balances,
                startingBalance,
                transactions: {
                    all: allSorted,
                    booked: bookedSorted,
                    pending: pendingSorted,
                },
            },
        });
    }
    catch (error) {
        console.error('[PLUGGY TRANSACTIONS] Error:', error);
        // Extract Pluggy error message and code if available
        let pluggyMessage = 'Unknown error';
        let pluggyCode;
        if (error instanceof Error) {
            pluggyMessage = error.message;
            // Try to parse Pluggy SDK error format from error message
            try {
                const errorAny = error;
                if (errorAny.message && typeof errorAny.message === 'string') {
                    pluggyMessage = errorAny.message;
                }
                if (errorAny.code !== undefined) {
                    pluggyCode = errorAny.code;
                }
            }
            catch (e) {
                // Ignore parse errors
            }
        }
        const errorResponse = {
            error_type: BankSyncErrorCode.UNKNOWN_ERROR,
            error_code: BankSyncErrorCode.UNKNOWN_ERROR,
            status: 'error',
            reason: pluggyMessage, // Use the Pluggy error message directly
        };
        // Map HTTP status codes to error types
        const errorMessageLower = pluggyMessage.toLowerCase();
        if (pluggyCode === 401 || errorMessageLower.includes('401') || errorMessageLower.includes('unauthorized') || errorMessageLower.includes('invalid credentials')) {
            errorResponse.error_type = BankSyncErrorCode.INVALID_CREDENTIALS;
            errorResponse.error_code = BankSyncErrorCode.INVALID_CREDENTIALS;
        }
        else if (pluggyCode === 403 || errorMessageLower.includes('403') || errorMessageLower.includes('forbidden')) {
            errorResponse.error_type = BankSyncErrorCode.UNAUTHORIZED;
            errorResponse.error_code = BankSyncErrorCode.UNAUTHORIZED;
        }
        else if (pluggyCode === 404 || errorMessageLower.includes('404') || errorMessageLower.includes('not found')) {
            errorResponse.error_type = BankSyncErrorCode.ACCOUNT_NOT_FOUND;
            errorResponse.error_code = BankSyncErrorCode.ACCOUNT_NOT_FOUND;
        }
        else if (pluggyCode === 429 || errorMessageLower.includes('429') || errorMessageLower.includes('rate limit')) {
            errorResponse.error_type = BankSyncErrorCode.RATE_LIMIT;
            errorResponse.error_code = BankSyncErrorCode.RATE_LIMIT;
        }
        else if (pluggyCode === 400 || errorMessageLower.includes('400') || errorMessageLower.includes('bad request')) {
            errorResponse.error_type = BankSyncErrorCode.INVALID_REQUEST;
            errorResponse.error_code = BankSyncErrorCode.INVALID_REQUEST;
        }
        else if (errorMessageLower.includes('network') || errorMessageLower.includes('connect') || errorMessageLower.includes('econnrefused')) {
            errorResponse.error_type = BankSyncErrorCode.NETWORK_ERROR;
            errorResponse.error_code = BankSyncErrorCode.NETWORK_ERROR;
        }
        else if ((pluggyCode && typeof pluggyCode === 'number' && pluggyCode >= 500) || errorMessageLower.includes('500') || errorMessageLower.includes('502') || errorMessageLower.includes('503')) {
            errorResponse.error_type = BankSyncErrorCode.SERVER_ERROR;
            errorResponse.error_code = BankSyncErrorCode.SERVER_ERROR;
        }
        errorResponse.details = {
            originalError: pluggyMessage,
            pluggyCode: pluggyCode,
        };
        res.json({
            status: 'ok',
            data: errorResponse,
        });
    }
});
// Helper functions
async function getTransactions(client, accountId, startDate) {
    let transactions = [];
    let result = await getTransactionsByAccountId(client, accountId, startDate, 500, 1);
    transactions = transactions.concat(result.results);
    const totalPages = result.totalPages;
    let currentPage = result.page;
    while (currentPage !== totalPages) {
        result = await getTransactionsByAccountId(client, accountId, startDate, 500, currentPage + 1);
        transactions = transactions.concat(result.results);
        currentPage = result.page;
    }
    return transactions;
}
async function getTransactionsByAccountId(client, accountId, startDate, pageSize, page) {
    const account = (await client.fetchAccount(accountId));
    // Sandbox account handling
    const sandboxAccount = account.owner === 'John Doe';
    const fromDate = sandboxAccount ? '2000-01-01' : startDate;
    const transactions = await client.fetchTransactions(accountId, {
        from: fromDate,
        pageSize,
        page,
    });
    if (sandboxAccount) {
        const mappedResults = transactions.results.map((t) => ({
            ...t,
            sandbox: true,
        }));
        transactions.results =
            mappedResults;
    }
    return transactions;
}
function getDate(date) {
    return date.toISOString().split('T')[0];
}
function flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value === null) {
            continue;
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, newKey));
        }
        else {
            result[newKey] = value;
        }
    }
    return result;
}
function getPayeeName(trans) {
    const merchant = trans.merchant;
    if (merchant && (merchant.name || merchant.businessName)) {
        return merchant.name || merchant.businessName || '';
    }
    const paymentData = trans.paymentData;
    if (paymentData) {
        const { receiver, payer } = paymentData;
        if (trans.type === 'DEBIT' && receiver) {
            const receiverData = receiver;
            const docNum = receiverData.documentNumber;
            return receiverData.name || docNum?.value || '';
        }
        if (trans.type === 'CREDIT' && payer) {
            const payerData = payer;
            const docNum = payerData.documentNumber;
            return payerData.name || docNum?.value || '';
        }
    }
    return '';
}
console.log('Pluggy.ai Bank Sync Plugin loaded');
