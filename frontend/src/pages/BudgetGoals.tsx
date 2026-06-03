import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, IconButton, Alert
} from '@mui/material';
import {
  Plus, Trash2, ShoppingCart, Utensils, ShoppingBag, ShieldCheck,
  Home, Plane, Target, MoreHorizontal, TrendingUp, CheckCircle2,
  CreditCard, Wallet
} from 'lucide-react';

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
}

interface Goal {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyNeed?: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Groceries: <ShoppingCart size={18} />,
  Dining: <Utensils size={18} />,
  Shopping: <ShoppingBag size={18} />,
  Insurance: <ShieldCheck size={18} />,
  Utilities: <TrendingUp size={18} />,
  Mortgage: <Home size={18} />,
  'Credit Card': <CreditCard size={18} />,
  Loans: <Wallet size={18} />,
  Gambling: <Target size={18} />,
};

const GOAL_ICONS: Record<string, React.ReactNode> = {
  'Emergency Fund': <ShieldCheck size={20} />,
  'Home Deposit': <Home size={20} />,
  Vacation: <Plane size={20} />,
  Default: <Target size={20} />,
};

const getBudgetColor = (pct: number) => {
  if (pct >= 95) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#00d4aa';
};

const GOAL_COLORS = ['#00d4aa', '#3b82f6', '#10b981', '#f59e0b', '#7c3aed', '#ec4899'];

// Circular progress component
const CircularProgressIndicator: React.FC<{ value: number; size?: number; color: string }> = ({
  value, size = 80, color
}) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>
          {Math.round(Math.min(value, 100))}%
        </Typography>
      </Box>
    </Box>
  );
};

const BudgetGoals: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');

  const token = localStorage.getItem('token') || '';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, gRes, tRes] = await Promise.all([
        fetch('/api/statement/budget', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/statement/goals', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/statement/transactions?size=500', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (bRes.ok) setBudgets(await bRes.json());
      if (gRes.ok) setGoals(await gRes.json());
      if (tRes.ok) {
        const txData = await tRes.json();
        const content = txData.content || [];
        // Calculate category spending
        const catSpend: Record<string, number> = {};
        content.forEach((t: any) => {
          if (t.amount < 0) {
            catSpend[t.category] = (catSpend[t.category] || 0) + Math.abs(t.amount);
          }
        });
        setChartData(Object.keys(catSpend).map(cat => ({ name: cat, value: catSpend[cat] })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getCategorySpent = (category: string) => {
    const item = chartData.find(c => c.name.toLowerCase() === category.toLowerCase());
    return item ? item.value : 0;
  };

  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + getCategorySpent(b.category), 0);
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const handleAddBudget = async () => {
    if (!newBudgetCategory || !newBudgetLimit) return;
    try {
      const res = await fetch('/api/statement/budget', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newBudgetCategory, limit: parseFloat(newBudgetLimit) })
      });
      if (res.ok) {
        setBudgetModalOpen(false);
        setNewBudgetCategory('');
        setNewBudgetLimit('');
        fetchData();
      }
    } catch (err) {}
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const res = await fetch(`/api/statement/budget/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  const handleAddGoal = async () => {
    if (!newGoalName || !newGoalTarget || !newGoalCurrent) return;
    try {
      const res = await fetch('/api/statement/goals', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoalName,
          targetAmount: parseFloat(newGoalTarget),
          currentAmount: parseFloat(newGoalCurrent),
        })
      });
      if (res.ok) {
        setGoalModalOpen(false);
        setNewGoalName('');
        setNewGoalTarget('');
        setNewGoalCurrent('');
        setNewGoalDate('');
        fetchData();
      }
    } catch (err) {}
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/statement/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = now.getFullYear();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#00d4aa' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
            {monthName} BUDGET
          </Typography>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>Overview</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{now.toLocaleString('default', { month: 'long' })} {year}</Typography>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Budget & Goals</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Budget Tracker */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(16,22,36,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '1.1rem', letterSpacing: 0.5 }}>
                  BUDGET TRACKER
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}>
                    <MoreHorizontal size={18} />
                  </IconButton>
                </Box>
              </Box>

              {budgets.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', mb: 0.5 }}>
                    Active monthly spending
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(totalPct, 100)}
                      sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, #00d4aa, ${totalPct >= 80 ? '#ef4444' : '#00d4aa'})`,
                          borderRadius: 3,
                        }
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                    Total Spent: £{totalSpent.toFixed(0)} / £{totalBudget.toFixed(0)} | {totalPct.toFixed(0)}%
                  </Typography>
                </Box>
              )}

              {budgets.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', mb: 2, fontSize: '0.875rem' }}>
                    No budgets set up yet. Add a budget to track your spending.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Plus size={16} />}
                    onClick={() => setBudgetModalOpen(true)}
                    sx={{ borderColor: 'rgba(0,212,170,0.3)', color: '#00d4aa', '&:hover': { borderColor: '#00d4aa', background: 'rgba(0,212,170,0.05)' } }}
                  >
                    Add Budget
                  </Button>
                </Box>
              ) : (
                <Box>
                  {budgets.map(b => {
                    const spent = getCategorySpent(b.category);
                    const pct = Math.min((spent / b.monthlyLimit) * 100, 100);
                    const color = getBudgetColor(pct);
                    const icon = CATEGORY_ICONS[b.category];
                    return (
                      <Box
                        key={b.id}
                        sx={{
                          mb: 2,
                          p: 2,
                          borderRadius: '12px',
                          border: `1px solid ${color}25`,
                          background: `linear-gradient(135deg, ${color}08, ${color}03)`,
                          position: 'relative',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                              width: 34, height: 34, borderRadius: '8px',
                              background: `${color}18`,
                              color: color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {icon || <TrendingUp size={16} />}
                            </Box>
                            <Typography sx={{ fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.9rem' }}>
                              {b.category}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 800, color, fontSize: '1rem' }}>
                              {pct.toFixed(0)}%
                            </Typography>
                            <IconButton size="small" onClick={() => handleDeleteBudget(b.id)}
                              sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: '#ef4444' }, p: 0.5 }}>
                              <Trash2 size={14} />
                            </IconButton>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                            Limit: £{b.monthlyLimit.toFixed(0)}
                          </Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                            Used: £{spent.toFixed(0)} &nbsp;<span style={{ color }}>{pct.toFixed(0)}%</span>
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 7, borderRadius: 4,
                            bgcolor: 'rgba(255,255,255,0.06)',
                            '& .MuiLinearProgress-bar': { background: color, borderRadius: 4 }
                          }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                            £{spent.toFixed(0)} spent
                          </Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                            £{Math.max(b.monthlyLimit - spent, 0).toFixed(0)} left
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Plus size={15} />}
                    onClick={() => setBudgetModalOpen(true)}
                    sx={{
                      mt: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                      borderRadius: '10px', py: 1,
                      '&:hover': { borderColor: '#00d4aa', color: '#00d4aa', background: 'rgba(0,212,170,0.04)' }
                    }}
                  >
                    Add Budget Category
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Goals */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(16,22,36,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '1.1rem', letterSpacing: 0.5 }}>
                  FINANCIAL GOALS
                </Typography>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}>
                  <MoreHorizontal size={18} />
                </IconButton>
              </Box>

              {goals.length > 0 && (
                <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                  Active Goals ({goals.length})
                </Typography>
              )}

              {goals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', mb: 2, fontSize: '0.875rem' }}>
                    No financial goals yet. Create your first goal!
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Plus size={16} />}
                    onClick={() => setGoalModalOpen(true)}
                    sx={{ borderColor: 'rgba(0,212,170,0.3)', color: '#00d4aa', '&:hover': { borderColor: '#00d4aa', background: 'rgba(0,212,170,0.05)' } }}
                  >
                    Create Goal
                  </Button>
                </Box>
              ) : (
                <Box>
                  {goals.map((g, idx) => {
                    const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                    const color = GOAL_COLORS[idx % GOAL_COLORS.length];
                    const isComplete = g.currentAmount >= g.targetAmount;
                    const icon = GOAL_ICONS[g.name] || GOAL_ICONS.Default;

                    return (
                      <Box
                        key={g.id}
                        sx={{
                          mb: 2,
                          p: 2,
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.07)',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                          position: 'relative',
                        }}
                      >
                        <CircularProgressIndicator value={pct} size={76} color={color} />

                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '0.875rem', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                                {g.name}
                              </Typography>
                              {isComplete && <CheckCircle2 size={15} style={{ color: '#00d4aa' }} />}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{
                                width: 26, height: 26, borderRadius: '8px',
                                background: `${color}18`, color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {icon}
                              </Box>
                              <IconButton size="small" onClick={() => handleDeleteGoal(g.id!)}
                                sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: '#ef4444' }, p: 0.5 }}>
                                <Trash2 size={13} />
                              </IconButton>
                            </Box>
                          </Box>

                          <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>
                            £{g.currentAmount.toLocaleString()}
                          </Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', mb: 1 }}>
                            saved / £{g.targetAmount.toLocaleString()}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {g.targetDate && (
                              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                                Target Date: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{g.targetDate}</strong>
                              </Typography>
                            )}
                            {g.monthlyNeed && (
                              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                                Monthly Need: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>£{g.monthlyNeed}</strong>
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Plus size={15} />}
                    onClick={() => setGoalModalOpen(true)}
                    sx={{
                      mt: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                      borderRadius: '10px', py: 1,
                      '&:hover': { borderColor: '#00d4aa', color: '#00d4aa', background: 'rgba(0,212,170,0.04)' }
                    }}
                  >
                    Add New Goal
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Budget Modal */}
      <Dialog open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'white' }}>Set Budget Limit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" label="Category Name" type="text" fullWidth variant="outlined"
            placeholder="e.g. Groceries, Dining, Shopping"
            value={newBudgetCategory} onChange={e => setNewBudgetCategory(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" label="Monthly Limit (£)" type="number" fullWidth variant="outlined"
            value={newBudgetLimit} onChange={e => setNewBudgetLimit(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBudgetModalOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAddBudget} variant="contained" sx={{ background: '#00d4aa', fontWeight: 700 }}>Save Budget</Button>
        </DialogActions>
      </Dialog>

      {/* Goal Modal */}
      <Dialog open={goalModalOpen} onClose={() => setGoalModalOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'white' }}>Create Financial Goal</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" label="Goal Name" type="text" fullWidth variant="outlined"
            placeholder="e.g. Emergency Fund, Vacation, Home Deposit"
            value={newGoalName} onChange={e => setNewGoalName(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" label="Target Amount (£)" type="number" fullWidth variant="outlined"
            value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" label="Current Saved Amount (£)" type="number" fullWidth variant="outlined"
            value={newGoalCurrent} onChange={e => setNewGoalCurrent(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" label="Target Date (optional)" type="text" fullWidth variant="outlined"
            placeholder="e.g. Dec 2024"
            value={newGoalDate} onChange={e => setNewGoalDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGoalModalOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAddGoal} variant="contained" sx={{ background: '#00d4aa', fontWeight: 700 }}>Create Goal</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BudgetGoals;
