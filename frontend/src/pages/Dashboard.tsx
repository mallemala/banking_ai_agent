import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, CircularProgress, Alert,
  AlertTitle, FormControl, Select, MenuItem, List, ListItem, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress
} from '@mui/material';
import {
  Upload, RefreshCw, Info
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface SummaryData {
  openingBalance: number;
  closingBalance: number;
  totalIncoming: number;
  totalOutgoing: number;
  netFlow: number;
  transactionCount: number;
  healthScore: number;
  healthInsight: string;
}

interface Subscription {
  name: string;
  monthlyCost: number;
  annualCost: number;
  frequency: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#00d4aa',
  Dining: '#7c3aed',
  Subscriptions: '#a78bfa',
  Shopping: '#ec4899',
  Utilities: '#3b82f6',
  Other: '#6b7280',
  Income: '#10b981',
  Healthcare: '#f59e0b',
  Fuel: '#ef4444',
  Entertainment: '#8b5cf6',
  Travel: '#06b6d4',
  Insurance: '#f97316',
  Investment: '#22c55e',
  Transfers: '#64748b',
  Mortgage: '#ea580c',
  'Credit Card': '#e11d48',
  Loans: '#dfa800',
  Gambling: '#f43f5e',
  Miscellaneous: '#94a3b8',
};

const COLORS = ['#00d4aa', '#7c3aed', '#a78bfa', '#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

const formatCurrency = (val: number) => `£${Math.abs(val).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Health Score Gauge
const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * Math.PI; // half circle
  const pct = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  let color = '#ef4444';
  let label = 'Poor';
  if (score >= 80) { color = '#00d4aa'; label = 'Great'; }
  else if (score >= 60) { color = '#f59e0b'; label = 'Good'; }
  else if (score >= 40) { color = '#f97316'; label = 'Fair'; }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Box sx={{ position: 'relative', width: radius * 2, height: radius + stroke }}>
        <svg width={radius * 2} height={radius + stroke} style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path
            d={`M ${stroke / 2}, ${radius} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - stroke / 2},${radius}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${stroke / 2}, ${radius} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - stroke / 2},${radius}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <Box sx={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
            /100
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: '1rem', fontWeight: 700, color, mt: 1 }}>{label}</Typography>
    </Box>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  index: number;
}> = ({ label, value, index }) => {
  const gradients = [
    'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,212,170,0.02))',
    'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))',
    'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
    'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))',
    'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
  ];
  const borders = ['rgba(0,212,170,0.2)', 'rgba(124,58,237,0.2)', 'rgba(16,185,129,0.2)', 'rgba(239,68,68,0.2)', 'rgba(59,130,246,0.2)'];

  return (
    <Card sx={{
      background: gradients[index % gradients.length],
      border: `1px solid ${borders[index % borders.length]}`,
      borderRadius: '12px',
      height: '100%',
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500, mb: 1, letterSpacing: 0.3 }}>
          {index + 1}. {label}
        </Typography>
        <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

// Custom donut label
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.06) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Dashboard: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [storeBreakdownOpen, setStoreBreakdownOpen] = useState(false);
  const [selectedBreakdownCategory, setSelectedBreakdownCategory] = useState('');
  const [timeRange, setTimeRange] = useState<string>('This Month');

  const apiKey = localStorage.getItem('gemini_api_key') || '';
  const token = localStorage.getItem('token') || '';
  const userName = localStorage.getItem('user_name') || 'User';
  const firstName = userName.split(' ')[0];

  // Get all unique months from transactions for the dropdown
  const uniqueMonths = React.useMemo(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const set = new Set<string>();
    rawTransactions.forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        set.add(`${monthName} ${year}`);
      }
    });
    return Array.from(set).sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      const valA = parseInt(yA) * 12 + months.indexOf(mA);
      const valB = parseInt(yB) * 12 + months.indexOf(mB);
      return valB - valA; // newest first
    });
  }, [rawTransactions]);

  // Dynamic metrics based on time range
  const { filteredTransactions, summaryMetrics } = React.useMemo(() => {
    if (rawTransactions.length === 0) {
      return {
        filteredTransactions: [],
        summaryMetrics: {
          openingBalance: summary?.openingBalance || 0,
          closingBalance: summary?.closingBalance || 0,
          totalIncoming: summary?.totalIncoming || 0,
          totalOutgoing: summary?.totalOutgoing || 0,
          netFlow: (summary?.totalIncoming || 0) + (summary?.totalOutgoing || 0),
          healthScore: summary?.healthScore || 0,
          healthInsight: summary?.healthInsight || "No transaction data available. Upload a statement to get started."
        }
      };
    }

    const sortedAll = [...rawTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const times = sortedAll.map(t => new Date(t.date).getTime());
    const maxDate = new Date(Math.max(...times));

    let startDate = new Date(0);
    let endDate = new Date(maxDate);
    endDate.setHours(23, 59, 59, 999);

    if (timeRange === 'This Month') {
      startDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    } else if (timeRange === 'Last 3 Months') {
      startDate = new Date(maxDate.getFullYear(), maxDate.getMonth() - 2, 1);
    } else if (timeRange === 'Last 6 Months') {
      startDate = new Date(maxDate.getFullYear(), maxDate.getMonth() - 5, 1);
    } else if (timeRange === 'Last Calendar Year') {
      startDate = new Date(maxDate.getFullYear() - 1, 0, 1);
      endDate = new Date(maxDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const match = timeRange.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (match) {
        const monthName = match[1];
        const year = parseInt(match[2]);
        const monthIndex = months.indexOf(monthName);
        if (monthIndex !== -1) {
          startDate = new Date(year, monthIndex, 1);
          endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
        }
      }
    }

    const filtered = sortedAll.filter(t => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    });

    let openingBalance = 0;
    let closingBalance = 0;

    if (filtered.length > 0) {
      const firstTx = filtered[0];
      const lastTx = filtered[filtered.length - 1];
      closingBalance = lastTx.runningBalance;
      
      const firstIndex = sortedAll.findIndex(t => t.id === firstTx.id);
      if (firstIndex > 0) {
        openingBalance = sortedAll[firstIndex - 1].runningBalance;
      } else {
        openingBalance = firstTx.runningBalance - firstTx.amount;
      }
    } else {
      const beforeTxs = sortedAll.filter(t => new Date(t.date) < startDate);
      if (beforeTxs.length > 0) {
        openingBalance = beforeTxs[beforeTxs.length - 1].runningBalance;
        closingBalance = openingBalance;
      } else {
        openingBalance = 0;
        closingBalance = 0;
      }
    }

    const totalIncoming = filtered.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalOutgoing = filtered.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncoming + totalOutgoing;

    let healthScore = 0;
    let healthInsight = "";

    if (totalIncoming > 0) {
      const savingsRate = (netFlow / totalIncoming) * 100;
      if (savingsRate >= 30) {
        healthScore = Math.min(100, Math.round(85 + (savingsRate - 30) * 0.2));
        healthInsight = `Outstanding financial health! You saved ${savingsRate.toFixed(0)}% of your income this period. Your discretionary spending is well-controlled.`;
      } else if (savingsRate >= 15) {
        healthScore = Math.round(70 + (savingsRate - 15) * 1.0);
        healthInsight = `Healthy savings rate of ${savingsRate.toFixed(0)}%. You are consistently maintaining a cash buffer. Consider locking some of these savings in investments.`;
      } else if (savingsRate >= 0) {
        healthScore = Math.round(50 + savingsRate * 1.3);
        healthInsight = `Fair health score. You are living within your means with a ${savingsRate.toFixed(0)}% savings rate, but a small increase in unexpected expenses could strain your cash flow.`;
      } else {
        const deficitPct = Math.min(100, Math.abs(savingsRate));
        healthScore = Math.max(10, Math.round(50 - deficitPct * 0.4));
        healthInsight = `Budget warning: Your expenses exceeded your income by ${deficitPct.toFixed(0)}% during this period. Review your non-essential shopping and subscription costs.`;
      }
    } else if (totalOutgoing < 0) {
      healthScore = 20;
      healthInsight = `No income recorded for this period, only outflow. Ensure you have an emergency fund to cover these expenses.`;
    } else {
      healthScore = summary?.healthScore || 0;
      healthInsight = summary?.healthInsight || "Upload a statement to generate AI financial insights.";
    }

    return {
      filteredTransactions: filtered,
      summaryMetrics: {
        openingBalance,
        closingBalance,
        totalIncoming,
        totalOutgoing,
        netFlow,
        healthScore,
        healthInsight
      }
    };
  }, [rawTransactions, timeRange, summary]);

  const displayedPieData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.amount < 0) {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
      }
    });
    return Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: Math.round(categoryTotals[cat] * 100) / 100
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const totalSpending = React.useMemo(() =>
    displayedPieData.reduce((sum, item) => sum + item.value, 0),
    [displayedPieData]
  );

  const balanceProgressionData = React.useMemo(() => {
    const dailyFlows: Record<string, { income: number; expenses: number }> = {};
    filteredTransactions.forEach(t => {
      const dateStr = t.date;
      if (!dailyFlows[dateStr]) {
        dailyFlows[dateStr] = { income: 0, expenses: 0 };
      }
      if (t.amount > 0) {
        dailyFlows[dateStr].income += t.amount;
      } else {
        dailyFlows[dateStr].expenses += Math.abs(t.amount);
      }
    });

    const sortedDates = Object.keys(dailyFlows).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    let currentBalance = summaryMetrics.openingBalance;
    
    return sortedDates.map(date => {
      const flow = dailyFlows[date];
      currentBalance += flow.income - flow.expenses;
      return {
        date,
        Income: Math.round(flow.income),
        Expenses: Math.round(flow.expenses),
        Balance: Math.round(currentBalance)
      };
    });
  }, [filteredTransactions, summaryMetrics.openingBalance]);

  const incomeVsExpenseData = React.useMemo(() => {
    const monthGroups: Record<string, { income: number; expenses: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const getShortMonthYear = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
    };

    filteredTransactions.forEach(t => {
      const shortMonth = getShortMonthYear(t.date);
      if (shortMonth) {
        if (!monthGroups[shortMonth]) monthGroups[shortMonth] = { income: 0, expenses: 0 };
        if (t.amount > 0) monthGroups[shortMonth].income += t.amount;
        else monthGroups[shortMonth].expenses += Math.abs(t.amount);
      }
    });

    const sortedKeys = Object.keys(monthGroups).sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      const valA = parseInt(yA) * 12 + months.indexOf(mA);
      const valB = parseInt(yB) * 12 + months.indexOf(mB);
      return valA - valB;
    });

    return sortedKeys.map(m => ({
      month: m,
      Income: Math.round(monthGroups[m].income),
      Expenses: Math.round(monthGroups[m].expenses),
    }));
  }, [filteredTransactions]);

  const storeBreakdownData = React.useMemo(() => {
    if (!selectedBreakdownCategory) return [];
    const filteredTxs = filteredTransactions.filter(t => {
      return t.category.toLowerCase() === selectedBreakdownCategory.toLowerCase() && t.amount < 0;
    });
    const merchantMap: Record<string, number> = {};
    filteredTxs.forEach(t => {
      const name = t.merchant || 'Unknown';
      merchantMap[name] = (merchantMap[name] || 0) + Math.abs(t.amount);
    });
    return Object.keys(merchantMap)
      .map(m => ({ merchant: m, amount: Math.round(merchantMap[m] * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);
  }, [selectedBreakdownCategory, filteredTransactions]);

  const fetchData = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const res = await fetch('/api/statement/summary', {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Gemini-API-Key': apiKey }
      });
      const data = await res.json();
      if (res.ok) setSummary(data);
      else throw new Error(data.message || 'Failed to fetch summary');

      const sRes = await fetch('/api/statement/subscriptions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sRes.ok) setSubscriptions(await sRes.json());

      const tRes = await fetch('/api/statement/transactions?size=500', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tRes.ok) {
        const txData = await tRes.json();
        const content = txData.content || [];
        setRawTransactions(content);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard.');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
    setUploading(true);
    setError('');
    try {
      const res = await fetch('/api/statement/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Gemini-API-Key': apiKey },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      if (data.errors?.length > 0) setError(`Errors:\n${data.errors.join('\n')}`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload statement');
    } finally {
      setUploading(false);
    }
  };

  if (loadingSummary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#00d4aa' }} size={50} />
      </Box>
    );
  }

  const netSavingsVal = summaryMetrics.totalIncoming + summaryMetrics.totalOutgoing;
  const formatNetSavings = (val: number) => {
    const formatted = Math.abs(val).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return val >= 0 ? `£${formatted}` : `-£${formatted}`;
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', mb: 0.25 }}>
            Welcome back, {firstName}!
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            Dashboard Overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Time Range Selector */}
          <FormControl size="small">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              sx={{
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.85)',
                height: 38,
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4aa' },
              }}
            >
              <MenuItem value="This Month">This Month</MenuItem>
              <MenuItem value="All Time">All Time</MenuItem>
              <MenuItem value="Last 3 Months">Last 3 Months</MenuItem>
              <MenuItem value="Last 6 Months">Last 6 Months</MenuItem>
              <MenuItem value="Last Calendar Year">Last Calendar Year</MenuItem>
              {uniqueMonths.map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            component="label"
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <Upload size={16} />}
            disabled={uploading}
            sx={{
              background: 'linear-gradient(135deg, #00d4aa, #009980)',
              fontWeight: 700, px: 2.5, py: 1,
              height: 38,
              borderRadius: '8px',
              textTransform: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #00e6ba, #00b395)' }
            }}
          >
            {uploading ? 'Processing...' : 'Upload Statement'}
            <input type="file" hidden multiple accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png" onChange={handleFileUpload} />
          </Button>
          <Button
            variant="outlined"
            onClick={fetchData}
            sx={{ minWidth: 38, height: 38, p: 1, borderRadius: '8px', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#00d4aa', color: '#00d4aa' } }}
          >
            <RefreshCw size={16} />
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {!apiKey && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>Gemini API Key Required</AlertTitle>
          Configure your Gemini API key to unlock AI features.
        </Alert>
      )}

      {/* Metric Cards Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Opening Balance" value={formatCurrency(summaryMetrics.openingBalance)} index={0} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Closing Balance" value={formatCurrency(summaryMetrics.closingBalance)} index={1} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard label="Total Income" value={formatCurrency(summaryMetrics.totalIncoming)} index={2} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard label="Total Expenses" value={formatCurrency(Math.abs(summaryMetrics.totalOutgoing))} index={3} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard label="Net Savings" value={formatNetSavings(netSavingsVal)} index={4} />
        </Grid>
      </Grid>

      {/* Health Score + Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Financial Health Score */}
        <Grid item xs={12} md={3.5}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.06), rgba(16,185,129,0.03))',
            border: '1px solid rgba(0,212,170,0.15)',
            borderRadius: '16px',
            height: '100%',
            minHeight: 220,
          }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
                  Financial Health Score
                </Typography>
                <Info size={16} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <HealthGauge score={summaryMetrics.healthScore} />
              </Box>
              {summaryMetrics.healthInsight && (
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', mt: 1, lineHeight: 1.5, textAlign: 'center' }}>
                  {summaryMetrics.healthInsight.substring(0, 120)}{summaryMetrics.healthInsight.length > 120 ? '...' : ''}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Spending by Category Donut */}
        <Grid item xs={12} md={4.5}>
          <Card sx={{ background: 'rgba(22,30,46,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', height: '100%', minHeight: 220 }}>
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
                  Spending by Category
                </Typography>
              </Box>

              {displayedPieData.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <Typography variant="body2">No transactions in selected period</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flex: 1, gap: 1, alignItems: 'center' }}>
                  <Box sx={{ flex: '0 0 180px', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={displayedPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                          label={renderCustomLabel}
                        >
                          {displayedPieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]}
                              cursor="pointer"
                              onClick={() => { setSelectedBreakdownCategory(entry.name); setStoreBreakdownOpen(true); }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(value), 'Spent']}
                          contentStyle={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center total */}
                    <Box sx={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>
                        {formatCurrency(totalSpending)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Total</Typography>
                    </Box>
                  </Box>

                  {/* Category legend list */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5, overflowY: 'auto', maxHeight: 180 }}>
                    {displayedPieData.map((item, index) => {
                      const pct = totalSpending > 0 ? ((item.value / totalSpending) * 100).toFixed(0) : '0';
                      const color = CATEGORY_COLORS[item.name] || COLORS[index % COLORS.length];
                      return (
                        <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                          onClick={() => { setSelectedBreakdownCategory(item.name); setStoreBreakdownOpen(true); }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{item.name}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{pct}%</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Income vs Expenses Bar Chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'rgba(22,30,46,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', height: '100%', minHeight: 220 }}>
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
                  Income vs Expenses
                </Typography>
              </Box>
              {incomeVsExpenseData.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <Typography variant="body2">No data available</Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1 }}>
                  {/* Legend */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, background: '#00d4aa' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Income</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, background: '#7c3aed' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Expenses</Typography>
                    </Box>
                  </Box>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={incomeVsExpenseData} barSize={18} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: any, name: string) => [formatCurrency(value), name]}
                        contentStyle={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}
                      />
                      <Bar dataKey="Income" fill="#00d4aa" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* balance progression trend */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card sx={{ background: 'rgba(22,30,46,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'white', mb: 2 }}>Balance Progression</Typography>
            {balanceProgressionData.length === 0 ? (
              <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <Typography variant="body2">No data available for trend plotting</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={balanceProgressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), 'Balance']}
                    contentStyle={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="Balance" fill="#00d4aa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Subscriptions */}
      {subscriptions.length > 0 && (
        <Card sx={{ background: 'rgba(22,30,46,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'white', mb: 2 }}>Active Subscriptions</Typography>
            <Grid container spacing={2}>
              {subscriptions.map((sub, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Box sx={{
                    p: 2,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                  }}>
                    <Typography sx={{ fontWeight: 700, color: 'white', mb: 0.5, fontSize: '0.9rem' }}>{sub.name}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>-{formatCurrency(sub.monthlyCost)}/mo</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>~{formatCurrency(sub.annualCost)}/yr</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Category Store Breakdown Dialog */}
      <Dialog
        open={storeBreakdownOpen}
        onClose={() => setStoreBreakdownOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedBreakdownCategory} Breakdown</span>
          <Typography variant="caption" sx={{ px: 1.5, py: 0.5, borderRadius: '20px', background: 'rgba(0,212,170,0.1)', color: '#00d4aa', fontWeight: 700 }}>
            {timeRange}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {storeBreakdownData.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No data found.</Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {storeBreakdownData.map(item => {
                const total = storeBreakdownData.reduce((s, i) => s + i.amount, 0);
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                return (
                  <Box key={item.merchant} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{item.merchant}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#00d4aa' }}>{formatCurrency(item.amount)}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #00d4aa, #7c3aed)' } }} />
                  </Box>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStoreBreakdownOpen(false)} variant="contained" sx={{ background: '#00d4aa', fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
