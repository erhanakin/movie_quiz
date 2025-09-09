// src/utils/globalLeaderboardService.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from './firebase';

export class GlobalLeaderboardService {
  constructor() {
    this.collectionName = 'leaderboard';
    this.nicknameCollection = 'nicknames';
    this.isOnline = navigator.onLine;
    this.pendingScores = this.getPendingScores();
    
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingScores();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Check if nickname exists (Firebase + local backup)
  async checkNicknameExists(nickname) {
    try {
      if (!this.isOnline) {
        // Offline: check local storage
        return this.checkNicknameExistsLocally(nickname);
      }

      // Online: check Firebase
      const q = query(
        collection(db, this.nicknameCollection),
        where('nickname_lower', '==', nickname.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking nickname online, falling back to local:', error);
      return this.checkNicknameExistsLocally(nickname);
    }
  }

  // Local backup for nickname checking
  checkNicknameExistsLocally(nickname) {
    const allLocalData = JSON.parse(localStorage.getItem('movieQuizLeaderboards') || '{}');
    const allNicknames = new Set();
    
    Object.values(allLocalData).forEach(categoryScores => {
      categoryScores.forEach(score => {
        allNicknames.add(score.nickname.toLowerCase());
      });
    });
    
    return allNicknames.has(nickname.toLowerCase());
  }

  // Save nickname to Firebase + local
  async saveNickname(nickname) {
    try {
      if (this.isOnline) {
        await addDoc(collection(db, this.nicknameCollection), {
          nickname: nickname,
          nickname_lower: nickname.toLowerCase(),
          created_at: serverTimestamp(),
          device_id: this.getDeviceId()
        });
        console.log('✅ Nickname saved to Firebase');
      }
      
      // Always save locally as backup
      localStorage.setItem('movieQuizPlayerNickname', nickname);
      return true;
    } catch (error) {
      console.error('Error saving nickname to Firebase:', error);
      // Still save locally
      localStorage.setItem('movieQuizPlayerNickname', nickname);
      return true;
    }
  }

  // Submit score to Firebase + local backup
  async submitScore(nickname, score, category, difficulty = 'easy') {
    const scoreData = {
      nickname,
      score,
      category,
      difficulty,
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
      device_id: this.getDeviceId()
    };

    try {
      if (this.isOnline) {
        // Submit to Firebase with server timestamp
        await addDoc(collection(db, this.collectionName), {
          ...scoreData,
          created_at: serverTimestamp()
        });
        console.log(`✅ Score ${score} submitted to Firebase for ${category}`);
      } else {
        // Offline: add to pending scores
        this.addToPendingScores(scoreData);
        console.log(`📝 Score ${score} queued for ${category} (offline)`);
      }
    } catch (error) {
      console.error('Error submitting to Firebase, saving locally:', error);
      this.addToPendingScores(scoreData);
    }

    // Always save locally as backup
    this.saveScoreLocally(scoreData);
    return true;
  }

  // Get top scores from Firebase + local backup
  async getTopScores(category, limitCount = 20) {
    try {
      if (!this.isOnline) {
        return this.getTopScoresLocally(category, limitCount);
      }

      // Online: get from Firebase
      const q = query(
        collection(db, this.collectionName),
        where('category', '==', category),
        orderBy('score', 'desc'),
        orderBy('created_at', 'asc'), // Earlier submission wins ties
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const scores = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to regular timestamp
        timestamp: doc.data().created_at?.toMillis?.() || doc.data().timestamp || Date.now()
      }));

      // Cache locally for offline access
      this.cacheScoresLocally(category, scores);
      return scores;

    } catch (error) {
      console.error('Error getting Firebase scores, using local:', error);
      return this.getTopScoresLocally(category, limitCount);
    }
  }

  // Get player's best score and rank
  async getPlayerStats(nickname, category) {
    try {
      const allScores = await this.getTopScores(category, 100);
      const playerScores = allScores.filter(score => 
        score.nickname.toLowerCase() === nickname.toLowerCase()
      );
      
      const bestScore = playerScores.length > 0 
        ? Math.max(...playerScores.map(s => s.score)) 
        : 0;
      
      const rank = allScores.findIndex(score => 
        score.nickname.toLowerCase() === nickname.toLowerCase()
      ) + 1;

      return {
        bestScore,
        rank: rank > 0 ? rank : null,
        totalGames: playerScores.length
      };
    } catch (error) {
      console.error('Error getting player stats:', error);
      return { bestScore: 0, rank: null, totalGames: 0 };
    }
  }

  // === LOCAL STORAGE METHODS (Backup/Offline) ===

  getTopScoresLocally(category, limitCount) {
    const allData = JSON.parse(localStorage.getItem('movieQuizLeaderboards') || '{}');
    const scores = allData[category] || [];
    return scores.slice(0, limitCount);
  }

  saveScoreLocally(scoreData) {
    const allData = JSON.parse(localStorage.getItem('movieQuizLeaderboards') || '{}');
    
    if (!allData[scoreData.category]) {
      allData[scoreData.category] = [];
    }
    
    allData[scoreData.category].push(scoreData);
    allData[scoreData.category].sort((a, b) => b.score - a.score);
    allData[scoreData.category] = allData[scoreData.category].slice(0, 100);
    
    localStorage.setItem('movieQuizLeaderboards', JSON.stringify(allData));
  }

  cacheScoresLocally(category, scores) {
    const allData = JSON.parse(localStorage.getItem('movieQuizLeaderboards') || '{}');
    allData[category] = scores;
    localStorage.setItem('movieQuizLeaderboards', JSON.stringify(allData));
  }

  // === OFFLINE SYNC METHODS ===

  getPendingScores() {
    return JSON.parse(localStorage.getItem('pendingScores') || '[]');
  }

  addToPendingScores(scoreData) {
    const pending = this.getPendingScores();
    pending.push(scoreData);
    localStorage.setItem('pendingScores', JSON.stringify(pending));
  }

  async syncPendingScores() {
    const pending = this.getPendingScores();
    if (pending.length === 0) return;

    console.log(`🔄 Syncing ${pending.length} pending scores...`);
    const synced = [];

    for (const scoreData of pending) {
      try {
        await addDoc(collection(db, this.collectionName), {
          ...scoreData,
          created_at: serverTimestamp(),
          synced_at: serverTimestamp()
        });
        synced.push(scoreData);
        console.log(`✅ Synced score ${scoreData.score} for ${scoreData.category}`);
      } catch (error) {
        console.error('Failed to sync score:', error);
        break; // Stop if we're still offline
      }
    }

    // Remove synced scores from pending
    if (synced.length > 0) {
      const remaining = pending.filter(score => !synced.includes(score));
      localStorage.setItem('pendingScores', JSON.stringify(remaining));
      console.log(`✅ Synced ${synced.length} scores, ${remaining.length} remaining`);
    }
  }

  // === UTILITY METHODS ===

  getPlayerNickname() {
    return localStorage.getItem('movieQuizPlayerNickname');
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('movieQuizDeviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('movieQuizDeviceId', deviceId);
    }
    return deviceId;
  }

  // Clear all data (for testing)
  clearAllData() {
    localStorage.removeItem('movieQuizLeaderboards');
    localStorage.removeItem('movieQuizPlayerNickname');
    localStorage.removeItem('pendingScores');
    localStorage.removeItem('movieQuizDeviceId');
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      pendingScores: this.getPendingScores().length
    };
  }
}

export default new GlobalLeaderboardService();