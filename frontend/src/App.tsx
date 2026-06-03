import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box, Typography, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, Avatar, Tooltip,
  Divider
} from '@mui/material';
import {
  LayoutDashboard, ArrowRightLeft, FileText, Bot, Wallet, Target,
  MessageCircle, Settings, Key as KeyIcon, LogOut, ShieldAlert, ChevronLeft, ChevronRight,
  FolderOpen
} from 'lucide-react';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Statements from './pages/Statements';
import StatementsMonthly from './pages/StatementsMonthly';
import AdminPanel from './pages/AdminPanel';
import AIAssistant from './pages/AIAssistant';
import BudgetGoals from './pages/BudgetGoals';
import TransactionsByCategory from './pages/TransactionsByCategory';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4aa',
    },
    secondary: {
      main: '#7c3aed',
    },
    background: {
      default: '#0d1117',
      paper: 'rgba(22, 30, 46, 0.8)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Outfit", sans-serif',
    h1: { fontWeight: 800 },
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(16px)',
        },
      },
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const SIDEBAR_ITEMS = [
  { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { text: 'Transactions', icon: <ArrowRightLeft size={20} />, path: '/transactions' },
  { text: 'Category View', icon: <FolderOpen size={20} />, path: '/transactions-by-category' },
  { text: 'Statements', icon: <FileText size={20} />, path: '/statements' },
  { text: 'AI Assistant', icon: <Bot size={20} />, path: '/ai-assistant' },
  { text: 'Budget & Goals', icon: <Wallet size={20} />, path: '/budget-goals' },
];

const SIDEBAR_BOTTOM = [
  { text: 'Support', icon: <MessageCircle size={20} />, path: '/support' },
  { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

const NavigationLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('gemini_api_key') || '');
  const navigate = useNavigate();
  const location = useLocation();

  const userName = localStorage.getItem('user_name') || 'User';
  const userRole = localStorage.getItem('user_role') || 'STANDARD_USER';
  const hasApiKey = !!localStorage.getItem('gemini_api_key');
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKeyInput);
    setApiKeyModalOpen(false);
    window.location.reload();
  };

  const allMenuItems = [...SIDEBAR_ITEMS];
  if (userRole === 'ADMINISTRATOR') {
    allMenuItems.push({ text: 'Admin Panel', icon: <ShieldAlert size={20} />, path: '/admin' });
  }

  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0d1117' }}>
      {/* Left Sidebar */}
      <Box sx={{
        width: sidebarWidth,
        minHeight: '100vh',
        background: 'rgba(16, 22, 36, 0.97)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <Box sx={{
          p: collapsed ? 1.5 : 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: 72,
        }}>
          <Box sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)',
          }}>
            AI
          </Box>
          {!collapsed && (
            <Typography sx={{
              fontWeight: 800,
              fontSize: '0.95rem',
              background: 'linear-gradient(90deg, #00d4aa, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
            }}>
              Banking AI Agent
            </Typography>
          )}
        </Box>

        {/* Main Nav Items */}
        <Box sx={{ flex: 1, py: 2, overflowY: 'auto', overflowX: 'hidden' }}>
          {allMenuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === '/transactions' && location.pathname === '/statements' && false);
            return (
              <Tooltip key={item.text} title={collapsed ? item.text : ''} placement="right">
                <Box
                  component={Link}
                  to={item.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: collapsed ? 1.5 : 2.5,
                    py: 1.4,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: isActive ? '#00d4aa' : 'rgba(255,255,255,0.6)',
                    background: isActive ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid #00d4aa' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.9)',
                    },
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                >
                  <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                  {!collapsed && (
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {item.text}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}

          <Divider sx={{ my: 2, mx: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

          {SIDEBAR_BOTTOM.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.text} title={collapsed ? item.text : ''} placement="right">
                <Box
                  component={Link}
                  to={item.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: collapsed ? 1.5 : 2.5,
                    py: 1.4,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: isActive ? '#00d4aa' : 'rgba(255,255,255,0.5)',
                    background: isActive ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.8)',
                    },
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                >
                  <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                  {!collapsed && (
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {item.text}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Collapse toggle */}
        <Box sx={{
          p: 1.5,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#00d4aa', background: 'rgba(0,212,170,0.08)' } }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </IconButton>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ marginLeft: `${sidebarWidth}px`, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>
        {/* Top Header Bar */}
        <Box sx={{
          height: 64,
          background: 'rgba(13, 17, 23, 0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <Box>
            <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
              Welcome back,
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>
              {userName} 👋
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={hasApiKey ? 'Gemini Key Configured' : 'Configure Gemini API Key'}>
              <IconButton
                onClick={() => setApiKeyModalOpen(true)}
                sx={{
                  color: hasApiKey ? '#00d4aa' : '#f59e0b',
                  background: hasApiKey ? 'rgba(0, 212, 170, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${hasApiKey ? 'rgba(0, 212, 170, 0.2)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: '8px',
                  p: 1,
                  '&:hover': { background: hasApiKey ? 'rgba(0, 212, 170, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
                }}
              >
                <KeyIcon size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Logout">
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  p: 1,
                  '&:hover': { color: '#ff416c', background: 'rgba(255, 65, 108, 0.08)', borderColor: 'rgba(255,65,108,0.2)' }
                }}
              >
                <LogOut size={18} />
              </IconButton>
            </Tooltip>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
              <Avatar sx={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}>
                {userInitials}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{userName}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  {userRole === 'ADMINISTRATOR' ? 'Administrator' : 'Standard User'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Page Content */}
        <Box component="main" sx={{ flex: 1, p: 3, background: '#0d1117' }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Statements />} />
            <Route path="/transactions-by-category" element={<TransactionsByCategory />} />
            <Route path="/statements" element={<StatementsMonthly />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/budget-goals" element={<BudgetGoals />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/support" element={<Box sx={{ color: 'white', p: 3 }}><Typography variant="h4" fontWeight={700}>Support</Typography><Typography color="text.secondary" mt={1}>Contact support coming soon.</Typography></Box>} />
            <Route path="/settings" element={<Box sx={{ color: 'white', p: 3 }}><Typography variant="h4" fontWeight={700}>Settings</Typography><Typography color="text.secondary" mt={1}>Settings panel coming soon.</Typography></Box>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>
      </Box>

      {/* API Key Modal */}
      <Dialog open={apiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Gemini API Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide your Google Gemini API Key. Stored locally in your browser for AI features.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Gemini API Key"
            type="password"
            fullWidth
            variant="outlined"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApiKeyModalOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveApiKey} variant="contained" color="primary">Save Configuration</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <NavigationLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
