import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, IconButton, InputBase, CircularProgress, Avatar, Alert
} from '@mui/material';
import { Send, Paperclip, Mic, MoreHorizontal } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  "How much did I spend on groceries last month?",
  "What are my top spending categories?",
  "List my current monthly subscriptions",
  "Which merchants did I spend the most at?",
  "What's my average monthly spending?",
];

const getTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token') || '';
  const apiKey = localStorage.getItem('gemini_api_key') || '';
  const userName = localStorage.getItem('user_name') || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: getTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/statement/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey
        },
        body: JSON.stringify({ message: text, history: messages })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: getTime() }]);
      } else {
        throw new Error(data.message || 'AI response failed');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Failed to connect to AI assistant.'}`,
        timestamp: getTime()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', maxHeight: 800 }}>
      {/* Chat Container */}
      <Box sx={{
        flex: 1,
        background: 'rgba(16, 22, 36, 0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Chat Header */}
        <Box sx={{
          p: 2.5,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(22,30,46,0.8)',
        }}>
          {/* Nova avatar */}
          <Box sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4aa 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'white',
            boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)',
            flexShrink: 0,
          }}>
            N
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '1rem', letterSpacing: 0.2 }}>
              Nova: AI Financial Assistant
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Online</Typography>
            </Box>
          </Box>
          <IconButton sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}>
            <MoreHorizontal size={20} />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 3 },
        }}>
          {messages.length === 0 && (
            <Box sx={{ my: 'auto', textAlign: 'center', py: 4 }}>
              {/* Nova intro */}
              <Box sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: 'white',
                boxShadow: '0 0 40px rgba(0,212,170,0.25)',
              }}>
                N
              </Box>
              <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '1.2rem', mb: 0.5 }}>
                Hi, I'm Nova!
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', mb: 3, maxWidth: 380, mx: 'auto' }}>
                Your AI-powered financial assistant. Ask me anything about your spending, transactions, or financial goals.
              </Typography>

              {!apiKey && (
                <Alert severity="warning" sx={{ mb: 3, maxWidth: 400, mx: 'auto', textAlign: 'left', fontSize: '0.8rem' }}>
                  Configure your Gemini API key to activate AI chat.
                </Alert>
              )}

              {/* Suggested queries */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 420, mx: 'auto' }}>
                {SUGGESTED_QUERIES.map((q, i) => (
                  <Box
                    key={i}
                    onClick={() => sendMessage(q)}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      '&:hover': {
                        border: '1px solid rgba(0,212,170,0.3)',
                        background: 'rgba(0,212,170,0.05)',
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{q}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              {msg.role === 'assistant' ? (
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: 'white',
                  flexShrink: 0,
                }}>
                  N
                </Box>
              ) : (
                <Avatar sx={{
                  width: 36,
                  height: 36,
                  background: 'rgba(255,255,255,0.15)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {userInitials}
                </Avatar>
              )}

              <Box sx={{ maxWidth: '72%' }}>
                {msg.role === 'assistant' && (
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#00d4aa', mb: 0.5 }}>
                    Nova AI
                  </Typography>
                )}
                <Box sx={{
                  p: 2,
                  borderRadius: msg.role === 'user'
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'rgba(255,255,255,0.1)'
                    : 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(124,58,237,0.08))',
                  border: msg.role === 'user'
                    ? '1px solid rgba(255,255,255,0.12)'
                    : '1px solid rgba(0,212,170,0.2)',
                }}>
                  <Typography sx={{
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                  }}>
                    {msg.content}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', mt: 0.5, px: 0.5 }}>
                  {msg.timestamp}
                </Typography>
              </Box>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem', color: 'white', flexShrink: 0,
              }}>
                N
              </Box>
              <Box sx={{
                p: 2, borderRadius: '18px 18px 18px 4px',
                background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(124,58,237,0.05))',
                border: '1px solid rgba(0,212,170,0.15)',
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <CircularProgress size={14} sx={{ color: '#00d4aa' }} />
                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Nova is thinking...</Typography>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{
          p: 2.5,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(16,22,36,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            px: 2,
            py: 0.75,
            '&:focus-within': { borderColor: 'rgba(0,212,170,0.4)', background: 'rgba(255,255,255,0.07)' },
            transition: 'all 0.2s',
          }}>
            <InputBase
              placeholder="Message Nova..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              fullWidth
              disabled={loading || !apiKey}
              sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', '& input::placeholder': { color: 'rgba(255,255,255,0.35)' } }}
            />
          </Box>

          <IconButton sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
            <Paperclip size={18} />
          </IconButton>
          <IconButton sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
            <Mic size={18} />
          </IconButton>

          <IconButton
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || !apiKey}
            sx={{
              background: input.trim() && !loading && apiKey
                ? 'linear-gradient(135deg, #00d4aa, #009980)'
                : 'rgba(255,255,255,0.08)',
              color: input.trim() && !loading && apiKey ? 'white' : 'rgba(255,255,255,0.3)',
              borderRadius: '10px',
              p: 1.2,
              transition: 'all 0.2s',
              '&:hover:not(:disabled)': { background: 'linear-gradient(135deg, #00e6ba, #00b395)' },
              '&.Mui-disabled': { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }
            }}
          >
            <Send size={18} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default AIAssistant;
