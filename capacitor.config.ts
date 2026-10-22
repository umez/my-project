import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zemu.guitartuner',
  appName: 'Zemu Guitar Tuner',
  webDir: 'www',
  backgroundColor: '#101114',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
