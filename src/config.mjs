import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '127.0.0.1',

  tiktok: {
    signApiKey: process.env.SIGN_API_KEY || '',
    sessionId: process.env.TIKTOK_SESSION_ID || '',
    targetIdc: process.env.TIKTOK_TARGET_IDC || 'alisg',
    proxyUrl: process.env.RESIDENTIAL_PROXY_URL || ''
  },

  tts: {
    voice: process.env.DEFAULT_TTS_VOICE || 'vi-VN-NamMinhNeural',
    pitch: process.env.DEFAULT_TTS_PITCH || '-18Hz',
    rate: process.env.DEFAULT_TTS_RATE || '-20%',
    cacheDir: process.env.AUDIO_CACHE_DIR || './cache/audio'
  },

  defaultRoomSettings: {
    title: 'Chánh Điện Tịnh Tâm',
    subtitle: 'Nam Mô A Di Đà Phật',
    voice: 'vi-VN-NamMinhNeural',
    pitch: -18,
    rate: -20,
    music: true,
    mo: true,
    moBpm: 52,
    autoChant: true,
    chantEveryMin: 3,
    seatMode: 'auto',
    joinOnEnter: false,
    gifts: {
      readAll: true,
      minDiamonds: 1
    }
  },

  seatCapacities: [24, 36, 64, 100]
};

export default config;
