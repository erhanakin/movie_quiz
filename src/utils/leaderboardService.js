// src/utils/leaderboardService.js
// Simple local storage implementation (we'll upgrade to Firebase later)

export class LeaderboardService {
  constructor() {
    this.storageKey = 'movieQuizLeaderboards';
    this.nicknameKey = 'movieQuizPlayerNickname';
  }

  // Check if nickname already exists
  checkNicknameExists(nickname) {
    const allData = this.getAllLeaderboardData();
    const allNicknames = new Set();
    
    // Collect all nicknames from all categories
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
  submitScore(nickname, score, category, difficulty = 'easy') {
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
  getTopScores(category, limit = 20) {
    const allData = this.getAllLeaderboardData();
    const categoryScores = allData[category] || [];
    return categoryScores.slice(0, limit);
  }

  // Get player's rank in category
  getPlayerRank(nickname, category) {
    const categoryScores = this.getTopScores(category, 100);
    const rank = categoryScores.findIndex(score => 
      score.nickname.toLowerCase() === nickname.toLowerCase()
    ) + 1;
    return rank > 0 ? rank : null;
  }

  // Get player's best score in category
  getPlayerBestScore(nickname, category) {
    const categoryScores = this.getTopScores(category, 100);
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