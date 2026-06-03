import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem, Button,
  IconButton, CircularProgress, InputBase, Menu, Chip, FormControl,
  Pagination, Stack, Accordion, AccordionSummary, AccordionDetails, Checkbox
} from '@mui/material';
import {
  Search, ArrowUpDown, ChevronDown, SlidersHorizontal,
  FileText, FileSpreadsheet, FileCheck, Filter, ArrowRightLeft
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Subscriptions: { bg: 'rgba(124,58,237,0.2)', text: '#a78bfa' },
  Income: { bg: 'rgba(16,185,129,0.2)', text: '#10b981' },
  Groceries: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  Shopping: { bg: 'rgba(236,72,153,0.2)', text: '#ec4899' },
  Dining: { bg: 'rgba(99,102,241,0.2)', text: '#818cf8' },
  Utilities: { bg: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
  Healthcare: { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' },
  Fuel: { bg: 'rgba(249,115,22,0.2)', text: '#f97316' },
  Travel: { bg: 'rgba(6,182,212,0.2)', text: '#06b6d4' },
  Entertainment: { bg: 'rgba(139,92,246,0.2)', text: '#8b5cf6' },
  Salary: { bg: 'rgba(16,185,129,0.2)', text: '#10b981' },
  Investment: { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' },
  Transfers: { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8' },
  Insurance: { bg: 'rgba(249,115,22,0.15)', text: '#fb923c' },
  Mortgage: { bg: 'rgba(234,88,12,0.2)', text: '#ea580c' },
  'Credit Card': { bg: 'rgba(225,29,72,0.2)', text: '#e11d48' },
  Loans: { bg: 'rgba(223,168,0,0.2)', text: '#dfa800' },
  Gambling: { bg: 'rgba(244,63,94,0.2)', text: '#f43f5e' },
  Miscellaneous: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' },
};

const getCategoryChipStyle = (category: string) => {
  return CATEGORY_COLORS[category] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)' };
};

const DEFAULT_CATEGORIES = [
  "Groceries", "Insurance", "Utilities", "Healthcare", "Fuel", "Shopping",
  "Entertainment", "Dining", "Travel", "Salary", "Investment", "Transfers",
  "Subscriptions", "Mortgage", "Credit Card", "Loans", "Gambling", "Miscellaneous"
];

const getMonthYearLabel = (dateStr: string) => {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  } catch (e) {
    return 'Unknown';
  }
};

const getMonthKey = (dateStr: string) => {
  if (!dateStr) return '9999-99';
  return dateStr.substring(0, 7); // yyyy-MM
};

const StatementsMonthly: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<String[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);

  // Selection for bulk action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAnchor, setBulkAnchor] = useState<null | HTMLElement>(null);

  const token = localStorage.getItem('token') || '';

  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/statement/months', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const monthsList = await res.json();
        setAvailableMonths(monthsList);
        if (monthsList.length > 0) {
          setSelectedMonth(monthsList[0].value);
        }
      }
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  };

  const fetchTransactionsForMonth = async (monthVal: string) => {
    if (!monthVal) return;
    setLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        fetch(`/api/statement/transactions?page=0&size=1000&sortBy=date&sortDir=desc&month=${monthVal}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/statement/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (txRes.ok) {
        const txData = await txRes.json();
        setAllTransactions(txData.content || []);
      }
      if (catRes.ok) {
        setCategories(await catRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchTransactionsForMonth(selectedMonth);
    } else {
      setLoading(false);
    }
  }, [selectedMonth]);

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

  const handleBulkUpdate = async (newCategory: string) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/statement/transactions/bulk-category', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, category: newCategory })
      });
      if (res.ok) {
        setAllTransactions(prev =>
          prev.map(t => selectedIds.includes(t.id) ? { ...t, category: newCategory } : t)
        );
        setSelectedIds([]);
        setBulkAnchor(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllInMonth = (monthTxs: Transaction[], checked: boolean) => {
    const monthIds = monthTxs.map(t => t.id);
    if (checked) {
      setSelectedIds(prev => [...new Set([...prev, ...monthIds])]);
    } else {
      setSelectedIds(prev => prev.filter(id => !monthIds.includes(id)));
    }
  };

  // Group transactions by month
  const monthlyGroups: Record<string, { label: string; transactions: Transaction[]; incoming: number; outgoing: number; net: number }> = {};
  
  allTransactions.forEach(t => {
    const key = getMonthKey(t.date);
    const label = getMonthYearLabel(t.date);
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = { label, transactions: [], incoming: 0, outgoing: 0, net: 0 };
    }
    monthlyGroups[key].transactions.push(t);
    if (t.amount > 0) {
      monthlyGroups[key].incoming += t.amount;
    } else {
      monthlyGroups[key].outgoing += Math.abs(t.amount);
    }
    monthlyGroups[key].net = monthlyGroups[key].incoming - monthlyGroups[key].outgoing;
  });

  const sortedMonthKeys = Object.keys(monthlyGroups).sort((a, b) => b.localeCompare(a));

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', mb: 0.25 }}>
            Monthly Statements
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
            Transactions and statements grouped by month with bulk editing controls
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Month Selector Dropdown */}
          {availableMonths.length > 0 && (
            <FormControl size="small">
              <Select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedIds([]); // clear selection when switching months
                }}
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
                {availableMonths.map(m => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Bulk Action Controls */}
          {selectedIds.length > 0 && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'rgba(0, 212, 170, 0.1)',
              border: '1px solid rgba(0, 212, 170, 0.3)',
              px: 2,
              py: 1,
              borderRadius: '10px',
              animation: 'fadeInUp 0.2s ease forwards'
            }}>
              <Typography sx={{ color: '#00d4aa', fontSize: '0.85rem', fontWeight: 700 }}>
                {selectedIds.length} selected
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={(e) => setBulkAnchor(e.currentTarget)}
                endIcon={<ChevronDown size={14} />}
                sx={{
                  background: '#00d4aa',
                  color: '#0d1117',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  '&:hover': { background: '#00b894' }
                }}
              >
                Bulk Update
              </Button>
              <Menu anchorEl={bulkAnchor} open={Boolean(bulkAnchor)} onClose={() => setBulkAnchor(null)}
                PaperProps={{ sx: { background: '#1e2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', maxHeight: 300, minWidth: 180 } }}>
                {categories.map(cat => (
                  <MenuItem key={cat.toString()} onClick={() => handleBulkUpdate(cat.toString())}
                    sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                    {cat}
                  </MenuItem>
                ))}
              </Menu>
              <Button
                size="small"
                onClick={() => setSelectedIds([])}
                sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'none' }}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00d4aa' }} />
        </Box>
      ) : allTransactions.length === 0 ? (
        <Card sx={{ background: 'rgba(22,30,46,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            <FileText size={48} style={{ opacity: 0.3, color: '#00d4aa' }} />
            <Typography variant="h6" sx={{ color: 'white' }}>No statements uploaded yet</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Upload a statement on the dashboard to view monthly aggregates.</Typography>
          </Box>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedMonthKeys.map(key => {
            const group = monthlyGroups[key];
            const allSelected = group.transactions.every(t => selectedIds.includes(t.id));
            const someSelected = group.transactions.some(t => selectedIds.includes(t.id)) && !allSelected;
            
            return (
              <Accordion
                key={key}
                defaultExpanded={sortedMonthKeys.indexOf(key) === 0}
                sx={{
                  background: 'rgba(22, 30, 46, 0.75)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px !important',
                  overflow: 'hidden',
                  '&::before': { display: 'none' }
                }}
              >
                <AccordionSummary
                  expandIcon={<ChevronDown style={{ color: 'rgba(255,255,255,0.6)' }} />}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.01)',
                    '&:hover': { background: 'rgba(255,255,255,0.03)' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '1.05rem' }}>
                        {group.label}
                      </Typography>
                      <Chip
                        label={`${group.transactions.length} items`}
                        size="small"
                        sx={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, height: 20, fontSize: '0.72rem' }}
                      />
                    </Box>

                    {/* Stats summary inline */}
                    <Box sx={{ display: 'flex', gap: 4 }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>INCOMING</Typography>
                        <Typography sx={{ fontSize: '0.85rem', color: '#00d4aa', fontWeight: 700 }}>+£{group.incoming.toFixed(2)}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>OUTGOING</Typography>
                        <Typography sx={{ fontSize: '0.85rem', color: '#ff416c', fontWeight: 700 }}>-£{group.outgoing.toFixed(2)}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>NET SAVINGS</Typography>
                        <Typography sx={{ fontSize: '0.85rem', color: group.net >= 0 ? '#00d4aa' : '#ff416c', fontWeight: 700 }}>
                          {group.net >= 0 ? '+' : '-'}£{Math.abs(group.net).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: 0, background: 'rgba(0,0,0,0.1)' }}>
                  <TableContainer>
                    <Table sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow sx={{ background: 'rgba(255,255,255,0.02)', height: 44 }}>
                          <TableCell padding="checkbox" sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <Checkbox
                              indeterminate={someSelected}
                              checked={allSelected}
                              onChange={(e) => handleSelectAllInMonth(group.transactions, e.target.checked)}
                              sx={{
                                color: 'rgba(255,255,255,0.3)',
                                '&.Mui-checked': { color: '#00d4aa' },
                                '&.MuiCheckbox-indeterminate': { color: '#00d4aa' }
                              }}
                            />
                          </TableCell>
                          {[
                            { label: 'Date', align: 'left' },
                            { label: 'Description', align: 'left' },
                            { label: 'Merchant', align: 'left' },
                            { label: 'Category', align: 'left' },
                            { label: 'Amount', align: 'right' },
                            { label: 'Type', align: 'left' },
                            { label: 'Balance', align: 'right' },
                          ].map((col, index) => (
                            <TableCell
                              key={index}
                              align={col.align as any}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.85)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                py: 1.2
                              }}
                            >
                              {col.label}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.transactions.map((tx) => {
                          const chipStyle = getCategoryChipStyle(tx.category);
                          const isSelected = selectedIds.includes(tx.id);
                          return (
                            <TableRow
                              key={tx.id}
                              sx={{
                                height: 52,
                                background: isSelected ? 'rgba(0, 212, 170, 0.03)' : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                transition: 'background 0.15s',
                                '&:hover': { background: isSelected ? 'rgba(0, 212, 170, 0.05)' : 'rgba(255,255,255,0.015)' }
                              }}
                            >
                              <TableCell padding="checkbox" sx={{ borderBottom: 'none' }}>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => handleSelectRow(tx.id)}
                                  sx={{
                                    color: 'rgba(255,255,255,0.3)',
                                    '&.Mui-checked': { color: '#00d4aa' }
                                  }}
                                />
                              </TableCell>
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
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default StatementsMonthly;
