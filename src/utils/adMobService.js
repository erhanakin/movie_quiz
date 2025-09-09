// src/utils/adMobService.js
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdMobService {
  constructor() {
    this.isInitialized = false;
    this.questionCount = this.getStoredQuestionCount();
    this.adFrequency = 25; // Show ad every 25 questions
    this.isAdLoading = false;
    this.isAdReady = false;
    
    // Ad Unit IDs - Replace these with your actual AdMob ad unit IDs
    this.adUnits = {
      interstitial: {
        android: 'ca-app-pub-3940256099942544/1033173712', // Replace with your Android interstitial ID
        ios: 'ca-app-pub-3940256099942544/4411468910' // Replace with your iOS interstitial ID
      }
    };
    
    this.initializeAdMob();
  }

  async initializeAdMob() {
    try {
      // Only initialize on mobile platforms
      if (!Capacitor.isNativePlatform()) {
        console.log('🌐 Web platform detected - AdMob disabled');
        return;
      }

      console.log('🚀 Initializing AdMob...');
      
      await AdMob.initialize({
        requestTrackingAuthorization: true, // For iOS 14+
        testingDevices: ['YOUR_TEST_DEVICE_ID'], // Add your test device ID
        initializeForTesting: true // Set to false when using real ads
      });
      
      this.isInitialized = true;
      console.log('✅ AdMob initialized successfully');
      
      // Preload first ad
      this.preloadInterstitialAd();
      
    } catch (error) {
      console.error('❌ AdMob initialization failed:', error);
    }
  }

  async preloadInterstitialAd() {
    if (!this.isInitialized || this.isAdLoading) return;

    try {
      this.isAdLoading = true;
      console.log('📺 Preloading interstitial ad...');
      
      const adUnitId = this.getInterstitialAdUnitId();
      
      await AdMob.prepareInterstitial({
        adId: adUnitId,
        isTesting: true // Set to false when using real ads
      });
      
      this.isAdReady = true;
      this.isAdLoading = false;
      console.log('✅ Interstitial ad ready to show');
      
    } catch (error) {
      console.error('❌ Failed to preload ad:', error);
      this.isAdLoading = false;
      this.isAdReady = false;
    }
  }

  getInterstitialAdUnitId() {
    const platform = Capacitor.getPlatform();
    return this.adUnits.interstitial[platform] || this.adUnits.interstitial.android;
  }

  // Track question completion
  onQuestionAnswered() {
    this.questionCount++;
    this.saveQuestionCount();
    
    console.log(`📊 Question count: ${this.questionCount}`);
    
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
    if (!this.isInitialized || !this.isAdReady) {
      console.log('⏳ Ad not ready, skipping...');
      return false;
    }

    try {
      console.log('📺 Showing interstitial ad...');
      
      await AdMob.showInterstitial();
      
      this.isAdReady = false;
      
      // Preload next ad
      setTimeout(() => {
        this.preloadInterstitialAd();
      }, 1000);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to show ad:', error);
      this.isAdReady = false;
      
      // Try to preload again
      this.preloadInterstitialAd();
      
      return false;
    }
  }

  // Storage methods for question count persistence
  getStoredQuestionCount() {
    const stored = localStorage.getItem('movieQuizQuestionCount');
    return stored ? parseInt(stored, 10) : 0;
  }

  saveQuestionCount() {
    localStorage.setItem('movieQuizQuestionCount', this.questionCount.toString());
  }

  // Reset question count (for testing)
  resetQuestionCount() {
    this.questionCount = 0;
    localStorage.removeItem('movieQuizQuestionCount');
    console.log('🔄 Question count reset');
  }

  // Get stats for debugging
  getAdStats() {
    return {
      questionCount: this.questionCount,
      nextAdIn: this.adFrequency - (this.questionCount % this.adFrequency),
      isAdReady: this.isAdReady,
      isAdLoading: this.isAdLoading,
      isInitialized: this.isInitialized
    };
  }

  // Force show ad (for testing)
  async forceShowAd() {
    if (!this.isAdReady) {
      await this.preloadInterstitialAd();
      // Wait a moment for ad to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return this.showInterstitialAd();
  }
}

export default new AdMobService();