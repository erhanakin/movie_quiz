// src/components/NicknameSetup.js
import React, { useState } from 'react';
import { EmojiEvents as Trophy } from '@mui/icons-material';
import { Box, Typography, TextField, Button, Alert, Paper } from '@mui/material';
import leaderboardService from '../utils/leaderboardService';

const NicknameSetup = ({ onNicknameSet }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    if (nickname.length < 3) {
      setError('Nickname must be at least 3 characters long');
      return;
    }
    
    if (nickname.length > 20) {
      setError('Nickname must be less than 20 characters');
      return;
    }

    // Check for inappropriate words (basic filter)
    const banned = ['admin', 'bot', 'system', 'null', 'undefined', 'test'];
    if (banned.some(word => nickname.toLowerCase().includes(word))) {
      setError('This nickname is not allowed');
      return;
    }

    setIsChecking(true);
    
    try {
      const exists = await leaderboardService.checkNicknameExists(nickname);
      if (exists) {
        setError('This nickname is already taken. Please choose another one.');
      } else {
        // Save nickname and continue
        leaderboardService.savePlayerNickname(nickname);
        onNicknameSet(nickname);
      }
    } catch (err) {
      console.error('Error checking nickname:', err);
      setError('Error checking nickname. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        p: 2
      }}
    >
      <Paper
        elevation={6}
        sx={{
          maxWidth: 400,
          width: '100%',
          p: 4,
          background: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 3
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Trophy sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
          <Typography variant="h4" sx={{ color: '#e2e8f0', fontWeight: 'bold', mb: 1 }}>
            Join the Leaderboard!
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8' }}>
            Choose a unique nickname to compete with other movie quiz champions
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#e2e8f0', mb: 1 }}>
            Choose Your Nickname
          </Typography>
          <TextField
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter nickname..."
            disabled={isChecking}
            inputProps={{ maxLength: 20 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(51, 65, 85, 0.8)',
                color: '#e2e8f0',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(16, 185, 129, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#10b981' }
              },
              '& .MuiInputBase-input::placeholder': { color: '#94a3b8' }
            }}
          />
          <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
            3-20 characters, must be unique
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={!nickname.trim() || isChecking}
          sx={{
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            '&:hover': {
              background: 'linear-gradient(135deg, #059669, #2563eb)'
            },
            '&:disabled': {
              background: 'rgba(107, 114, 128, 0.5)'
            }
          }}
        >
          {isChecking ? 'Checking availability...' : 'Join Leaderboard'}
        </Button>

        <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center', display: 'block', mt: 2 }}>
          We only store your nickname - no personal information required!
        </Typography>
      </Paper>
    </Box>
  );
};

export default NicknameSetup;