// src/utils/firebaseLeaderboardService.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirebaseLeaderboardService {
  constructor() {
    this.nicknameKey = 'movieQuizPlayerNickname';
    this.playersCollection = 'players';
    this.scoresCollection = 'scores';
    this.leaderboardsCollection = 'leaderboards';
  }

  // Check if nickname already exists
  async checkNicknameExists(nickname) {
    try {
      const playersRef = collection(db, this.playersCollection);
      const q = query(playersRef, where('nicknameLower', '==', nickname.toLowerCase()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking nickname:', error);
      return false;
    }
  }

  // Save player's nickname
  savePlayerNickname(nickname) {
    localStorage.setItem(this.nicknameKey, nickname);
  }

  // Get player's nickname
  getPlayerNickname() {
    return localStorage.getItem(this.nicknameKey);
  }

  // Create/update player document
  async createOrUpdatePlayer(nickname) {
    try {
      const playerRef = doc(db, this.playersCollection, nickname.toLowerCase());
      const playerDoc = await getDoc(playerRef);

      if (!playerDoc.exists()) {
        await setDoc(playerRef, {
          nickname: nickname,
          nicknameLower: nickname.toLowerCase(),
          createdAt: serverTimestamp(),
          totalGames: 0,
          categories: {}
        });
        console.log('✅ Player created:', nickname);
      }
      return true;
    } catch (error) {
      console.error('❌ Error creating/updating player:', error);
      return false;
    }
  }

  // Submit score to leaderboard
  async submitScore(nickname, score, category, difficulty = 'easy') {
    try {
      console.log(`🎯 Submitting score: ${nickname} - ${score} points - ${category} (${difficulty})`);

      // Create player if doesn't exist
      await this.createOrUpdatePlayer(nickname);

      // Add score record
      const scoreData = {
        nickname: nickname,
        nicknameLower: nickname.toLowerCase(),
        score: score,
        category: category,
        difficulty: difficulty,
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };

      await addDoc(collection(db, this.scoresCollection), scoreData);

      // Update player statistics
      const playerRef = doc(db, this.playersCollection, nickname.toLowerCase());
      await setDoc(playerRef, {
        totalGames: increment(1),
        lastPlayed: serverTimestamp(),
        [`categories.${category}.totalGames`]: increment(1),
        [`categories.${category}.bestScore`]: score,
        [`categories.${category}.lastScore`]: score,
        [`categories.${category}.lastPlayed`]: serverTimestamp()
      }, { merge: true });

      console.log('✅ Score submitted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error submitting score:', error);
      throw new Error(`Failed to submit score: ${error.message}`);
    }
  }

  // Get top scores for a category
  async getTopScores(category, limitCount = 20) {
    try {
      const scoresRef = collection(db, this.scoresCollection);
      const q = query(
        scoresRef,
        where('category', '==', category),
        orderBy('score', 'desc'),
        orderBy('timestamp', 'asc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const scores = [];
      querySnapshot.forEach((doc) => {
        scores.push(doc.data());
      });

      return scores;
    } catch (error) {
      console.error('❌ Error fetching top scores:', error);
      return [];
    }
  }

  // Get player's rank in category
  async getPlayerRank(nickname, category) {
    try {
      const topScores = await this.getTopScores(category, 100);
      const rank = topScores.findIndex(score => 
        score.nicknameLower === nickname.toLowerCase()
      ) + 1;
      return rank > 0 ? rank : null;
    } catch (error) {
      console.error('❌ Error getting player rank:', error);
      return null;
    }
  }

  // Get player's best score in category
  async getPlayerBestScore(nickname, category) {
    try {
      const scoresRef = collection(db, this.scoresCollection);
      const q = query(
        scoresRef,
        where('nicknameLower', '==', nickname.toLowerCase()),
        where('category', '==', category),
        orderBy('score', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const bestScore = querySnapshot.docs[0].data();
        return bestScore.score;
      }
      return 0;
    } catch (error) {
      console.error('❌ Error getting player best score:', error);
      return 0;
    }
  }

  // Health check
  async isConnected() {
    try {
      const testRef = doc(db, 'health', 'check');
      await getDoc(testRef);
      return true;
    } catch (error) {
      console.error('❌ Firebase connection error:', error);
      return false;
    }
  }
}

export default new FirebaseLeaderboardService();