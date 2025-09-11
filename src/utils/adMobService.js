// src/utils/admobService.js
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdMobService {
  constructor() {
    this.questionCount = this.getStoredQuestionCount();
    this.adFrequency = 20; // Show ad every 3 completed games
    this.isInitialized = false;
    this.testMode = true; // Set to false for production
    
    // Google's official test ad unit IDs (always safe to use)
    this.testAdUnits = {
      interstitial: {
        android: 'ca-app-pub-3940256099942544/1033173712',
        ios: 'ca-app-pub-3940256099942544/4411468910'
      }
    };
    
    // Your production ad unit IDs
    this.productionAdUnits = {
      interstitial: {
        android: 'ca-app-pub-5727694882165545/5185570306',
        ios: 'ca-app-pub-5727694882165545/2666399930'
      }
    };
    
    this.initializeAdMob();
  }

  async initializeAdMob() {
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('Web platform detected - AdMob disabled');
        return false;
      }

      console.log('Initializing AdMob...');
      console.log('Platform:', Capacitor.getPlatform());
      console.log('Test mode:', this.testMode);

      await AdMob.initialize({
        testingDevices: [
          'SIMULATOR', // iOS Simulator
          'kGADSimulatorID', // iOS Simulator alternative
          'YOUR_ANDROID_DEVICE_ID', // Replace with actual device ID for testing
          'YOUR_IOS_DEVICE_ID' // Replace with actual device ID for testing
        ],
        initializeForTesting: this.testMode
      });
      
      this.isInitialized = true;
      console.log('AdMob initialized successfully');
      return true;
    } catch (error) {
      console.error('AdMob initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Track question completion - call this after each game ends
  onQuestionAnswered() {
    this.questionCount++;
    this.saveQuestionCount();
    
    console.log(`Question count: ${this.questionCount}`);
    console.log(`Next ad in: ${this.adFrequency - (this.questionCount % this.adFrequency)} games`);
    
    // Check if it's time to show an ad
    if (this.shouldShowAd()) {
      console.log(`Time to show ad! (${this.questionCount} games completed)`);
      return true;
    }
    
    return false;
  }

  shouldShowAd() {
    return this.questionCount > 0 && this.questionCount % this.adFrequency === 0;
  }

  async showInterstitialAd() {
    if (!this.isInitialized) {
      console.log('AdMob not initialized');
      return false;
    }

    try {
      console.log('Preparing interstitial ad...');
      
      const platform = Capacitor.getPlatform();
      const adUnits = this.testMode ? this.testAdUnits : this.productionAdUnits;
      const adUnitId = adUnits.interstitial[platform] || adUnits.interstitial.android;
      
      console.log(`Using ad unit ID: ${adUnitId}`);
      
      // Prepare the ad
      await AdMob.prepareInterstitial({
        adId: adUnitId
      });
      
      console.log('Ad prepared, showing...');
      
      // Show the ad
      await AdMob.showInterstitial();
      
      console.log('Interstitial ad shown successfully');
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  // Storage methods for question count persistence
  getStoredQuestionCount() {
    try {
      const stored = localStorage.getItem('movieQuizQuestionCount');
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error getting stored question count:', error);
      return 0;
    }
  }

  saveQuestionCount() {
    try {
      localStorage.setItem('movieQuizQuestionCount', this.questionCount.toString());
    } catch (error) {
      console.error('Error saving question count:', error);
    }
  }

  // Reset question count (for testing)
  resetQuestionCount() {
    this.questionCount = 0;
    try {
      localStorage.removeItem('movieQuizQuestionCount');
      console.log('Question count reset');
    } catch (error) {
      console.error('Error resetting question count:', error);
    }
  }

  // Force show ad (for testing)
  async forceShowAd() {
    console.log('Force showing ad for testing...');
    return await this.showInterstitialAd();
  }

  // Enable/disable test mode
  setTestMode(enabled) {
    this.testMode = enabled;
    console.log(`Test mode ${enabled ? 'enabled' : 'disabled'}`);
    
    // Re-initialize if already initialized
    if (this.isInitialized) {
      console.log('Re-initializing AdMob with new test mode...');
      this.isInitialized = false;
      this.initializeAdMob();
    }
  }

  // Get stats for debugging
  getAdStats() {
    return {
      isInitialized: this.isInitialized,
      questionCount: this.questionCount,
      nextAdIn: this.adFrequency - (this.questionCount % this.adFrequency),
      testMode: this.testMode,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    };
  }

  // Show debug info
  debugInfo() {
    const stats = this.getAdStats();
    console.group('AdMob Debug Info');
    console.table(stats);
    console.groupEnd();
    return stats;
  }
}

// Create and export singleton instance
const adMobService = new AdMobService();
export default adMobService;