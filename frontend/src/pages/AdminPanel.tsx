import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, Paper, CircularProgress, Alert, Tab, Tabs
} from '@mui/material';
import { ShieldCheck, UserCheck, ShieldAlert, Cpu, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  timestamp: string;
  details: string;
}

interface AiMetrics {
  totalRequests: number;
  totalTokensUsed: number;
  costUSD: number;
  hourlyUsage: Array<{ hour: string; requests: number; tokens: number }>;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<AiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Users
      const uRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (uRes.ok) setUsers(await uRes.json());
      else throw new Error('Unauthorized or failed to fetch users');

      // 2. Fetch Audits
      const aRes = await fetch('/api/admin/audits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aRes.ok) setAudits(await aRes.json());

      // 3. Fetch AI metrics
      const mRes = await fetch('/api/admin/ai-metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mRes.ok) setMetrics(await mRes.json());

    } catch (err: any) {
      setError(err.message || 'Error fetching administrator records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Administration Control Center</Typography>
        <Typography variant="body2" color="text.secondary">Manage user authentication roles, review system actions audits, and monitor AI tokens</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(e, val) => setActiveTab(val)} 
        sx={{ 
          mb: 4, 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '1rem', px: 3 }
        }}
      >
        <Tab label="System Audits" />
        <Tab label="User Directories" />
        <Tab label="AI Usage Metrics" />
      </Tabs>

      {/* Tab 0: Audits */}
      {activeTab === 0 && (
        <TableContainer component={Paper} className="glass-panel" sx={{ border: '1px solid var(--glass-border)' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr style={{ height: 50 }}>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>Timestamp</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>User Email</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>Action Event</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>Details</TableCell>
              </tr>
            </TableHead>
            <TableBody>
              {audits.length === 0 ? (
                <tr style={{ height: 100 }}>
                  <TableCell colSpan={4} align="center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    No audit records registered yet.
                  </TableCell>
                </tr>
              ) : (
                audits.map((a) => (
                  <tr key={a.id} style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TableCell style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                      {a.timestamp.replace('T', ' ')}
                    </TableCell>
                    <TableCell style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {a.userEmail}
                    </TableCell>
                    <TableCell style={{ color: '#9b51e0', fontSize: '0.85rem', fontWeight: 700 }}>
                      {a.action}
                    </TableCell>
                    <TableCell style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                      {a.details}
                    </TableCell>
                  </tr>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Users */}
      {activeTab === 1 && (
        <TableContainer component={Paper} className="glass-panel" sx={{ border: '1px solid var(--glass-border)' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr style={{ height: 50 }}>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>User ID</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>Name</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>Email Address</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#00f2fe' }}>Role Privilege</TableCell>
              </tr>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <tr key={u.id} style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <TableCell style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{u.id}</TableCell>
                  <TableCell style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 600 }}>{u.name}</TableCell>
                  <TableCell style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>{u.email}</TableCell>
                  <TableCell style={{ color: u.role === 'ADMINISTRATOR' ? '#ff416c' : '#00f5a0', fontSize: '0.85rem', fontWeight: 700 }}>
                    {u.role}
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: AI Metrics */}
      {activeTab === 2 && metrics && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card className="glass-panel">
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Total AI Requests</Typography>
                    <Box sx={{ p: 0.5, borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
                      <Cpu size={16} />
                    </Box>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.totalRequests}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card className="glass-panel">
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Tokens Spent</Typography>
                    <Box sx={{ p: 0.5, borderRadius: '50%', background: 'rgba(155, 81, 224, 0.1)', color: '#9b51e0' }}>
                      <Award size={16} />
                    </Box>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.totalTokensUsed.toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card className="glass-panel">
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Estimated Costs (USD)</Typography>
                    <Box sx={{ p: 0.5, borderRadius: '50%', background: 'rgba(0, 245, 160, 0.1)', color: '#00f5a0' }}>
                      <Award size={16} />
                    </Box>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#00f5a0' }}>${metrics.costUSD.toFixed(4)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* AI Usage hourly chart */}
          <Card className="glass-panel" sx={{ p: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Hourly Token Usage Breakdown</Typography>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics.hourlyUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" style={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0e121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="tokens" fill="#00f2fe" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AdminPanel;
