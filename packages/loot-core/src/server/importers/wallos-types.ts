/**
 * Type definitions for Wallos subscription export format.
 * These types represent the structure of data exported from Wallos
 * (https://github.com/ellite/Wallos) and our internal parsed representation.
 *
 * @module wallos-types
 */

/**
 * Response wrapper for Wallos subscription exports.
 *
 * Wallos can export subscriptions in two formats:
 * 1. Direct array of subscriptions
 * 2. Wrapped object with success flag and subscriptions array
 *
 * @see https://github.com/ellite/Wallos/blob/main/endpoints/subscriptions/export.php
 */
export type WallosExportResponse = {
  /** Whether the export was successful */
  success: boolean;
  /** Array of subscription data */
  subscriptions: WallosSubscription[];
};

/**
 * Raw Wallos subscription data structure from export.
 *
 * Represents the exact format exported from Wallos,
 * before parsing and normalization.
 */
export type WallosSubscription = {
  /** Subscription name */
  Name: string;
  /** Payment frequency (e.g., "Monthly", "Every 2 Weeks", "Yearly") */
  'Payment Cycle': string;
  /** Next payment date in YYYY-MM-DD format */
  'Next Payment': string;
  /** Whether renewal is automatic or manual */
  Renewal: 'Automatic' | 'Manual' | string;
  /** Subscription category */
  Category: string;
  /** Payment method used */
  'Payment Method': string;
  /** Who pays for the subscription */
  'Paid By': string;
  /** Price with currency symbol (e.g., "$9.99", "€9.99") */
  Price: string;
  /** Additional notes */
  Notes: string;
  /** Subscription service URL */
  URL: string;
  /** Whether subscription is enabled */
  State: 'Enabled' | 'Disabled' | string;
  /** Whether notifications are enabled */
  Notifications: 'Enabled' | 'Disabled' | string;
  /** Date subscription was/will be cancelled (if applicable) */
  'Cancellation Date': string | null;
  /** Whether subscription is currently active */
  Active: 'Yes' | 'No' | string;
};

/**
 * Parsed and normalized Wallos subscription data.
 *
 * Internal representation after parsing raw Wallos data.
 * Used throughout the import process in the UI and backend.
 */
export type ParsedWallosSubscription = {
  /** Generated UUID for tracking during import */
  id: string;
  /** Subscription name */
  name: string;
  /** Amount in cents (integer), negative for expenses */
  amount: number;
  /** Next payment date in YYYY-MM-DD format */
  nextPaymentDate: string;
  /** Recurrence frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Recurrence interval (e.g., 2 for "Every 2 Weeks") */
  interval: number;
  /** Category name from Wallos */
  category: string;
  /** Payment method (used for auto-matching accounts) */
  paymentMethod: string;
  /** Additional notes (used for auto-matching accounts) */
  notes: string;
  /** Subscription service URL */
  url: string;
  /** Whether subscription is currently active */
  isActive: boolean;
  /** Original price string for display purposes */
  originalPrice: string;
};
