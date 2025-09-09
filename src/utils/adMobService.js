// src/utils/adMobService.js - COMPLETELY REWRITTEN AND FIXED
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdMobService {
  constructor() {
    this.isInitialized = false;
    this.questionCount = this.getStoredQuestionCount();
    this.adFrequency = 5; // Show ad every 5 questions (reduced for testing)
    this.isAdLoading = false;
    this.isAdReady = false;
    this.testMode = true; // Set to false for production
    
    // Test Ad Unit IDs (always work)
    this.testAdUnits = {
      interstitial: {
        android: 'ca-app-pub-3940256099942544/1033173712',
        ios: 'ca-app-pub-3940256099942544/4411468910'
      },
      banner: {
        android: 'ca-app-pub-3940256099942544/6300978111',
        ios: 'ca-app-pub-3940256099942544/2934735716'
      }
    };
    
    // Your real ad unit IDs (replace these with your actual IDs when ready)
    this.productionAdUnits = {
      interstitial: {
        android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace with your Android interstitial ID
        ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // Replace with your iOS interstitial ID
      },
      banner: {
        android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace with your Android banner ID
        ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // Replace with your iOS banner ID
      }
    };
    
    console.log('🎯 AdMobService created');
    this.initializeAdMob();
  }

  async initializeAdMob() {
    try {
      // Only initialize on mobile platforms
      if (!Capacitor.isNativePlatform()) {
        console.log('🌐 Web platform detected - AdMob disabled');
        return false;
      }

      console.log('🚀 Initializing AdMob...');
      console.log('📱 Platform:', Capacitor.getPlatform());
      console.log('🧪 Test mode:', this.testMode);
      
      await AdMob.initialize({
        requestTrackingAuthorization: true, // Required for iOS 14+
        testingDevices: [
          'YOUR_TEST_DEVICE_ID_HERE', // Add your device ID for testing
          'kGADSimulatorID' // iOS Simulator
        ],
        initializeForTesting: this.testMode
      });
      
      this.isInitialized = true;
      console.log('✅ AdMob initialized successfully');
      
      // Set up ad event listeners
      this.setupEventListeners();
      
      // Preload first ad
      await this.preloadInterstitialAd();
      
      return true;
      
    } catch (error) {
      console.error('❌ AdMob initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  setupEventListeners() {
    // Listen for interstitial ad events
    AdMob.addListener('interstitialAdLoaded', () => {
      console.log('📺 Interstitial ad loaded');
      this.isAdReady = true;
      this.isAdLoading = false;
    });

    AdMob.addListener('interstitialAdFailedToLoad', (error) => {
      console.error('❌ Interstitial ad failed to load:', error);
      this.isAdReady = false;
      this.isAdLoading = false;
    });

    AdMob.addListener('interstitialAdOpened', () => {
      console.log('📺 Interstitial ad opened');
    });

    AdMob.addListener('interstitialAdClosed', () => {
      console.log('📺 Interstitial ad closed');
      this.isAdReady = false;
      // Preload next ad
      setTimeout(() => {
        this.preloadInterstitialAd();
      }, 1000);
    });

    AdMob.addListener('interstitialAdLeftApplication', () => {
      console.log('📺 Interstitial ad left application');
    });
  }

  async preloadInterstitialAd() {
    if (!this.isInitialized || this.isAdLoading) {
      console.log('⏳ Cannot preload ad - not initialized or already loading');
      return false;
    }

    try {
      this.isAdLoading = true;
      console.log('📺 Preloading interstitial ad...');
      
      const adUnitId = this.getInterstitialAdUnitId();
      console.log('🎯 Using ad unit ID:', adUnitId);
      
      await AdMob.prepareInterstitial({
        adId: adUnitId,
        isTesting: this.testMode
      });
      
      console.log('✅ Interstitial ad preload initiated');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to preload ad:', error);
      this.isAdLoading = false;
      this.isAdReady = false;
      return false;
    }
  }

  getInterstitialAdUnitId() {
    const platform = Capacitor.getPlatform();
    const adUnits = this.testMode ? this.testAdUnits : this.productionAdUnits;
    
    const adId = adUnits.interstitial[platform] || adUnits.interstitial.android;
    console.log(`🎯 Ad ID for ${platform}:`, adId);
    return adId;
  }

  // Track question completion - call this after each question is answered
  onQuestionAnswered() {
    this.questionCount++;
    this.saveQuestionCount();
    
    console.log(`📊 Question count: ${this.questionCount}`);
    console.log(`📊 Next ad in: ${this.adFrequency - (this.questionCount % this.adFrequency)} questions`);
    
    // Check if it's time to show an ad
    if (this.shouldShowAd()) {
      console.log(`🎯 Time to show ad! (${this.questionCount} questions completed)`);
      return true;
    }
    
    return false;
  }

  shouldShowAd() {
    return this.questionCount > 0 && this.questionCount % this.adFrequency === 0;
  }

  async showInterstitialAd() {
    if (!this.isInitialized) {
      console.log('❌ AdMob not initialized');
      return false;
    }

    if (!this.isAdReady) {
      console.log('⏳ Ad not ready yet, trying to load...');
      await this.preloadInterstitialAd();
      // Wait a bit for ad to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!this.isAdReady) {
        console.log('❌ Ad still not ready, skipping...');
        return false;
      }
    }

    try {
      console.log('📺 Showing interstitial ad...');
      
      await AdMob.showInterstitial();
      
      console.log('✅ Interstitial ad shown successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to show ad:', error);
      this.isAdReady = false;
      
      // Try to preload again for next time
      this.preloadInterstitialAd();
      
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
      console.log('🔄 Question count reset');
    } catch (error) {
      console.error('Error resetting question count:', error);
    }
  }

  // Get stats for debugging
  getAdStats() {
    return {
      isInitialized: this.isInitialized,
      questionCount: this.questionCount,
      nextAdIn: this.adFrequency - (this.questionCount % this.adFrequency),
      isAdReady: this.isAdReady,
      isAdLoading: this.isAdLoading,
      testMode: this.testMode,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    };
  }

  // Force show ad (for testing)
  async forceShowAd() {
    console.log('🔧 Force showing ad for testing...');
    
    if (!this.isInitialized) {
      console.log('❌ AdMob not initialized');
      return false;
    }

    if (!this.isAdReady) {
      console.log('⏳ Loading ad first...');
      await this.preloadInterstitialAd();
      // Wait longer for test
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return await this.showInterstitialAd();
  }

  // Enable/disable test mode
  setTestMode(enabled) {
    this.testMode = enabled;
    console.log(`🧪 Test mode ${enabled ? 'enabled' : 'disabled'}`);
    
    // Re-initialize if already initialized
    if (this.isInitialized) {
      console.log('🔄 Re-initializing AdMob with new test mode...');
      this.isInitialized = false;
      this.initializeAdMob();
    }
  }

  // Show debug info
  debugInfo() {
    const stats = this.getAdStats();
    console.group('🔍 AdMob Debug Info');
    console.table(stats);
    console.groupEnd();
    return stats;
  }
}

// Create and export singleton instance
const adMobService = new AdMobService();
export default adMobService;