import React, { useState, useMemo } from 'react';
import { q } from 'loot-core/shared/query';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useAccounts } from '@desktop-client/hooks/useAccounts'; 
import { useQuery } from '@desktop-client/hooks/useQuery';

type RecurringPaymentsCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: any;
  onMetaChange?: (newMeta: any) => void;
  onRemove?: () => void;
};

type RecurringPayment = {
  payee: string;
  account: string;
  averageAmount: number;
  frequency: string;
  confidenceScore: number;
  amountVariability: number;
  isExpense: boolean;
};

export function RecurringPaymentsCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
  onRemove,
}: RecurringPaymentsCardProps) {
  
  // Load saved settings from localStorage first, then fallback to meta or defaults
  const getSavedSettings = () => {
    try {
      const savedSettings = localStorage.getItem('recurringPaymentsSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return meta?.settings || {};
  };

  const savedSettings = getSavedSettings();
  const minOccurrences = savedSettings.minOccurrences || 3;
  const showExpenses = savedSettings.showExpenses !== undefined ? savedSettings.showExpenses : true;
  const showIncome = savedSettings.showIncome !== undefined ? savedSettings.showIncome : false;
  const minConfidence = savedSettings.minConfidence || 40;
  const maxVariation = savedSettings.maxVariation !== undefined ? savedSettings.maxVariation : 100;
  const selectedAccounts = savedSettings.selectedAccounts || [];
  const selectedFrequencies = savedSettings.selectedFrequencies || [];
  const displayCurrency = savedSettings.displayCurrency || 'EUR';

  const accounts = useAccounts();
  const { data: payees } = useQuery(() => q('payees').select(['id', 'name']), []);

  // Create transaction query with saved settings
  const transactionQuery = useMemo(() => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().split('T')[0];

    let query = q('transactions')
      .filter({ date: { $gte: startDate } })
      .filter({ payee: { $ne: null } })
      .select(['id', 'payee', 'account', 'amount', 'date', 'category'])
      .orderBy({ date: 'desc' });

    if (showExpenses && !showIncome) {
      query = query.filter({ amount: { $lt: 0 } });
    } else if (showIncome && !showExpenses) {
      query = query.filter({ amount: { $gt: 0 } });
    }

    return query;
  }, [showExpenses, showIncome]);

  const { transactions, isLoading } = useTransactions({
    query: transactionQuery,
    options: { pageCount: 1000 }
  });

  // Analyze transactions with saved settings
  const recurringPayments = useMemo(() => {
    if (!transactions || transactions.length === 0 || !payees) return [];

    try {
      const payeeMap = new Map(payees.map(p => [p.id, p.name]));
      const payeeGroups = new Map<string, any[]>();
      
      transactions.forEach(transaction => {
        if (!transaction.payee || !transaction.account) return;
        
        if (selectedAccounts.length > 0 && !selectedAccounts.includes(transaction.account)) {
          return;
        }

        const key = `${transaction.payee}-${transaction.account}`;
        if (!payeeGroups.has(key)) {
          payeeGroups.set(key, []);
        }
        payeeGroups.get(key)!.push(transaction);
      });

      const recurringList: RecurringPayment[] = [];

      payeeGroups.forEach((transactionList, key) => {
        if (transactionList.length < minOccurrences) return;

        transactionList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalDaysBetween = 0;
        let intervals = 0;
        
        for (let i = 1; i < transactionList.length; i++) {
          const prevDate = new Date(transactionList[i - 1].date);
          const currDate = new Date(transactionList[i].date);
          const daysBetween = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
          totalDaysBetween += daysBetween;
          intervals++;
        }

        const averageDaysBetween = intervals > 0 ? totalDaysBetween / intervals : 0;

        let confidenceScore = 0;
        if (intervals > 0) {
          const regularityScore = Math.max(0, 100 - (Math.abs(averageDaysBetween - 30) * 2));
          const countScore = Math.min(100, transactionList.length * 20);
          confidenceScore = Math.round((regularityScore + countScore) / 2);
        }

        let frequencyLabel = 'Irregular';
        if (averageDaysBetween >= 6 && averageDaysBetween <= 8) {
          frequencyLabel = 'Weekly';
        } else if (averageDaysBetween >= 13 && averageDaysBetween <= 16) {
          frequencyLabel = 'Bi-weekly';
        } else if (averageDaysBetween >= 25 && averageDaysBetween <= 35) {
          frequencyLabel = 'Monthly';
        } else if (averageDaysBetween >= 60 && averageDaysBetween <= 70) {
          frequencyLabel = 'Bi-monthly';
        } else if (averageDaysBetween >= 85 && averageDaysBetween <= 95) {
          frequencyLabel = 'Quarterly';
        } else if (averageDaysBetween >= 180 && averageDaysBetween <= 190) {
          frequencyLabel = 'Semi-annual';
        } else if (averageDaysBetween >= 360 && averageDaysBetween <= 370) {
          frequencyLabel = 'Annual';
        }

        if (confidenceScore >= minConfidence && averageDaysBetween <= 400) {
          if (selectedFrequencies.length > 0 && !selectedFrequencies.includes(frequencyLabel)) {
            return;
          }

          const amounts = transactionList.map(t => Math.abs(t.amount) / 100);
          const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
          
          const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - averageAmount, 2), 0) / amounts.length;
          const standardDeviation = Math.sqrt(variance);
          const variabilityPercent = averageAmount > 0 ? (standardDeviation / averageAmount) * 100 : 0;
          
          if (variabilityPercent > maxVariation) {
            return;
          }

          const lastTransaction = transactionList[transactionList.length - 1];
          const payeeName = payeeMap.get(lastTransaction.payee) || 'Unknown Payee';
          const isExpense = lastTransaction.amount < 0;

          recurringList.push({
            payee: payeeName,
            account: accounts.find(acc => acc.id === lastTransaction.account)?.name || 'Unknown Account',
            averageAmount: averageAmount,
            frequency: frequencyLabel,
            confidenceScore: confidenceScore,
            isExpense: isExpense,
            amountVariability: Math.round(variabilityPercent)
          });
        }
      });

      return recurringList
        .sort((a, b) => b.averageAmount - a.averageAmount)
        .slice(0, 10); // Top 10 for preview

    } catch (error) {
      console.error('Error analyzing transactions:', error);
      return [];
    }
  }, [transactions, accounts, selectedAccounts, minOccurrences, payees, minConfidence, selectedFrequencies, maxVariation]);

  const formatCurrency = (amount: number, isExpense: boolean) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency
    }).format(amount);
    
    return isExpense ? `-${formatted}` : `+${formatted}`;
  };

  // Calculate total for display
  const totalMonthly = useMemo(() => {
    return recurringPayments.reduce((sum, payment) => {
      const monthlyAmount = payment.frequency === 'Weekly' ? payment.averageAmount * 4.33 :
                           payment.frequency === 'Bi-weekly' ? payment.averageAmount * 2.17 :
                           payment.frequency === 'Monthly' ? payment.averageAmount :
                           payment.frequency === 'Bi-monthly' ? payment.averageAmount * 0.5 :
                           payment.frequency === 'Quarterly' ? payment.averageAmount / 3 :
                           payment.frequency === 'Semi-annual' ? payment.averageAmount / 6 :
                           payment.averageAmount / 30.44;
      return sum + monthlyAmount;
    }, 0);
  }, [recurringPayments]);

  const handleClick = () => {
    if (!isEditing) {
      window.location.href = `/reports/recurring-payments/${widgetId}`;
    }
  };

  const maxAmount = Math.max(...recurringPayments.map(p => p.averageAmount), 1);

  return (
    <div
      onClick={handleClick}
      style={{
        padding: 20,
        border: '1px solid #e0e0e0',
        // Removed borderRadius property for sharp corners
        backgroundColor: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: isEditing ? 'default' : 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isEditing) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isEditing) {
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: 2 }}>
            {meta?.name || 'Recurring Payments'}
          </h3>
          {/* Monthly total moved here - this is the intended location */}
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            fontWeight: 'bold'
          }}>
            Monthly: {formatCurrency(totalMonthly, true)}
          </div>
        </div>
        
        {/* Compact settings in top right */}
        <div style={{
          fontSize: '9px',
          color: '#999',
          textAlign: 'right',
          lineHeight: '1.1',
          marginTop: '2px'
        }}>
          <div>{minConfidence}%+ • ±{maxVariation}%</div>
          {selectedAccounts.length > 0 && (
            <div style={{ color: '#007bff' }}>
              {selectedAccounts.length === 1 ? 
                (accounts.find(acc => acc.id === selectedAccounts[0])?.name || 'Account').slice(0, 8) :
                `${selectedAccounts.length} accounts`
              }
            </div>
          )}
          {selectedFrequencies.length > 0 && (
            <div style={{ color: '#28a745' }}>
              {selectedFrequencies.length === 1 ? 
                selectedFrequencies[0].slice(0, 8) : 
                `${selectedFrequencies.length} freq`
              }
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Chart - Much smaller to fit */}
      <div
        style={{
          width: '100%',
          height: 140, // Drastically reduced from 180
          backgroundColor: '#f8f9fa',
          // Removed borderRadius property for sharp corners
          border: '1px solid #e0e0e0',
          marginBottom: 5,
          marginTop: 6,
          display: 'flex',
          flexDirection: 'column',
          padding: '6px', // Reduced padding
        }}
      >
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Loading...</div>
          </div>
        ) : recurringPayments.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              No patterns detected
            </div>
          </div>
        ) : (
          <>
            {/* Chart with proper layout */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}>
              {/* Chart header */}
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginBottom: '8px',
                textAlign: 'center',
                flexShrink: 0
              }}>
                Top {recurringPayments.length} Recurring Payments
              </div>
              
              {/* Chart area with Y-axis label */}
              <div style={{
                display: 'flex',
                flex: 1,
                minHeight: 0,
                alignItems: 'stretch'
              }}>
                {/* Y-axis label */}
                <div style={{
                  writing: 'vertical-rl',
                  textOrientation: 'mixed',
                  fontSize: '10px',
                  color: '#999',
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: '5px',
                  width: '12px',
                  flexShrink: 0
                }}>
                  €
                </div>
                
                {/* Chart container */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0
                }}>
                  {/* Max amount indicator */}
                  <div style={{
                    fontSize: '9px',
                    color: '#ccc',
                    textAlign: 'right',
                    marginBottom: '2px',
                    height: '10px',
                    flexShrink: 0
                  }}>
                    {Math.round(maxAmount)}
                  </div>
                  
                  {/* Bar chart */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end', /* Changed to flex-end to make bars start at the same level */
                    justifyContent: 'stretch',
                    gap: '2px',
                    height: '120px', // Reduced from 140px
                    paddingLeft: '5px',
                    paddingRight: '5px',
                    overflow: 'hidden',
                    width: '100%'
                  }}>
                    {recurringPayments.slice(0, 8).map((payment, i) => {
                      const barHeight = Math.max((payment.averageAmount / maxAmount) * 50, 8); // Reduced max height to 50px
                      const amount = Math.round(payment.averageAmount);
                      // Removed currency symbol from amountText for display above bars
                      const amountText = `${amount}`; 
                      
                      return (
                        <div
                          key={`${payment.payee}-${i}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: '1',
                            minWidth: 0,
                            height: '100%',
                            // Changed to space-between to push amount to top
                            justifyContent: 'space-between' 
                          }}
                        >
                          {/* Amount on top - always */}
                          <div style={{
                            height: '16px', // Increased height for better visibility
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <div style={{
                              fontSize: '10px', // Increased font size for better visibility
                              color: '#000',  // Changed to black for better contrast
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}>
                              {amountText}
                            </div>
                          </div>
                          
                          {/* Flexible spacer to push bar to bottom */}
                          <div style={{ flex: 1 }}></div>

                          {/* Bar area - fixed height for all bars */}
                          <div style={{
                            height: '50px', // Reduced from 60px
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            flexShrink: 0
                          }}>
                            <div
                              style={{
                                width: '100%',
                                height: `${barHeight}px`,
                                backgroundColor: payment.isExpense ? '#87dee8' : '#28a745',
                                borderRadius: '2px 2px 0 0'
                              }}
                              title={`${payment.payee}: ${formatCurrency(payment.averageAmount, payment.isExpense)}`}
                            />
                          </div>
                          
                          {/* X-axis label - Fixed space for names */}
                          <div style={{
                            fontSize: '7px',
                            color: '#999',
                            textAlign: 'center',
                            lineHeight: '1.1',
                            width: '100%',
                            height: '35px', // Reduced from 40px
                            marginTop: '3px',
                            wordWrap: 'break-word',
                            hyphens: 'auto',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              {payment.payee}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Removed the duplicate Monthly Total here */}
            </div>
          </>
        )}
      </div>

      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          style={{
            padding: '5px 10px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
