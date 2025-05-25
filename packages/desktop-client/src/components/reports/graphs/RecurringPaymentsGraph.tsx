import React, { useState, useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useQuery } from '@desktop-client/hooks/useQuery';

type RecurringPayment = {
  payee: string;
  account: string;
  averageAmount: number;
  frequency: string;
  lastAmount: number;
  lastDate: string;
  transactionCount: number;
  confidenceScore: number;
  daysBetween: number;
  isExpense: boolean;
  amountVariability: number; // Percentage variation in amounts
  transactions: any[]; // Store all transactions for this payment
};

export function RecurringPaymentsGraph() {
  const [showChart, setShowChart] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [minOccurrences, setMinOccurrences] = useState(3);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showIncome, setShowIncome] = useState(false);
  const [minConfidence, setMinConfidence] = useState(40);
  const [sortBy, setSortBy] = useState<'amount' | 'confidence' | 'frequency'>('amount');
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>([]);
  const [maxVariation, setMaxVariation] = useState<number>(100); // New filter for variation
  const [displayCurrency, setDisplayCurrency] = useState<string>('EUR'); // New currency selector
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set()); // Track expanded payments

  // Save settings to localStorage whenever they change
  React.useEffect(() => {
    const settings = {
      selectedAccounts,
      minOccurrences,
      showExpenses,
      showIncome,
      minConfidence,
      sortBy,
      selectedFrequencies,
      maxVariation,
      displayCurrency
    };
    
    localStorage.setItem('recurringPaymentsSettings', JSON.stringify(settings));
  }, [selectedAccounts, minOccurrences, showExpenses, showIncome, minConfidence, sortBy, selectedFrequencies, maxVariation, displayCurrency]);

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('recurringPaymentsSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setSelectedAccounts(settings.selectedAccounts || []);
        setMinOccurrences(settings.minOccurrences || 3);
        setShowExpenses(settings.showExpenses !== undefined ? settings.showExpenses : true);
        setShowIncome(settings.showIncome !== undefined ? settings.showIncome : false);
        setMinConfidence(settings.minConfidence || 40);
        setSortBy(settings.sortBy || 'amount');
        setSelectedFrequencies(settings.selectedFrequencies || []);
        setMaxVariation(settings.maxVariation !== undefined ? settings.maxVariation : 100);
        setDisplayCurrency(settings.displayCurrency || 'EUR');
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, []);

  const accounts = useAccounts();

  // Also fetch payees to get human-readable names
  const { data: payees } = useQuery(() => q('payees').select(['id', 'name']), []);

  // Create a query for the last 12 months of transactions (both income and expenses)
  const transactionQuery = useMemo(() => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().split('T')[0];

    let query = q('transactions')
      .filter({ date: { $gte: startDate } })
      .filter({ payee: { $ne: null } }) // Must have a payee
      .select(['id', 'payee', 'account', 'amount', 'date', 'category'])
      .orderBy({ date: 'desc' });

    // Filter by transaction type
    if (showExpenses && !showIncome) {
      query = query.filter({ amount: { $lt: 0 } }); // Only expenses
    } else if (showIncome && !showExpenses) {
      query = query.filter({ amount: { $gt: 0 } }); // Only income
    }
    // If both are selected, show all transactions

    return query;
  }, [showExpenses, showIncome]);

  // Fetch transactions
  const { transactions, isLoading, error } = useTransactions({
    query: transactionQuery,
    options: { pageCount: 1000 } // Get more transactions for better analysis
  });

  console.log('Loaded transactions:', transactions?.length || 0);

  // Analyze transaction patterns to find recurring payments
  const recurringPayments = useMemo(() => {
    if (!transactions || transactions.length === 0 || !payees) return [];

    try {
      // Create payee lookup map
      const payeeMap = new Map(payees.map(p => [p.id, p.name]));

      // Group transactions by payee and account
      const payeeGroups = new Map<string, any[]>();
      
      transactions.forEach(transaction => {
        if (!transaction.payee || !transaction.account) return;
        
        // Filter by selected accounts if any
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

        // Sort by date (oldest first for interval calculation)
        transactionList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate frequency (average days between transactions)
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

        // Calculate confidence score based on regularity
        let confidenceScore = 0;
        if (intervals > 0) {
          const regularityScore = Math.max(0, 100 - (Math.abs(averageDaysBetween - 30) * 2)); // Closer to 30 days = higher score
          const countScore = Math.min(100, transactionList.length * 20); // More transactions = higher confidence
          confidenceScore = Math.round((regularityScore + countScore) / 2);
        }

        // Determine frequency label
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

        // Only include if it looks like a reasonable recurring pattern and meets all filters
        if (confidenceScore >= minConfidence && averageDaysBetween <= 400) {
          // Check frequency filter
          if (selectedFrequencies.length > 0 && !selectedFrequencies.includes(frequencyLabel)) {
            return; // Skip if frequency doesn't match filter
          }

          const amounts = transactionList.map(t => Math.abs(t.amount) / 100);
          const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
          
          // Calculate amount variability (coefficient of variation as percentage)
          const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - averageAmount, 2), 0) / amounts.length;
          const standardDeviation = Math.sqrt(variance);
          const variabilityPercent = averageAmount > 0 ? (standardDeviation / averageAmount) * 100 : 0;
          
          // Apply amount variability filter
          if (variabilityPercent > maxVariation) {
            return; // Skip if amounts are too variable
          }

          const lastTransaction = transactionList[transactionList.length - 1];
          const account = accounts.find(acc => acc.id === lastTransaction.account);
          const payeeName = payeeMap.get(lastTransaction.payee) || 'Unknown Payee';
          const isExpense = lastTransaction.amount < 0;

          recurringList.push({
            payee: payeeName,
            account: account?.name || 'Unknown Account',
            averageAmount: averageAmount,
            frequency: frequencyLabel,
            lastAmount: Math.abs(lastTransaction.amount) / 100,
            lastDate: lastTransaction.date,
            transactionCount: transactionList.length,
            confidenceScore: confidenceScore,
            daysBetween: Math.round(averageDaysBetween),
            isExpense: isExpense,
            amountVariability: Math.round(variabilityPercent),
            transactions: transactionList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Store transactions sorted by date (oldest first)
          });
        }
      });

      // Sort by selected criteria
      return recurringList
        .sort((a, b) => {
          switch (sortBy) {
            case 'confidence':
              return b.confidenceScore - a.confidenceScore;
            case 'frequency':
              return a.daysBetween - b.daysBetween; // Shorter intervals first
            case 'amount':
            default:
              return b.averageAmount - a.averageAmount;
          }
        })
        .slice(0, 20);

    } catch (error) {
      console.error('Error analyzing transactions:', error);
      return [];
    }
  }, [transactions, accounts, selectedAccounts, minOccurrences, payees, minConfidence, sortBy, selectedFrequencies, maxVariation]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const toggleFrequency = (frequency: string) => {
    setSelectedFrequencies(prev => 
      prev.includes(frequency) 
        ? prev.filter(f => f !== frequency)
        : [...prev, frequency]
    );
  };

  // Get all unique frequencies from the data for filter buttons
  const availableFrequencies = useMemo(() => {
    if (!transactions || !payees) return [];
    
    // Get all frequencies from current analysis (without frequency filter applied)
    const allFrequencies = new Set<string>();
    
    // Simplified analysis just to get frequency options
    const payeeMap = new Map(payees.map(p => [p.id, p.name]));
    const payeeGroups = new Map<string, any[]>();
    
    transactions.forEach(transaction => {
      if (!transaction.payee || !transaction.account) return;
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(transaction.account)) return;
      
      const key = `${transaction.payee}-${transaction.account}`;
      if (!payeeGroups.has(key)) {
        payeeGroups.set(key, []);
      }
      payeeGroups.get(key)!.push(transaction);
    });

    payeeGroups.forEach((transactionList) => {
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
      
      // Determine frequency label (same logic as main analysis)
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
      
      allFrequencies.add(frequencyLabel);
    });

    return Array.from(allFrequencies).sort((a, b) => {
      // Sort by typical order
      const order = ['Weekly', 'Bi-weekly', 'Monthly', 'Bi-monthly', 'Quarterly', 'Semi-annual', 'Annual', 'Irregular'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [transactions, payees, selectedAccounts, minOccurrences]);

  const formatCurrency = (amount: number, isExpense: boolean) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency
    }).format(amount);
    
    return isExpense ? `-${formatted}` : `+${formatted}`;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return '#28a745'; // Green - high confidence
    if (score >= 60) return '#ffc107'; // Yellow - medium confidence
    if (score >= 40) return '#fd7e14'; // Orange - low-medium confidence
    return '#dc3545'; // Red - low confidence
  };

  // Calculate monthly estimate
  const monthlyEstimate = useMemo(() => {
    return recurringPayments.reduce((sum, payment) => {
      const monthlyAmount = payment.frequency === 'Weekly' ? payment.averageAmount * 4.33 :
                           payment.frequency === 'Bi-weekly' ? payment.averageAmount * 2.17 :
                           payment.frequency === 'Monthly' ? payment.averageAmount :
                           payment.frequency === 'Bi-monthly' ? payment.averageAmount * 0.5 :
                           payment.frequency === 'Quarterly' ? payment.averageAmount / 3 :
                           payment.frequency === 'Semi-annual' ? payment.averageAmount / 6 :
                           payment.frequency === 'Annual' ? payment.averageAmount / 12 :
                           payment.averageAmount / (payment.daysBetween / 30.44); // Convert based on actual days
      return sum + monthlyAmount;
    }, 0);
  }, [recurringPayments]);

  // Toggle expanded state for a payment
  const togglePaymentExpansion = (paymentKey: string) => {
    setExpandedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentKey)) {
        newSet.delete(paymentKey);
      } else {
        newSet.add(paymentKey);
      }
      return newSet;
    });
  };

  // Calculate days between transactions
  const getDaysBetween = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>Recurring Payment Analysis</h3>
        <div style={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          backgroundColor: 'white',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>🔄</div>
          <div>Analyzing your transaction patterns...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            This may take a moment for large transaction histories
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>Recurring Payment Analysis</h3>
        <div style={{
          border: '1px solid #ffcdd2',
          borderRadius: '6px',
          backgroundColor: '#ffebee',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px', color: '#d32f2f' }}>❌</div>
          <div style={{ color: '#d32f2f' }}>Error analyzing transactions</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...recurringPayments.map(p => p.averageAmount), 1);

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, marginBottom: '10px' }}>Recurring Payment Analysis</h3>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          Monthly Estimate: <strong>{formatCurrency(monthlyEstimate, true)}</strong>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowChart(!showChart)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showChart ? 'Hide Analysis' : 'Show Analysis'}
          </button>
          
          <button
            onClick={() => {
              setShowExpenses(!showExpenses);
              if (!showExpenses && !showIncome) setShowIncome(true);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: showExpenses ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showExpenses ? '✓ Expenses' : 'Expenses'}
          </button>
          
          <button
            onClick={() => {
              setShowIncome(!showIncome);
              if (!showExpenses && !showIncome) setShowExpenses(true);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: showIncome ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showIncome ? '✓ Income' : 'Income'}
          </button>
          
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: 'white'
            }}
          >
            <option value="EUR">💶 EUR</option>
            <option value="USD">💵 USD</option>
            <option value="GBP">💷 GBP</option>
            <option value="CAD">🍁 CAD</option>
            <option value="AUD">🇦🇺 AUD</option>
            <option value="JPY">💴 JPY</option>
            <option value="CHF">🇨🇭 CHF</option>
            <option value="SEK">🇸🇪 SEK</option>
            <option value="NOK">🇳🇴 NOK</option>
            <option value="DKK">🇩🇰 DKK</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'amount' | 'confidence' | 'frequency')}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: 'white'
            }}
          >
            <option value="amount">Sort by Amount</option>
            <option value="confidence">Sort by Confidence</option>
            <option value="frequency">Sort by Frequency</option>
          </select>
        </div>
        <span style={{ fontSize: '12px', color: '#999' }}>
          Found {recurringPayments.length} patterns from {transactions.length} transactions
        </span>
      </div>

      {/* Filters */}
      {showChart && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
              Filter by Accounts:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => toggleAccount(account.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: selectedAccounts.includes(account.id) ? '#007bff' : 'white',
                    color: selectedAccounts.includes(account.id) ? 'white' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  {account.name}
                </button>
              ))}
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                Filter by Frequency:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableFrequencies.map(frequency => (
                  <button
                    key={frequency}
                    onClick={() => toggleFrequency(frequency)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: selectedFrequencies.includes(frequency) ? '#28a745' : 'white',
                      color: selectedFrequencies.includes(frequency) ? 'white' : '#333',
                      cursor: 'pointer'
                    }}
                  >
                    {frequency}
                  </button>
                ))}
                {selectedFrequencies.length > 0 && (
                  <button
                    onClick={() => setSelectedFrequencies([])}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      border: '1px solid #dc3545',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      color: '#dc3545',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <label style={{ fontSize: '14px', display: 'block' }}>
                Minimum occurrences: 
                <select 
                  value={minOccurrences} 
                  onChange={(e) => setMinOccurrences(Number(e.target.value))}
                  style={{ marginLeft: '8px', padding: '4px', width: '100%' }}
                >
                  <option value={2}>2+ times</option>
                  <option value={3}>3+ times</option>
                  <option value={4}>4+ times</option>
                  <option value={5}>5+ times</option>
                  <option value={6}>6+ times</option>
                </select>
              </label>
              
              <label style={{ fontSize: '14px', display: 'block' }}>
                Minimum confidence: 
                <select 
                  value={minConfidence} 
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  style={{ marginLeft: '8px', padding: '4px', width: '100%' }}
                >
                  <option value={30}>30%+ (All patterns)</option>
                  <option value={40}>40%+ (Likely recurring)</option>
                  <option value={60}>60%+ (Confident)</option>
                  <option value={80}>80%+ (Very confident)</option>
                  <option value={90}>90%+ (Almost certain)</option>
                </select>
              </label>

              <label style={{ fontSize: '14px', display: 'block' }}>
                Maximum variation: 
                <select 
                  value={maxVariation} 
                  onChange={(e) => setMaxVariation(Number(e.target.value))}
                  style={{ marginLeft: '8px', padding: '4px', width: '100%' }}
                >
                  <option value={0}>0% (Exact amounts)</option>
                  <option value={5}>5% (Very stable)</option>
                  <option value={15}>15% (Stable)</option>
                  <option value={25}>25% (Moderate)</option>
                  <option value={50}>50% (Variable)</option>
                  <option value={100}>100% (All amounts)</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {showChart && (
        <div style={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          backgroundColor: 'white',
          minHeight: '400px'
        }}>
          {recurringPayments.length === 0 ? (
            <div style={{
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
              <div style={{ fontSize: '16px', marginBottom: '5px' }}>No recurring patterns detected</div>
              <div style={{ fontSize: '14px', textAlign: 'center' }}>
                Try lowering the minimum occurrences or adjusting your filters.
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              <div style={{ 
                marginBottom: '15px', 
                fontSize: '14px', 
                color: '#666',
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px'
              }}>
                <span>AI-detected recurring payments from your transaction history</span>
                <span>🎯 Confidence • 📊 Frequency • 📈 Variation</span>
              </div>
              
              {recurringPayments.map((payment, index) => {
                const paymentKey = `${payment.payee}-${payment.account}`;
                const isExpanded = expandedPayments.has(paymentKey);
                
                return (
                  <div key={paymentKey}>
                    <div
                      onClick={() => togglePaymentExpansion(paymentKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: isExpanded ? '8px' : '12px',
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                        border: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e3f2fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white';
                      }}
                    >
                      {/* Expand/Collapse Icon */}
                      <div style={{ 
                        width: '20px', 
                        fontSize: '14px', 
                        color: '#666',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}>
                        ▶
                      </div>

                      {/* Payee - First column */}
                      <div style={{ 
                        width: '160px', 
                        fontSize: '14px', 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {payment.payee}
                      </div>
                      
                      {/* Account & Frequency */}
                      <div style={{ width: '120px' }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {payment.account}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#007bff',
                          fontWeight: 'bold'
                        }}>
                          {payment.frequency}
                        </div>
                      </div>
                      
                      {/* Stats with labels */}
                      <div style={{
                        width: '140px',
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        <div style={{ marginBottom: '2px' }}>
                          <span style={{ color: '#999' }}>Occurs:</span> {payment.transactionCount}x
                        </div>
                        <div style={{ marginBottom: '2px' }}>
                          <span style={{ color: '#999' }}>Accuracy:</span> 
                          <span style={{ color: getConfidenceColor(payment.confidenceScore), fontWeight: 'bold', marginLeft: '4px' }}>
                            {payment.confidenceScore}%
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#999' }}>Variation:</span> 
                          <span style={{ 
                            color: payment.amountVariability <= 5 ? '#28a745' : 
                                   payment.amountVariability <= 15 ? '#ffc107' : '#dc3545',
                            fontWeight: 'bold',
                            marginLeft: '4px'
                          }}>
                            ±{payment.amountVariability}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ 
                        flex: 1, 
                        height: '28px', 
                        backgroundColor: '#e9ecef', 
                        borderRadius: '14px',
                        marginLeft: '12px',
                        marginRight: '12px',
                        overflow: 'hidden'
                      }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max((payment.averageAmount / maxAmount) * 100, 5)}%`,
                            backgroundColor: '#007bff', // Fixed blue color instead of confidence-based
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '8px'
                          }}
                        >
                          {payment.averageAmount > maxAmount * 0.2 && (
                            <span style={{ 
                              color: 'white', 
                              fontSize: '11px', 
                              fontWeight: 'bold' 
                            }}>
                              {formatCurrency(payment.averageAmount, payment.isExpense)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Amount */}
                      <div style={{ 
                        width: '120px', 
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: payment.isExpense ? '#dc3545' : '#28a745'
                      }}>
                        {formatCurrency(payment.averageAmount, payment.isExpense)}
                      </div>
                    </div>

                    {/* Expanded Transaction Details */}
                    {isExpanded && (
                      <div style={{
                        marginBottom: '12px',
                        padding: '16px',
                        backgroundColor: '#f1f3f4',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0',
                        marginLeft: '20px'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 'bold',
                          marginBottom: '12px',
                          color: '#333',
                          borderBottom: '1px solid #ddd',
                          paddingBottom: '8px'
                        }}>
                          📋 Transaction History ({payment.transactions.length} transactions)
                        </div>
                        
                        {payment.transactions.map((transaction, txIndex) => {
                          const prevTransaction = txIndex > 0 ? payment.transactions[txIndex - 1] : null;
                          const daysSinceLast = prevTransaction ? 
                            getDaysBetween(prevTransaction.date, transaction.date) : null;
                          
                          return (
                            <div
                              key={transaction.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 12px',
                                marginBottom: '6px',
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                border: '1px solid #e9ecef',
                                fontSize: '12px'
                              }}
                            >
                              {/* Date */}
                              <div style={{ width: '100px', fontWeight: '500' }}>
                                {new Date(transaction.date).toLocaleDateString('en-GB')}
                              </div>
                              
                              {/* Amount */}
                              <div style={{ 
                                width: '100px', 
                                fontWeight: 'bold',
                                color: transaction.amount < 0 ? '#dc3545' : '#28a745'
                              }}>
                                {formatCurrency(Math.abs(transaction.amount) / 100, transaction.amount < 0)}
                              </div>
                              
                              {/* Days since last */}
                              <div style={{ 
                                width: '120px', 
                                color: '#666',
                                fontSize: '11px'
                              }}>
                                {daysSinceLast ? (
                                  <span style={{
                                    backgroundColor: '#e3f2fd',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    color: '#1976d2'
                                  }}>
                                    +{daysSinceLast} days
                                  </span>
                                ) : (
                                  <span style={{ color: '#999' }}>First transaction</span>
                                )}
                              </div>
                              
                              {/* Category (if available) */}
                              <div style={{ 
                                flex: 1, 
                                color: '#666',
                                fontSize: '11px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {transaction.category || 'No category'}
                              </div>
                              
                              {/* Transaction ID (last 6 chars) */}
                              <div style={{ 
                                width: '80px', 
                                textAlign: 'right',
                                color: '#999',
                                fontSize: '10px',
                                fontFamily: 'monospace'
                              }}>
                                #{transaction.id.slice(-6)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        marginTop: '15px', 
        fontSize: '11px', 
        color: '#999',
        textAlign: 'center'
      }}>
        🤖 Real AI analysis of your transaction patterns • Last 12 months • Green = High confidence
      </div>
    </div>
  );
}