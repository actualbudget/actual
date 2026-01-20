// Sophtron Service - API integration for Sophtron bank sync
//
// API Flow (v2 customer-based):
// 1. Get customers: GET v2/customers
// 2. Get members (connected institutions): GET v2/customers/{customerId}/members
// 3. Get accounts: GET v2/customers/{customerId}/accounts or GET v2/customers/{customerId}/members/{memberId}/accounts
// 4. Get transactions: GET v2/customers/{customerId}/accounts/{accountId}/transactions?startDate={date}&endDate={date}
//
// Note: Cannot get accounts directly - must get customers first, then get accounts for each customer.
// This service implements the customer-based flow for retrieving accounts and transactions.

import crypto from 'crypto';
//
// Authentication: Uses direct auth with HMAC-SHA256 signature (FIApiAUTH header)
// Based on: https://github.com/sophtron/Sophtron-Integration

import axios from 'axios';

import { SecretName, secretsService } from '../../services/secrets-service';

import { extractMerchantName, suggestCategory } from './merchant-extractor.js';

const SOPHTRON_API_BASE = 'https://api.sophtron.com/api/';

/**
 * Generate Sophtron authentication header
 * Based on: https://github.com/sophtron/Sophtron-Integration/blob/main/js/lib/directAuth.js
 */
function buildAuthCode(httpMethod, url, userId, accessKey) {
  const authPath = url.substring(url.lastIndexOf('/')).toLowerCase();
  const integrationKey = Buffer.from(accessKey, 'base64');
  const plainKey = httpMethod.toUpperCase() + '\n' + authPath;
  const b64Sig = crypto
    .createHmac('sha256', integrationKey)
    .update(plainKey)
    .digest('base64');
  const authString = 'FIApiAUTH:' + userId + ':' + b64Sig + ':' + authPath;
  return authString;
}

class SophtronService {
  constructor() {
    this.baseUrl = SOPHTRON_API_BASE;
    // Store for tracking linking sessions (requisitionId -> accountData)
    // In production, this should be persisted to database
    this.linkingSessions = new Map();
  }

  /**
   * Check if Sophtron credentials are configured
   */
  isConfigured() {
    const userId = secretsService.get(SecretName.sophtron_userId);
    const userKey = secretsService.get(SecretName.sophtron_userKey);
    return !!(userId && userKey);
  }

  /**
   * Get configured credentials
   */
  getCredentials() {
    const userId = secretsService.get(SecretName.sophtron_userId);
    const accessKey = secretsService.get(SecretName.sophtron_userKey);
    if (!userId || !accessKey) {
      throw new Error('Sophtron credentials not configured');
    }
    return { userId, accessKey };
  }

  /**
   * Make authenticated POST request to Sophtron API
   */
  async post(urlPath, data) {
    const { userId, accessKey } = this.getCredentials();
    const url = this.baseUrl + urlPath;
    const authHeader = buildAuthCode('POST', url, userId, accessKey);

    const response = await axios.post(url, data, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Make authenticated GET request to Sophtron API
   */
  async get(urlPath) {
    const { userId, accessKey } = this.getCredentials();
    const url = this.baseUrl + urlPath;
    const authHeader = buildAuthCode('GET', url, userId, accessKey);

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader,
        },
      });

      return response.data;
    } catch (error) {
      console.error('[Sophtron Service] GET request failed:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  }

  /**
   * Set token (placeholder for consistency with interface)
   */
  async setToken() {
    // Sophtron uses direct auth per-request, no token caching needed
  }

  /**
   * Get all customers for this user
   * Endpoint: v2/customers
   */
  async getCustomers() {
    return await this.get('v2/customers');
  }

  /**
   * Get members (connected institutions) for a customer
   * Endpoint: v2/customers/{customerId}/members
   */
  async getMembers(customerId) {
    return await this.get(`v2/customers/${customerId}/members`);
  }

  /**
   * Get all accounts for a customer (v2 API)
   * Endpoint: v2/customers/{customerId}/accounts
   */
  async getCustomerAccounts(customerId) {
    return await this.get(`v2/customers/${customerId}/accounts`);
  }

  /**
   * Get transactions for an account (v2 API)
   * Endpoint: v2/customers/{customerId}/accounts/{accountId}/transactions
   */
  async getTransactions(customerId, accountId, startDate, endDate) {
    // Sophtron API requires startDate and endDate - set defaults if not provided
    const now = new Date();
    const defaultEndDate = now.toISOString().substring(0, 10);
    const defaultStartDate = new Date(
      now.getFullYear(),
      now.getMonth() - 3,
      now.getDate(),
    )
      .toISOString()
      .substring(0, 10); // Default to 3 months ago

    const startDateStr =
      startDate instanceof Date
        ? startDate.toISOString().substring(0, 10)
        : startDate || defaultStartDate;
    const endDateStr =
      endDate instanceof Date
        ? endDate.toISOString().substring(0, 10)
        : endDate || defaultEndDate;

    const path = `v2/customers/${customerId}/accounts/${accountId}/transactions?startDate=${startDateStr}&endDate=${endDateStr}`;

    const result = await this.get(path);

    return result;
  }

  /**
   * Get list of all institutions for a country
   * Note: Sophtron API uses institution name search, not country filtering
   */
  /**
   * Get list of all institutions for a country
   * Endpoint: institution/GetInstitutionsByUser (v1 API)
   */
  async getInstitutions(_country = 'US') {
    try {
      // Use configured userId if not provided
      const { userId: configuredUserId } = this.getCredentials();
      // POST request with userID in body
      const response = await this.post('institution/GetInstitutionsByUser', {
        userID: configuredUserId,
      });

      // Response is array of institutions with InstitutionID and InstitutionName
      if (!response || !Array.isArray(response)) {
        return [];
      }

      // Map to expected format: { id, name }
      const mapped = response.map(inst => ({
        id: inst.InstitutionID,
        name: inst.InstitutionName,
        institutionId: inst.InstitutionID,
      }));

      return mapped;
    } catch (error) {
      console.error(
        '[Sophtron Service] Error fetching institutions:',
        error.message,
      );
      console.error(
        '[Sophtron Service] Error details:',
        error.response?.data || error,
      );
      throw error;
    }
  }

  /**
   * Create requisition (web token for OAuth-style flow)
   * In Sophtron, this would typically use their Universal Widget
   * For now, we'll return existing accounts immediately for testing
   */
  async createRequisition({ institutionId, host }) {
    const requisitionId = `soph_${Date.now()}_${institutionId}`;

    // Initialize linking session
    this.linkingSessions.set(requisitionId, {
      status: 'pending',
      institutionId,
      createdAt: Date.now(),
    });

    // For Sophtron Universal Widget, the link would be:
    // https://sophtron.com/universal-widget?institutionId={institutionId}&...
    // For testing, we'll immediately fetch existing accounts
    setTimeout(() => {
      (async () => {
        try {
          // Get existing accounts for this user
          const customers = await this.getCustomers();
          const allAccounts = [];

          for (const customer of customers) {
            try {
              const accounts = await this.getCustomerAccounts(
                customer.CustomerID,
              );
              if (accounts && accounts.length > 0) {
                accounts.forEach(account => {
                  allAccounts.push({
                    ...account,
                    customerId: customer.CustomerID,
                  });
                });
              }
            } catch (error) {
              console.error(
                `Error fetching accounts for customer ${customer.CustomerID}:`,
                error,
              );
            }
          }

          // Update linking session with accounts
          this.linkingSessions.set(requisitionId, {
            status: 'complete',
            institutionId,
            accounts: allAccounts,
            completedAt: Date.now(),
          });
        } catch (error) {
          console.error('Error fetching accounts:', error);
          this.linkingSessions.set(requisitionId, {
            status: 'error',
            institutionId,
            error: error.message,
          });
        }
      })().catch(error => {
        console.error('Unhandled error in setTimeout callback:', error);
        this.linkingSessions.set(requisitionId, {
          status: 'error',
          institutionId,
          error: error.message,
        });
      });
    }, 2000); // Simulate delay

    return {
      requisitionId,
      link: `${host}/sophtron-link?requisitionId=${requisitionId}`,
    };
  }

  /**
   * Get requisition with accounts
   * Checks linking session first, then falls back to fetching all accounts
   */
  async getRequisitionWithAccounts(requisitionId) {
    // Check if we have a linking session for this requisition
    const session = this.linkingSessions.get(requisitionId);

    if (session) {
      if (session.status === 'complete' && session.accounts) {
        return {
          requisition: {
            id: requisitionId,
            status: 'ACTIVE',
          },
          accounts: session.accounts,
        };
      }

      if (session.status === 'pending') {
        // Still waiting for user to complete linking
        return {
          requisition: {
            id: requisitionId,
            status: 'PENDING',
          },
          accounts: [],
        };
      }

      if (session.status === 'error') {
        throw new Error(session.error || 'Unknown error during linking');
      }
    }

    // No session found - fall back to getting all customer accounts
    const customers = await this.getCustomers();
    if (!customers || customers.length === 0) {
      return {
        requisition: {
          id: requisitionId,
          status: 'ACTIVE',
        },
        accounts: [],
      };
    }

    // Get accounts for all customers
    const allAccounts = [];
    for (const customer of customers) {
      try {
        const customerAccounts = await this.getCustomerAccounts(
          customer.CustomerID,
        );
        if (customerAccounts && customerAccounts.length > 0) {
          // Add customer context to each account
          customerAccounts.forEach(account => {
            allAccounts.push({
              ...account,
              customerId: customer.CustomerID,
            });
          });
        }
      } catch (error) {
        console.error(
          `Error fetching accounts for customer ${customer.CustomerID}:`,
          error,
        );
      }
    }

    return {
      requisition: {
        id: requisitionId,
        status: 'ACTIVE',
      },
      accounts: allAccounts,
    };
  }

  /**
   * Get accounts for a requisition
   * Uses customer-based API flow: get all customers, then get all accounts with institution names
   */
  async getAccounts(requisitionId) {
    // Get all institutions to map InstitutionID to InstitutionName
    const institutions = await this.getInstitutions();

    const institutionMap = new Map();
    if (institutions && institutions.length > 0) {
      institutions.forEach(inst => {
        institutionMap.set(inst.id, inst.name);
      });
    }

    // Get all customers
    const customers = await this.getCustomers();
    if (!customers || customers.length === 0) {
      return [];
    }

    // Get accounts for all customers
    const allAccounts = [];
    for (const customer of customers) {
      try {
        // Get members to map MemberID -> InstitutionID
        const members = await this.getMembers(customer.CustomerID);

        // Create a map of MemberID -> InstitutionID
        const memberToInstitutionMap = new Map();
        if (members && Array.isArray(members)) {
          members.forEach(member => {
            if (member.InstitutionID) {
              memberToInstitutionMap.set(member.MemberID, member.InstitutionID);
            }
          });
        }

        const customerAccounts = await this.getCustomerAccounts(
          customer.CustomerID,
        );

        if (customerAccounts && customerAccounts.length > 0) {
          // Add customer context and institution name to each account
          customerAccounts.forEach(account => {
            // Get InstitutionID from MemberID first, or use account's InstitutionID if available
            const institutionId =
              account.InstitutionID ||
              memberToInstitutionMap.get(account.MemberID);
            // Get institution name from InstitutionID
            const institutionName = institutionId
              ? institutionMap.get(institutionId)
              : null;
            const finalInstitutionName = institutionName || 'Unknown Bank';

            allAccounts.push({
              ...account,
              customerId: customer.CustomerID,
              requisitionId,
              institution: finalInstitutionName, // Add institution name for UI
              // Convert balance from dollars to cents (multiply by 100)
              // Actual Budget stores amounts as integers in cents
              balance:
                account.Balance != null
                  ? Math.round(account.Balance * 100)
                  : null,
            });
          });
        }
      } catch (error) {
        console.error(
          `Error fetching accounts for customer ${customer.CustomerID}:`,
          error,
        );
      }
    }

    return allAccounts;
  }

  /**
   * Get transactions with balance information
   * Uses v2 customer-based API - requires customerId which we extract from account
   */
  async getTransactionsWithBalance(
    requisitionId,
    accountId,
    startDate,
    endDate,
  ) {
    // For Sophtron, requisitionId IS the customerId (stored as bank.bank_id)
    const customerId = requisitionId;

    const transactions = await this.getTransactions(
      customerId,
      accountId,
      startDate,
      endDate,
    );

    // Helper function to convert date to YYYY-MM-DD format
    const formatDate = dateStr => {
      if (!dateStr) return null;
      return dateStr.substring(0, 10); // Extract YYYY-MM-DD from ISO string
    };

    // Helper function to format amount as string (required by Actual)
    const formatAmount = amount => {
      if (amount == null) return '0.00';
      return amount.toFixed(2);
    };

    // Sophtron v2 transactions need to be normalized to bank sync format
    const normalizedTransactions = (transactions || []).map(t => {
      const payeeName = t.merchant || extractMerchantName(t.Description);
      const suggestedCategory = suggestCategory(t.Description, payeeName);

      return {
        transactionId: t.TransactionID,
        date: formatDate(t.TransactionDate),
        payeeName,
        notes: t.Description, // Keep full description in notes
        transactionAmount: {
          amount: formatAmount(t.Amount),
          currency: t.Currency || 'USD',
        },
        booked: true, // Sophtron transactions are always booked
        // Add category hint that Actual's rules engine can use
        suggestedCategory,
      };
    });

    // Sophtron v2 may include balance information per transaction
    const balances = (transactions || []).map(t => ({
      date: formatDate(t.TransactionDate),
      amount: t.Balance || 0,
    }));

    const startingBalance =
      balances.length > 0 ? balances[0].amount : undefined;

    return {
      transactions: {
        booked: normalizedTransactions,
        pending: [],
        all: normalizedTransactions,
      },
      balances,
      startingBalance,
      institutionId: requisitionId,
    };
  }

  /**
   * Get normalized transactions without balance
   * Uses v2 customer-based API
   */
  async getNormalizedTransactions(
    requisitionId,
    accountId,
    startDate,
    endDate,
  ) {
    // For Sophtron, requisitionId IS the customerId (stored as bank.bank_id)
    const customerId = requisitionId;

    const transactions = await this.getTransactions(
      customerId,
      accountId,
      startDate,
      endDate,
    );

    // Helper function to convert date to YYYY-MM-DD format
    const formatDate = dateStr => {
      if (!dateStr) return null;
      return dateStr.substring(0, 10); // Extract YYYY-MM-DD from ISO string
    };

    // Helper function to format amount as string (required by Actual)
    const formatAmount = amount => {
      if (amount == null) return '0.00';
      return amount.toFixed(2);
    };

    // Normalize to bank sync format
    const normalizedTransactions = (transactions || []).map(t => {
      const payeeName = t.merchant || extractMerchantName(t.Description);
      const suggestedCategory = suggestCategory(t.Description, payeeName);

      return {
        transactionId: t.TransactionID,
        date: formatDate(t.TransactionDate),
        payeeName,
        notes: t.Description, // Keep full description in notes
        transactionAmount: {
          amount: formatAmount(t.Amount),
          currency: t.Currency || 'USD',
        },
        booked: true, // Sophtron transactions are always booked
        // Add category hint that Actual's rules engine can use
        suggestedCategory,
      };
    });

    return {
      transactions: {
        booked: normalizedTransactions,
        pending: [],
        all: normalizedTransactions,
      },
      institutionId: requisitionId,
    };
  }

  /**
   * Delete requisition (disconnect bank connection)
   * Maps to deleting user institution in Sophtron
   */
  async deleteRequisition(_requisitionId) {
    // Sophtron doesn't have a simple delete endpoint
    // Would need to implement UserInstitution/DeleteUserInstitution
    // For now, return success
    return { status: 'ok' };
  }
}

export const sophtronService = new SophtronService();
