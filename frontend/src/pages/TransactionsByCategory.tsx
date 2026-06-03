import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem, Button,
  IconButton, CircularProgress, InputBase, Menu, Chip, FormControl,
  Pagination, Stack, InputAdornment, Tooltip, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText
} from '@mui/material';
import {
  Search, ArrowUpDown, ChevronDown, ChevronRight, ChevronLeft,
  ShoppingCart, ShieldCheck, Home, Activity, ShoppingBag,
  Film, Utensils, Plane, DollarSign, TrendingUp, ArrowRightLeft,
  Calendar, CreditCard, Wallet, Target, MoreHorizontal, Plus
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  category: string;
  amount: number;
  transactionType: string;
  runningBalance: number;
  accountNumber: string;
}

const DEFAULT_CATEGORIES = [
  "Groceries", "Insurance", "Utilities", "Healthcare", "Fuel", "Shopping",
  "Entertainment", "Dining", "Travel", "Salary", "Investment", "Transfers",
  "Subscriptions", "Mortgage", "Credit Card", "Loans", "Gambling", "Miscellaneous"
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; raw: string }> = {
  Subscriptions: { bg: 'rgba(124,58,237,0.2)', text: '#a78bfa', raw: '#a78bfa' },
  Groceries: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b', raw: '#f59e0b' },
  Shopping: { bg: 'rgba(236,72,153,0.2)', text: '#ec4899', raw: '#ec4899' },
  Dining: { bg: 'rgba(99,102,241,0.2)', text: '#818cf8', raw: '#818cf8' },
  Utilities: { bg: 'rgba(59,130,246,0.2)', text: '#3b82f6', raw: '#3b82f6' },
  Healthcare: { bg: 'rgba(239,68,68,0.2)', text: '#ef4444', raw: '#ef4444' },
  Fuel: { bg: 'rgba(249,115,22,0.2)', text: '#f97316', raw: '#f97316' },
  Travel: { bg: 'rgba(6,182,212,0.2)', text: '#06b6d4', raw: '#06b6d4' },
  Entertainment: { bg: 'rgba(139,92,246,0.2)', text: '#8b5cf6', raw: '#8b5cf6' },
  Salary: { bg: 'rgba(16,185,129,0.2)', text: '#10b981', raw: '#10b981' },
  Investment: { bg: 'rgba(34,197,94,0.2)', text: '#22c55e', raw: '#22c55e' },
  Transfers: { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8', raw: '#94a3b8' },
  Insurance: { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', raw: '#fb923c' },
  Mortgage: { bg: 'rgba(234,88,12,0.2)', text: '#ea580c', raw: '#ea580c' },
  'Credit Card': { bg: 'rgba(225,29,72,0.2)', text: '#e11d48', raw: '#e11d48' },
  Loans: { bg: 'rgba(223,168,0,0.2)', text: '#dfa800', raw: '#dfa800' },
  Gambling: { bg: 'rgba(244,63,94,0.2)', text: '#f43f5e', raw: '#f43f5e' },
  Miscellaneous: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af', raw: '#9ca3af' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Groceries: <ShoppingCart size={18} />,
  Dining: <Utensils size={18} />,
  Shopping: <ShoppingBag size={18} />,
  Insurance: <ShieldCheck size={18} />,
  Utilities: <Home size={18} />,
  Healthcare: <Activity size={18} />,
  Fuel: <TrendingUp size={18} />,
  Travel: <Plane size={18} />,
  Entertainment: <Film size={18} />,
  Salary: <DollarSign size={18} />,
  Investment: <TrendingUp size={18} />,
  Transfers: <ArrowRightLeft size={18} />,
  Subscriptions: <Calendar size={18} />,
  Mortgage: <Home size={18} />,
  'Credit Card': <CreditCard size={18} />,
  Loans: <Wallet size={18} />,
  Gambling: <Target size={18} />,
  Miscellaneous: <MoreHorizontal size={18} />,
};

const getCategoryChipStyle = (category: string) => {
  return CATEGORY_COLORS[category] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)', raw: '#ffffff' };
};

const getCategoryIcon = (category: string) => {
  return CATEGORY_ICONS[category] || <MoreHorizontal size={18} />;
};

const TransactionsByCategory: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Table search & sort
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // Manage custom categories
  const [manageOpen, setManageOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [createError, setCreateError] = useState('');

  // Time range filter
  const [timeRange, setTimeRange] = useState('This Month');

  const token = localStorage.getItem('token') || '';

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/statement/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/statement/transactions?page=0&size=1000&sortBy=date&sortDir=desc`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        const transactions = data.content || [];
        setAllTransactions(transactions);
        if (transactions.length > 0) {
          const counts: Record<string, number> = {};
          transactions.forEach((tx: Transaction) => {
            counts[tx.category] = (counts[tx.category] || 0) + 1;
          });
          const sortedCats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
          if (sortedCats.length > 0) {
            setSelectedCategory(sortedCats[0]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTransactions();
    fetchCategories();
  }, []);

  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/statement/transactions/${id}/category`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      if (res.ok) {
        setAllTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/statement/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCategories(prev => [...prev, newCategoryName.trim()]);
        setNewCategoryName('');
        setCreateError('');
      } else {
        setCreateError(data.message || 'Failed to create category');
      }
    } catch (err) {
      setCreateError('Network error, please try again.');
    }
  };

  // Get all unique months from transactions for the dropdown
  const uniqueMonths = React.useMemo(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const set = new Set<string>();
    allTransactions.forEach(t => {
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
  }, [allTransactions]);

  // Time Range filtering
  const { filteredByTimeTransactions } = React.useMemo(() => {
    if (allTransactions.length === 0) return { filteredByTimeTransactions: [] };

    const times = allTransactions.map(t => new Date(t.date).getTime());
    const maxDate = new Date(Math.max(...times));

    let start = new Date(0);
    let end = new Date(maxDate);
    end.setHours(23, 59, 59, 999);

    if (timeRange === 'This Month') {
      start = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    } else if (timeRange === 'Last 3 Months') {
      start = new Date(maxDate.getFullYear(), maxDate.getMonth() - 2, 1);
    } else if (timeRange === 'Last 6 Months') {
      start = new Date(maxDate.getFullYear(), maxDate.getMonth() - 5, 1);
    } else if (timeRange === 'Last Calendar Year') {
      start = new Date(maxDate.getFullYear() - 1, 0, 1);
      end = new Date(maxDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const match = timeRange.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (match) {
        const monthName = match[1];
        const year = parseInt(match[2]);
        const monthIndex = months.indexOf(monthName);
        if (monthIndex !== -1) {
          start = new Date(year, monthIndex, 1);
          end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
        }
      }
    }

    const filtered = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    return { filteredByTimeTransactions: filtered };
  }, [allTransactions, timeRange]);

  // Grouping and calculations
  const totalOutgoing = filteredByTimeTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const categoryStats = React.useMemo(() => {
    return categories.map(cat => {
      const txs = filteredByTimeTransactions.filter(t => t.category === cat);
      const count = txs.length;
      const spent = txs.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const received = txs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const net = received - spent;
      const pctOfTotal = totalOutgoing > 0 ? (spent / totalOutgoing) * 100 : 0;
      
      return {
        name: cat,
        count,
        spent,
        received,
        net,
        pctOfTotal
      };
    }).filter(c => c.count > 0) // only show categories with transactions
      .sort((a, b) => b.spent - a.spent); // sort by highest spending
  }, [categories, filteredByTimeTransactions, totalOutgoing]);

  // Filter transactions of selected category
  const filteredTransactions = React.useMemo(() => {
    return filteredByTimeTransactions
      .filter(t => t.category === selectedCategory)
      .filter(t => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        return (
          t.merchant.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
        );
      });
  }, [filteredByTimeTransactions, selectedCategory, search]);

  // Sort transactions
  const sortedTransactions = React.useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'merchant') {
        comparison = a.merchant.localeCompare(b.merchant);
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'runningBalance') {
        comparison = a.runningBalance - b.runningBalance;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });
  }, [filteredTransactions, sortBy, sortDir]);

  // Paginate transactions
  const totalPages = Math.ceil(sortedTransactions.length / rowsPerPage);
  const paginatedTransactions = React.useMemo(() => {
    return sortedTransactions.slice(
      page * rowsPerPage,
      (page + 1) * rowsPerPage
    );
  }, [sortedTransactions, page, rowsPerPage]);

  const currentCategoryStats = React.useMemo(() => {
    return categoryStats.find(c => c.name === selectedCategory);
  }, [categoryStats, selectedCategory]);

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', mb: 0.25 }}>
            Transactions by Category
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
            Detailed analytics and drill-down spending grouped by category
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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

          {/* Manage Categories Button */}
          <Button
            variant="outlined"
            onClick={() => setManageOpen(true)}
            startIcon={<Plus size={16} />}
            sx={{
              borderColor: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 600,
              height: 38,
              borderRadius: '8px',
              textTransform: 'none',
              '&:hover': { borderColor: '#00d4aa', color: '#00d4aa', background: 'rgba(0, 212, 170, 0.05)' }
            }}
          >
            Manage Categories
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00d4aa' }} />
        </Box>
      ) : allTransactions.length === 0 ? (
        <Card sx={{ background: 'rgba(22,30,46,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            <Wallet size={48} style={{ opacity: 0.3, color: '#00d4aa' }} />
            <Typography variant="h6" sx={{ color: 'white' }}>No transaction records found</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Please upload a statement on the dashboard to get started.</Typography>
          </Box>
        </Card>
      ) : (
        <Box>
          {/* Categories Grid */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {categoryStats.map(cat => {
              const chipStyle = getCategoryChipStyle(cat.name);
              const isSelected = selectedCategory === cat.name;
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={cat.name}>
                  <Card
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setPage(0);
                    }}
                    sx={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(22,30,46,0.95)' : 'rgba(22,30,46,0.7)',
                      border: isSelected ? `2px solid ${chipStyle.raw}` : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '16px',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 20px -5px ${chipStyle.raw}30`,
                        borderColor: isSelected ? chipStyle.raw : 'rgba(255,255,255,0.15)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{
                          p: 1,
                          borderRadius: '10px',
                          background: chipStyle.bg,
                          color: chipStyle.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getCategoryIcon(cat.name)}
                        </Box>
                        <Chip
                          label={`${cat.count} txs`}
                          size="small"
                          sx={{
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: 600,
                            fontSize: '0.72rem'
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '1rem', mb: 0.5 }}>
                        {cat.name}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, color: cat.spent > 0 ? '#ff416c' : 'rgba(255,255,255,0.85)', fontSize: '1.2rem' }}>
                          £{cat.spent.toFixed(2)}
                        </Typography>
                        {cat.received > 0 && (
                          <Typography sx={{ color: '#00d4aa', fontSize: '0.8rem', fontWeight: 600 }}>
                            +£{cat.received.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={cat.pctOfTotal}
                          sx={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.04)',
                            '& .MuiLinearProgress-bar': {
                              background: chipStyle.raw,
                              borderRadius: 2
                            }
                          }}
                        />
                        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', minWidth: 28, textAlign: 'right' }}>
                          {cat.pctOfTotal.toFixed(0)}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Drill-down transactions table */}
          {selectedCategory && (
            <Card sx={{ background: 'rgba(22,30,46,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px' }}>
              {/* Card Toolbar */}
              <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Box>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', mb: 0.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ color: getCategoryChipStyle(selectedCategory).raw }}>●</span> {selectedCategory} Transactions
                  </Typography>
                  {currentCategoryStats && (
                    <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                      Total category spending: £{currentCategoryStats.spent.toFixed(2)} across {currentCategoryStats.count} items
                    </Typography>
                  )}
                </Box>

                {/* Local search in category */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.5,
                    width: 250,
                    '&:focus-within': { borderColor: '#00d4aa' },
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Search size={15} style={{ color: 'rgba(255,255,255,0.4)', marginRight: 8, flexShrink: 0 }} />
                  <InputBase
                    placeholder="Search in category"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    fullWidth
                    sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}
                  />
                </Box>
              </Box>

              {/* Transactions list */}
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ background: 'rgba(255,255,255,0.02)', height: 48 }}>
                      {[
                        { label: 'Date', field: 'date' },
                        { label: 'Description', field: 'description' },
                        { label: 'Merchant', field: 'merchant' },
                        { label: 'Category', field: 'category' },
                        { label: 'Amount', field: 'amount', align: 'right' },
                        { label: 'Type', field: 'transactionType' },
                        { label: 'Balance', field: 'runningBalance', align: 'right' },
                      ].map(col => (
                        <TableCell
                          key={col.field}
                          align={col.align as any || 'left'}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: 'rgba(255,255,255,0.85)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer',
                            py: 1.5,
                            userSelect: 'none',
                            '&:hover': { color: '#00d4aa' }
                          }}
                          onClick={() => {
                            if (sortBy === col.field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                            else { setSortBy(col.field); setSortDir('desc'); }
                            setPage(0);
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                            {col.label}
                            {sortBy === col.field && <ArrowUpDown size={13} style={{ color: '#00d4aa' }} />}
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 8, color: 'rgba(255,255,255,0.3)', borderBottom: 'none' }}>
                          No transactions match your search filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((tx) => {
                        const chipStyle = getCategoryChipStyle(tx.category);
                        return (
                          <TableRow
                            key={tx.id}
                            sx={{
                              height: 56,
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              transition: 'background 0.15s',
                              '&:hover': {
                                background: 'rgba(255,255,255,0.02)'
                              }
                            }}
                          >
                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', borderBottom: 'none', py: 1 }}>
                              {tx.date}
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: 'none', py: 1 }}>
                              {tx.description}
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 600, borderBottom: 'none', py: 1 }}>
                              {tx.merchant}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', py: 1 }}>
                              <Select
                                value={tx.category}
                                onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                                variant="standard"
                                disableUnderline
                                renderValue={(val) => (
                                  <Box sx={{
                                    px: 1.5,
                                    py: 0.4,
                                    borderRadius: '20px',
                                    background: chipStyle.bg,
                                    color: chipStyle.text,
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    display: 'inline-block',
                                    cursor: 'pointer',
                                  }}>
                                    {val}
                                  </Box>
                                )}
                                sx={{ '& .MuiSelect-select': { p: 0 } }}
                              >
                                {categories.map(cat => (
                                  <MenuItem key={cat.toString()} value={cat.toString()} sx={{ fontSize: '0.85rem' }}>{cat}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell align="right" sx={{
                              fontWeight: 700,
                              color: tx.amount < 0 ? '#ef4444' : '#00d4aa',
                              fontSize: '0.875rem',
                              borderBottom: 'none',
                              py: 1,
                            }}>
                              {tx.amount < 0 ? '-' : '+'}£{Math.abs(tx.amount).toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', py: 1 }}>
                              <Box sx={{
                                display: 'inline-block',
                                px: 1.5,
                                py: 0.4,
                                borderRadius: '6px',
                                background: tx.transactionType === 'CREDIT' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                                color: tx.transactionType === 'CREDIT' ? '#10b981' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}>
                                {tx.transactionType}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', borderBottom: 'none', py: 1 }}>
                              £{tx.runningBalance?.toFixed(2) || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <Stack spacing={1}>
                    <Pagination
                      count={totalPages}
                      page={page + 1}
                      onChange={(e, val) => setPage(val - 1)}
                      sx={{
                        '& .MuiPaginationItem-root': {
                          color: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          '&.Mui-selected': {
                            background: '#00d4aa',
                            color: '#0d1117',
                            borderColor: '#00d4aa',
                            fontWeight: 700,
                          },
                          '&:hover': { background: 'rgba(255,255,255,0.06)' }
                        }
                      }}
                    />
                  </Stack>
                </Box>
              )}
            </Card>
          )}
        </Box>
      )}

      {/* Category Management Dialog */}
      <Dialog
        open={manageOpen}
        onClose={() => { setManageOpen(false); setCreateError(''); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'white' }}>Manage Categories</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {createError && <Typography color="error" variant="caption" sx={{ display: 'block', mb: 2 }}>{createError}</Typography>}
          
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              size="small"
              placeholder="New Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              fullWidth
              sx={{
                input: { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
                }
              }}
            />
            <Button
              onClick={handleCreateCategory}
              variant="contained"
              sx={{ background: '#00d4aa', fontWeight: 700, '&:hover': { background: '#00b894' } }}
            >
              Add
            </Button>
          </Box>
          
          <Typography sx={{ fontWeight: 700, color: 'white', mb: 1, fontSize: '0.9rem' }}>Existing Categories</Typography>
          <List sx={{ maxHeight: 250, overflowY: 'auto', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px', p: 1 }}>
            {categories.map((cat, i) => (
              <ListItem key={i} sx={{ py: 0.5, borderBottom: i < categories.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <ListItemText primary={cat} primaryTypographyProps={{ sx: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' } }} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setManageOpen(false); setCreateError(''); }} variant="contained" sx={{ background: '#00d4aa', color: '#0d1117', fontWeight: 700, '&:hover': { background: '#00b894' } }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionsByCategory;
