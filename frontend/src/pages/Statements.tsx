import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem, Button,
  IconButton, CircularProgress, InputBase, Menu, Checkbox, Chip, FormControl,
  Pagination, Stack, InputAdornment, Tooltip
} from '@mui/material';
import {
  Search, ArrowUpDown, Download, ChevronDown, SlidersHorizontal,
  FileText, FileSpreadsheet, FileCheck, Filter
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

const SORT_OPTIONS = [
  { label: 'Date (Newest)', value: 'date|desc' },
  { label: 'Date (Oldest)', value: 'date|asc' },
  { label: 'Amount (High-Low)', value: 'amount|desc' },
  { label: 'Amount (Low-High)', value: 'amount|asc' },
  { label: 'Merchant (A-Z)', value: 'merchant|asc' },
];

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

const Statements: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Selection for bulk action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAnchor, setBulkAnchor] = useState<null | HTMLElement>(null);

  // Dropdown menus
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [categoryAnchor, setCategoryAnchor] = useState<null | HTMLElement>(null);

  const token = localStorage.getItem('token') || '';

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/statement/categories', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const categoryParam = categoryFilter && categoryFilter !== 'All' ? `&category=${encodeURIComponent(categoryFilter)}` : '';
      const res = await fetch(
        `/api/statement/transactions?page=${page}&size=10&sortBy=${sortBy}&sortDir=${sortDir}${searchParam}${categoryParam}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
        // Clear selection on page change
        setSelectedIds([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => { fetchTransactions(); }, [page, sortBy, sortDir, search, categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/statement/transactions/${id}/category`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      if (res.ok) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
      }
    } catch (err) { console.error(err); }
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
        setTransactions(prev =>
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(transactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleExport = (format: string) => {
    window.open(`/api/statement/export?format=${format}`, '_blank');
    setExportAnchor(null);
  };

  const handleSortSelect = (value: string) => {
    const [field, dir] = value.split('|');
    setSortBy(field);
    setSortDir(dir);
    setSortAnchor(null);
    setPage(0);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === `${sortBy}|${sortDir}`)?.label || 'Sort options';

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', mb: 0.25 }}>
            Transactions
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
            {totalItems > 0 ? `${totalItems} transactions found` : 'Review and manage your transactions'}
          </Typography>
        </Box>

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
              Bulk Update Category
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

      {/* Transaction Table Card */}
      <Card sx={{ background: 'rgba(22,30,46,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px' }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Search */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              px: 1.5,
              py: 0.5,
              flex: '1 1 220px',
              minWidth: 180,
              '&:focus-within': { borderColor: '#00d4aa' },
              transition: 'border-color 0.2s',
            }}
          >
            <Search size={15} style={{ color: 'rgba(255,255,255,0.4)', marginRight: 8, flexShrink: 0 }} />
            <InputBase
              placeholder="Search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              fullWidth
              sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}
            />
          </Box>

          {/* Category Filter */}
          <Button
            onClick={(e) => setCategoryAnchor(e.currentTarget)}
            endIcon={<ChevronDown size={14} />}
            sx={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: categoryFilter !== 'All' ? '#00d4aa' : 'rgba(255,255,255,0.7)',
              fontWeight: 500,
              px: 2,
              py: 0.8,
              fontSize: '0.85rem',
              textTransform: 'none',
              '&:hover': { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            {categoryFilter === 'All' ? 'Category filter' : categoryFilter}
          </Button>
          <Menu anchorEl={categoryAnchor} open={Boolean(categoryAnchor)} onClose={() => setCategoryAnchor(null)}
            PaperProps={{ sx: { background: '#1e2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', minWidth: 180 } }}>
            {['All', ...categories].map(cat => (
              <MenuItem key={cat} onClick={() => { setCategoryFilter(cat); setCategoryAnchor(null); setPage(0); }}
                sx={{ fontSize: '0.85rem', color: categoryFilter === cat ? '#00d4aa' : 'rgba(255,255,255,0.8)', fontWeight: categoryFilter === cat ? 700 : 400 }}>
                {cat}
              </MenuItem>
            ))}
          </Menu>

          {/* Sort Options */}
          <Button
            onClick={(e) => setSortAnchor(e.currentTarget)}
            endIcon={<ChevronDown size={14} />}
            sx={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
              px: 2,
              py: 0.8,
              fontSize: '0.85rem',
              textTransform: 'none',
              '&:hover': { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            {currentSortLabel}
          </Button>
          <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}
            PaperProps={{ sx: { background: '#1e2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', minWidth: 200 } }}>
            {SORT_OPTIONS.map(opt => (
              <MenuItem key={opt.value} onClick={() => handleSortSelect(opt.value)}
                sx={{ fontSize: '0.85rem', color: `${sortBy}|${sortDir}` === opt.value ? '#00d4aa' : 'rgba(255,255,255,0.8)', fontWeight: `${sortBy}|${sortDir}` === opt.value ? 700 : 400 }}>
                {opt.label}
              </MenuItem>
            ))}
          </Menu>

          {/* Export Button */}
          <Button
            onClick={(e) => setExportAnchor(e.currentTarget)}
            startIcon={<Download size={15} />}
            endIcon={<ChevronDown size={14} />}
            sx={{
              background: 'rgba(0,212,170,0.1)',
              border: '1px solid rgba(0,212,170,0.2)',
              borderRadius: '8px',
              color: '#00d4aa',
              fontWeight: 600,
              px: 2,
              py: 0.8,
              fontSize: '0.85rem',
              textTransform: 'none',
              '&:hover': { background: 'rgba(0,212,170,0.18)', borderColor: 'rgba(0,212,170,0.4)' }
            }}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}
            PaperProps={{ sx: { background: '#1e2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', minWidth: 130 } }}>
            <MenuItem onClick={() => handleExport('pdf')}
              sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', gap: 1.5, py: 1.2 }}>
              <FileCheck size={15} /> PDF
            </MenuItem>
            <MenuItem onClick={() => handleExport('csv')}
              sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', gap: 1.5, py: 1.2 }}>
              <FileText size={15} /> CSV
            </MenuItem>
            <MenuItem onClick={() => handleExport('xlsx')}
              sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', gap: 1.5, py: 1.2 }}>
              <FileSpreadsheet size={15} /> Excel
            </MenuItem>
          </Menu>
        </Box>

        {/* Table */}
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#00d4aa' }} />
            </Box>
          ) : (
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255,255,255,0.02)', height: 48 }}>
                  <TableCell padding="checkbox" sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Checkbox
                      indeterminate={selectedIds.length > 0 && selectedIds.length < transactions.length}
                      checked={transactions.length > 0 && selectedIds.length === transactions.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      sx={{
                        color: 'rgba(255,255,255,0.3)',
                        '&.Mui-checked': { color: '#00d4aa' },
                        '&.MuiCheckbox-indeterminate': { color: '#00d4aa' }
                      }}
                    />
                  </TableCell>
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
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8, color: 'rgba(255,255,255,0.3)', borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <FileText size={40} style={{ opacity: 0.3 }} />
                        <Typography variant="body2">No transactions found. Upload a statement to get started.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx, idx) => {
                    const chipStyle = getCategoryChipStyle(tx.category);
                    const isSelected = selectedIds.includes(tx.id);
                    return (
                      <TableRow
                        key={tx.id}
                        sx={{
                          height: 56,
                          background: isSelected ? 'rgba(0, 212, 170, 0.03)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.15s',
                          '&:hover': {
                            background: isSelected ? 'rgba(0, 212, 170, 0.05)' : 'rgba(255,255,255,0.02)',
                          }
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
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Pagination */}
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
    </Box>
  );
};

export default Statements;
