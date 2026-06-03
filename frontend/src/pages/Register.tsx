import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Alert, Link as MuiLink,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STANDARD_USER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-gradient)'
    }}>
      <Card className="glass-panel" sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom align="center" sx={{ 
            fontWeight: 800,
            background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Register to start organizing your finance with AI
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>Registration successful! Redirecting to login...</Alert>}

          <form onSubmit={handleRegister}>
            <TextField
              label="Full Name"
              type="text"
              fullWidth
              required
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="role-label">System Role</InputLabel>
              <Select
                labelId="role-label"
                value={role}
                label="System Role"
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="STANDARD_USER">Standard User</MenuItem>
                <MenuItem value="ADMINISTRATOR">Administrator</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              color="primary"
              size="large"
              disabled={loading || success}
              sx={{ py: 1.5, fontWeight: 700 }}
            >
              {loading ? 'Creating...' : 'Register Account'}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login" color="primary" sx={{ fontWeight: 600 }}>
                Log in here
              </MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
