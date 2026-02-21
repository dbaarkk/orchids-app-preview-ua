import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.urbanauto.app',
  appName: 'Urban Auto',
  webDir: 'out',
  server: {
    url: 'https://app.theurbanauto.com',
    cleartext: false
  }
};

export default config;
