// src/utils/leaderboardService.js
// Hybrid service - Firebase primary, localStorage fallback

import firebaseService from './firebaseLeaderboardService';

export class LeaderboardService {
  constructor() {
    this.storageKey = 'movieQuizLeaderboards';
    this.nicknameKey = 'movieQuizPlayerNickname';
    this.useFirebase = true; // Flag to enable/disable Firebase
  }

  async initFirebase() {
    try {
      const connected = await firebaseService.isConnected();
      this.useFirebase = connected;
      console.log(`🔥 Firebase ${connected ? 'enabled' : 'disabled'} for leaderboard`);
      return connected;
    } catch (error) {
      console.warn('⚠️ Firebase initialization failed, falling back to localStorage');
      this.useFirebase = false;
      return false;
    }
  }

  // Check if nickname already exists
  async checkNicknameExists(nickname) {
    if (this.useFirebase) {
      try {
        return await firebaseService.checkNicknameExists(nickname);
      } catch (error) {
        console.warn('Firebase checkNicknameExists failed, falling back to localStorage');
      }
    }
    
    // localStorage fallback
    const allData = this.getAllLeaderboardData();
    const allNicknames = new Set();
    
    Object.values(allData).forEach(categoryScores => {
      categoryScores.forEach(score => {
        allNicknames.add(score.nickname.toLowerCase());
      });
    });
    
    return allNicknames.has(nickname.toLowerCase());
  }

  // Save player's nickname
  savePlayerNickname(nickname) {
    localStorage.setItem(this.nicknameKey, nickname);
  }

  // Get player's nickname
  getPlayerNickname() {
    return localStorage.getItem(this.nicknameKey);
  }

  // Submit score to leaderboard
  async submitScore(nickname, score, category, difficulty = 'easy') {
    if (this.useFirebase) {
      try {
        await firebaseService.submitScore(nickname, score, category, difficulty);
        console.log('✅ Score submitted to Firebase');
        return true;
      } catch (error) {
        console.warn('Firebase submitScore failed, falling back to localStorage:', error);
      }
    }
    
    // localStorage fallback
    const allData = this.getAllLeaderboardData();
    
    if (!allData[category]) {
      allData[category] = [];
    }
    
    // Add new score
    allData[category].push({
      nickname,
      score,
      difficulty,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString()
    });
    
    // Sort by score (highest first) and keep top 100
    allData[category].sort((a, b) => b.score - a.score);
    allData[category] = allData[category].slice(0, 100);
    
    // Save back to localStorage
    localStorage.setItem(this.storageKey, JSON.stringify(allData));
    
    return true;
  }

  // Get top scores for a category
  async getTopScores(category, limit = 20) {
    if (this.useFirebase) {
      try {
        const firebaseScores = await firebaseService.getTopScores(category, limit);
        if (firebaseScores.length > 0) {
          return firebaseScores;
        }
      } catch (error) {
        console.warn('Firebase getTopScores failed, falling back to localStorage');
      }
    }
    
    // localStorage fallback
    const allData = this.getAllLeaderboardData();
    const categoryScores = allData[category] || [];
    return categoryScores.slice(0, limit);
  }

  // Get player's rank in category
  async getPlayerRank(nickname, category) {
    if (this.useFirebase) {
      try {
        return await firebaseService.getPlayerRank(nickname, category);
      } catch (error) {
        console.warn('Firebase getPlayerRank failed, falling back to localStorage');
      }
    }
    
    // localStorage fallback
    const categoryScores = await this.getTopScores(category, 100);
    const rank = categoryScores.findIndex(score => 
      score.nickname.toLowerCase() === nickname.toLowerCase()
    ) + 1;
    return rank > 0 ? rank : null;
  }

  // Get player's best score in category
  async getPlayerBestScore(nickname, category) {
    if (this.useFirebase) {
      try {
        return await firebaseService.getPlayerBestScore(nickname, category);
      } catch (error) {
        console.warn('Firebase getPlayerBestScore failed, falling back to localStorage');
      }
    }
    
    // localStorage fallback
    const categoryScores = await this.getTopScores(category, 100);
    const playerScores = categoryScores.filter(score => 
      score.nickname.toLowerCase() === nickname.toLowerCase()
    );
    return playerScores.length > 0 ? Math.max(...playerScores.map(s => s.score)) : 0;
  }

  // Get all leaderboard data
  getAllLeaderboardData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : {};
  }

  // Clear all data (for testing)
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.nicknameKey);
  }
}

export default new LeaderboardService();