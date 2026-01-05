// Types for Wallos subscription export format
// Based on: https://github.com/ellite/Wallos/blob/main/endpoints/subscriptions/export.php

export type WallosExportResponse = {
  success: boolean;
  subscriptions: WallosSubscription[];
};

export type WallosSubscription = {
  Name: string;
  'Payment Cycle': string; // e.g., "Monthly", "Every 2 Weeks", "Yearly"
  'Next Payment': string; // YYYY-MM-DD
  Renewal: 'Automatic' | 'Manual' | string;
  Category: string;
  'Payment Method': string;
  'Paid By': string;
  Price: string; // e.g., "$9.99" or "€9.99" - includes currency symbol
  Notes: string;
  URL: string;
  State: 'Enabled' | 'Disabled' | string;
  Notifications: 'Enabled' | 'Disabled' | string;
  'Cancellation Date': string | null;
  Active: 'Yes' | 'No' | string;
};

export type ParsedWallosSubscription = {
  id: string; // Generated UUID for tracking in import UI
  name: string;
  amount: number; // Amount in cents (integer), negative for expenses
  nextPaymentDate: string; // YYYY-MM-DD
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., 2 for "Every 2 Weeks"
  category: string; // Original category name from Wallos
  paymentMethod: string;
  notes: string;
  url: string;
  isActive: boolean;
  originalPrice: string; // Original price string for display
};
