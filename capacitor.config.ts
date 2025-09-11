import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.moviequiz',
  appName: 'movie_quiz',
  webDir: 'build',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-5727694882165545~9300037140', // Android App ID
      iOSAppId: 'ca-app-pub-5727694882165545~9939203538', // iOS App ID
      testingDevices: [
        'SIMULATOR', // iOS Simulator
        'kGADSimulatorID', // iOS Simulator alternative
        'YOUR_ANDROID_DEVICE_ID', // Replace with your actual Android device ID
        'YOUR_IOS_DEVICE_ID' // Replace with your actual iOS device ID
      ],
      initializeForTesting: true // Enable test mode for development
    }
  }
};

export default config;