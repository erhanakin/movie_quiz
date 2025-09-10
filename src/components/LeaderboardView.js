// src/components/LeaderboardView.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  Container
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import leaderboardService from '../utils/leaderboardService';

const LeaderboardView = ({ playerNickname, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState({});
  const [playerStats, setPlayerStats] = useState({});

  // Your 9 categories (matching your app) - UPDATED to include Ultimate Mix
  const categories = [
    { name: 'Find Co-Actor', key: 'Find Co-Actor', icon: '🤝' },
    { name: 'Chain of Co-Actors', key: 'Chain of Co-Actors', icon: '⛓️' },
    { name: 'Find Actor in Movie', key: 'Find Actor in Movie', icon: '🕵️' },
    { name: 'Find Movie of Actor', key: 'Find Movie of Actor', icon: '🎬' },
    { name: 'Movie of Director', key: 'Movie of Director', icon: '🎥' },
    { name: 'Director of Movie', key: 'Director of Movie', icon: '👨‍🎬' },
    { name: 'Oscar Winners', key: 'Oscar Winners', icon: '🏆' },
    { name: 'Movies by Keywords', key: 'Movies by Keywords', icon: '🏷️' },
    { name: 'Movies by Posters', key: 'Movies by Posters', icon: '🖼️' },
    { name: 'Ultimate Mix', key: 'Ultimate Mix', icon: '🎲' }
  ];

  useEffect(() => {
    const loadData = async () => {
      await loadLeaderboardData();
      await loadPlayerStats();
    };
    loadData();
  }, []);

  const loadLeaderboardData = async () => {
    const data = {};
    for (const category of categories) {
      try {
        data[category.key] = await leaderboardService.getTopScores(category.key, 20);
      } catch (error) {
        console.error(`Error loading leaderboard for ${category.key}:`, error);
        data[category.key] = [];
      }
    }
    setLeaderboardData(data);
  };

  const loadPlayerStats = async () => {
    const stats = {};
    for (const category of categories) {
      try {
        stats[category.key] = {
          bestScore: await leaderboardService.getPlayerBestScore(playerNickname, category.key),
          rank: await leaderboardService.getPlayerRank(playerNickname, category.key)
        };
      } catch (error) {
        console.error(`Error loading player stats for ${category.key}:`, error);
        stats[category.key] = { bestScore: 0, rank: null };
      }
    }
    setPlayerStats(stats);
  };

  const getRankIcon = (position) => {
    switch (position) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

const formatDate = (timestamp) => {
  let date;
  
  if (timestamp && timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp && typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return 'Recent';
  }
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric', 
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

  const isPlayerScore = (nickname) => {
    return nickname.toLowerCase() === playerNickname.toLowerCase();
  };

  return (
    <div className="app-background">
      <Container maxWidth="lg" sx={{ pt: 2, pb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={onBack}
            sx={{ mb: 2, color: '#10b981' }}
          >
            Back to Game
          </Button>
          
          <Typography
            variant="h3"
            className="main-title"
            sx={{ textAlign: 'center', mb: 1 }}
          >
            🏆 Leaderboards
          </Typography>
          
          <Typography
            variant="h6"
            sx={{ textAlign: 'center', color: '#94a3b8', mb: 2 }}
          >
            Welcome back, <span style={{ color: '#10b981', fontWeight: 'bold' }}>{playerNickname}</span>!
          </Typography>
        </Box>

        {/* Category Selector */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
            <Chip
              label="All Categories"
              onClick={() => setSelectedCategory('all')}
              variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
              sx={{
                backgroundColor: selectedCategory === 'all' ? '#10b981' : 'transparent',
                color: selectedCategory === 'all' ? 'white' : '#e2e8f0',
                borderColor: '#10b981',
                '&:hover': { backgroundColor: selectedCategory === 'all' ? '#059669' : 'rgba(16, 185, 129, 0.1)' }
              }}
            />
            {categories.map(category => (
              <Chip
                key={category.key}
                label={`${category.icon} ${category.name}`}
                onClick={() => setSelectedCategory(category.key)}
                variant={selectedCategory === category.key ? 'filled' : 'outlined'}
                sx={{
                  backgroundColor: selectedCategory === category.key ? '#10b981' : 'transparent',
                  color: selectedCategory === category.key ? 'white' : '#e2e8f0',
                  borderColor: '#10b981',
                  fontSize: '0.75rem',
                  '&:hover': { backgroundColor: selectedCategory === category.key ? '#059669' : 'rgba(16, 185, 129, 0.1)' }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Player Stats Overview */}
        {selectedCategory === 'all' && (
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 3,
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 2
            }}
          >
            <Typography variant="h5" sx={{ color: '#e2e8f0', mb: 2, display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1, color: '#10b981' }} />
              Your Best Scores
            </Typography>
            <Grid container spacing={2}>
              {categories.map(category => (
                <Grid item xs={12} sm={6} md={4} key={category.key}>
                  <Paper
                    sx={{
                      p: 2,
                      background: 'rgba(51, 65, 85, 0.6)',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                      {category.icon} {category.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h4" sx={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                        {playerStats[category.key]?.bestScore || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Rank: {playerStats[category.key]?.rank || 'Unranked'}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Leaderboards */}
        <Grid container spacing={3}>
          {(selectedCategory === 'all' ? categories : categories.filter(c => c.key === selectedCategory)).map(category => (
            <Grid item xs={12} md={6} lg={4} key={category.key}>
              <Paper
                elevation={6}
                sx={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                    {category.icon} {category.name}
                  </Typography>
                </Box>
                
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {(leaderboardData[category.key] || []).slice(0, 10).map((score, index) => (
                    <Box
                      key={`${score.nickname}-${score.timestamp}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderBottom: index < 9 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                        backgroundColor: isPlayerScore(score.nickname) 
                          ? 'rgba(16, 185, 129, 0.2)' 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: isPlayerScore(score.nickname) 
                            ? 'rgba(16, 185, 129, 0.3)' 
                            : 'rgba(51, 65, 85, 0.3)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" sx={{ 
                          color: index < 3 ? '#fbbf24' : '#94a3b8',
                          minWidth: 40 
                        }}>
                          {getRankIcon(index + 1)}
                        </Typography>
                        <Box>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: isPlayerScore(score.nickname) ? '#10b981' : '#e2e8f0',
                              fontWeight: isPlayerScore(score.nickname) ? 'bold' : 'normal'
                            }}
                          >
                            {score.nickname}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {formatDate(score.timestamp)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" sx={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                          {score.score}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'capitalize' }}>
                          {score.difficulty}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  
                  {(!leaderboardData[category.key] || leaderboardData[category.key].length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                      <TrophyIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                      <Typography variant="body2">No scores yet!</Typography>
                      <Typography variant="caption">Be the first to set a record!</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, color: '#64748b' }}>
          <Typography variant="body2">
            🌍 Compete with players worldwide!
          </Typography>
        </Box>
      </Container>
    </div>
  );
};

export default LeaderboardView;