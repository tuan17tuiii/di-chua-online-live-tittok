import { config as envConfig } from '../config.mjs';

/**
 * Built-in catalog of popular TikTok LIVE gifts (Vietnam & Global)
 * Used as offline visual catalog before connecting to a live room,
 * and merged with live `fetchAvailableGifts()` when connected.
 */
export const BUILTIN_TIKTOK_GIFTS = [
  { giftId: '5655', name: 'Rose (Hoa Hồng)', diamonds: 1, icon: '🌹', category: 'common' },
  { giftId: '5269', name: 'TikTok', diamonds: 1, icon: '🎵', category: 'common' },
  { giftId: '7934', name: 'Heart Me (Tim Cam)', diamonds: 1, icon: '🧡', category: 'common' },
  { giftId: '5487', name: 'Finger Heart (Bắn Tim)', diamonds: 5, icon: '🫰', category: 'common' },
  { giftId: '1001', name: 'Hoa Sen Tịnh Tâm', diamonds: 1, icon: '🪷', category: 'spiritual' },
  { giftId: '1002', name: 'Đèn Hoa Sen', diamonds: 10, icon: '🏮', category: 'spiritual' },
  { giftId: '5827', name: 'Perfume (Nước Hoa)', diamonds: 20, icon: '✨', category: 'medium' },
  { giftId: '5658', name: 'Doughnut (Bánh Vòng)', diamonds: 30, icon: '🍩', category: 'medium' },
  { giftId: '1003', name: 'Chuông Đồng Gia Trì', diamonds: 30, icon: '🛎️', category: 'spiritual' },
  { giftId: '5660', name: 'Paper Crane (Hạc Giấy)', diamonds: 99, icon: '🕊️', category: 'medium' },
  { giftId: '6064', name: 'Cap (Mũ)', diamonds: 99, icon: '🧢', category: 'medium' },
  { giftId: '5585', name: 'Confetti (Pháo Hoa)', diamonds: 100, icon: '🎊', category: 'grand' },
  { giftId: '5879', name: 'Hearts (Mưa Tim)', diamonds: 199, icon: '💖', category: 'grand' },
  { giftId: '1004', name: 'Chuông Vàng Đại Lễ', diamonds: 199, icon: '🔔', category: 'spiritual' },
  { giftId: '6267', name: 'Corgi', diamonds: 299, icon: '🐕', category: 'grand' },
  { giftId: '6093', name: 'Money Gun', diamonds: 500, icon: '💫', category: 'grand' },
  { giftId: '5765', name: 'Galaxy (Dải Ngân Hà)', diamonds: 1000, icon: '🌌', category: 'supreme' },
  { giftId: '1005', name: 'Đại Hồng Chung', diamonds: 1000, icon: '🏛️', category: 'spiritual' },
  { giftId: '6427', name: 'Whale Diving (Cá Voi)', diamonds: 2150, icon: '🐋', category: 'supreme' },
  { giftId: '6369', name: 'Lion (Sư Tử Vàng)', diamonds: 29999, icon: '🦁', category: 'supreme' },
  { giftId: '9098', name: 'TikTok Universe (Vũ Trụ)', diamonds: 44999, icon: '🪐', category: 'supreme' }
];

/**
 * Generate a fresh deep copy of the Default Full Application Configuration.
 */
export function createDefaultAppConfig() {
  return {
    version: '2.0.0',
    updatedAt: Date.now(),

    // =========================================================================
    // GROUP 1: TIKTOK LIVE CONNECTION & INGESTION
    // =========================================================================
    connection: {
      defaultChannel: 'kenh_phat_phap',
      savedChannels: [
        { id: 'ch_default', label: 'Kênh Chánh Điện Chính', uniqueId: 'kenh_phat_phap', roomId: '' }
      ],
      signApiKey: envConfig.tiktok.signApiKey || '',
      sessionId: envConfig.tiktok.sessionId || '',
      targetIdc: envConfig.tiktok.targetIdc || 'alisg',
      authenticateWs: false,
      proxyUrl: envConfig.tiktok.proxyUrl || '',
      autoReconnect: true,
      watchdogTimeoutSec: 60,
      fetchGiftsOnConnect: true,
      enabledEvents: {
        chat: true,
        gift: true,
        like: true,
        member: true,
        follow: true,
        share: true,
        subNotify: true,
        emote: true,
        envelope: true,
        roomUser: true
      }
    },

    // =========================================================================
    // GROUP 2: PRESENCE & SOCIAL MICRO-EVENT FLOWS (Member, Follow, Share, Sub)
    // =========================================================================
    presenceFlows: {
      memberJoin: {
        enabled: true,
        seatOnJoin: false,
        minFreeSeatPercent: 20,
        defaultSkin: 'random', // 'random' | 'man' | 'woman' | 'monk' | 'nun' | 'child' | 'granny' | 'master'
        bowOnJoin: false,
        particleTier: 0,
        welcomeBubble: ''
      },
      follow: {
        enabled: true,
        seatOnFollow: true,
        bowOnFollow: true,
        bonusCoins: 0,
        particleTier: 1,
        sfx: 'none', // 'none' | 'mo' | 'small_bell' | 'great_bell' | 'tier1_chime' | 'tier2_chime'
        ttsEnabled: false,
        ttsPriority: 3,
        ttsCooldownSec: 30,
        ttsTemplate: 'Nam mô A Di Đà Phật, cảm tạ Phật tử {name} đã hữu duyên theo dõi chánh điện.'
      },
      share: {
        enabled: true,
        seatOnShare: true,
        bowOnShare: true,
        bonusCoins: 0,
        oncePerSession: true,
        particleTier: 1,
        sfx: 'mo',
        ttsEnabled: false,
        ttsPriority: 3,
        ttsCooldownSec: 45,
        ttsTemplate: 'Công đức vô lượng, cảm tạ Phật tử {name} đã gieo duyên chia sẻ khóa lễ.'
      },
      subscribe: {
        enabled: true,
        seatOnSubscribe: true,
        grantVip: true,
        bonusCoins: 50,
        forceSkin: '',
        particleTier: 3,
        sfx: 'great_bell',
        pulseHalo: true,
        allBow: true,
        showBanner: true,
        bannerTitle: 'PHẬT TỬ ĐĂNG KÝ HỘ PHÁP',
        bannerDurationSec: 10,
        ttsEnabled: true,
        ttsPriority: 1,
        ttsTemplate: 'Nam mô A Di Đà Phật. Thành tâm tri ân Phật tử {name} đã phát tâm hộ pháp đăng ký kênh chánh điện.'
      },
      envelope: {
        enabled: true,
        pulseHalo: true,
        rainPetals: true,
        sfx: 'small_bell',
        showBanner: true,
        bannerTitle: 'TÚI LỘC PHƯỚC BÁU GIEO DUYÊN',
        bannerDurationSec: 8,
        ttsEnabled: false,
        ttsPriority: 2,
        ttsTemplate: 'Phật tử {name} vừa gieo duyên túi lộc phước báu tại chánh điện.'
      }
    },

    // =========================================================================
    // GROUP 3: LIKE INTERACTION & ROOM LIKE MILESTONE FLOWS
    // =========================================================================
    likeFlows: {
      perLike: {
        enabled: true,
        seatOnLike: false,
        minLikesToSeat: 10,
        touchActivity: true,
        bowOnLike: false,
        particleTier: 1
      },
      milestones: {
        enabled: true,
        everyNLikes: 2000, // 0 to disable periodic step
        customThresholds: [1000, 5000, 10000, 50000, 100000],
        sfx: 'great_bell',
        pulseHalo: true,
        allBow: true,
        rainPetals: true,
        rainCount: 36,
        showBanner: true,
        bannerTitle: 'ĐẠI CHÚNG ĐỒNG TÂM THẢ TIM',
        bannerDurationSec: 8,
        ttsEnabled: true,
        ttsPriority: 2,
        ttsTemplate: 'Nam mô A Di Đà Phật. Chánh điện vừa đạt mốc {totalLikes} lượt tim thành tâm từ đại chúng. Nguyện cầu bình an đến muôn nhà.'
      }
    },

    // =========================================================================
    // GROUP 4: COMMENT, SKIN NLP, KEYWORD TRIGGERS & MODERATION FLOWS
    // =========================================================================
    commentFlows: {
      general: {
        enabled: true,
        seatOnChat: true,
        defaultSkin: 'man',
        bowOnChat: true,
        showBubble: true,
        bubbleDurationSec: 6,
        maxLength: 120,
        perUserCooldownMs: 3000
      },
      prayerCache: {
        enabled: true,
        ttlSec: 90,
        consumeOnce: true,
        defaultPrayers: [
          'Cầu gia đạo bình an, vạn sự kiết tường như ý.',
          'Nguyện cầu cha mẹ mạnh khỏe, phúc thọ tăng long.',
          'Cầu cho quốc thái dân an, phong điều vũ thuận.',
          'Nguyện tiêu trừ nghiệp chướng, phước huệ trang nghiêm.',
          'Cầu cho sở nguyện tòng tâm, bình an thanh tịnh.'
        ]
      },
      skinChange: {
        enabled: true,
        shortMsgMaxWords: 3,
        sacredExclusions: [
          'nam mô',
          'phật bà',
          'a di đà',
          'bổn sư',
          'quán thế âm',
          'bồ tát',
          'thích ca',
          'lạy phật'
        ],
        rules: [
          { skin: 'monk', label: 'Sư Thầy', keywords: ['sư thầy', 'thầy tu', 'đại đức', 'thầy'] },
          { skin: 'nun', label: 'Ni Cô', keywords: ['ni cô', 'sư cô'] },
          { skin: 'master', label: 'Cao Tăng', keywords: ['cao tăng', 'viện chủ', 'hòa thượng', 'thượng tọa'] },
          { skin: 'child', label: 'Chú Tiểu', keywords: ['chú tiểu', 'tiểu đồng', 'bé'] },
          { skin: 'granny', label: 'Bà Lão', keywords: ['cụ bà', 'bà lão', 'phật tử già'] },
          { skin: 'man', label: 'Cư Sĩ Nam', keywords: ['cư sĩ nam', 'con là nam', 'đổi nam', 'skin nam'] },
          { skin: 'woman', label: 'Cư Sĩ Nữ', keywords: ['cư sĩ nữ', 'con là nữ', 'đổi nữ', 'skin nữ'] }
        ],
        isolatedShortKeywords: [
          { skin: 'man', keyword: 'nam' },
          { skin: 'woman', keyword: 'nữ' },
          { skin: 'granny', keyword: 'bà' }
        ]
      },
      keywordRules: [
        {
          id: 'kw_niem_phat',
          name: 'Niệm Phật Thành Tâm',
          enabled: true,
          matchType: 'contains', // 'contains' | 'startsWith' | 'exact' | 'regex'
          keywords: ['nam mô a di đà phật', 'nam mô bổn sư', 'nam mô đại bi', 'a di đà phật'],
          requireDonor: false,
          minCoins: 0,
          cooldownSec: 5,
          actions: {
            bow: true,
            allBow: false,
            forceSkin: '',
            particleTier: 1,
            pulseHalo: false,
            sfx: 'none',
            bonusCoins: 0,
            showChantBanner: false,
            ttsEnabled: false,
            ttsPriority: 3,
            ttsTemplate: ''
          }
        },
        {
          id: 'kw_cau_an_vip',
          name: 'Lời Nguyện Cầu An (Thỉnh Chuông Gia Trì)',
          enabled: false,
          matchType: 'startsWith',
          keywords: ['cầu an:', 'nguyện cầu:', 'hồi hướng:'],
          requireDonor: false,
          minCoins: 0,
          cooldownSec: 20,
          actions: {
            bow: true,
            allBow: false,
            forceSkin: '',
            particleTier: 2,
            pulseHalo: true,
            sfx: 'small_bell',
            bonusCoins: 0,
            showChantBanner: false,
            ttsEnabled: false,
            ttsPriority: 2,
            ttsTemplate: 'Lời nguyện từ Phật tử {name}: {text}'
          }
        },
        {
          id: 'kw_thinh_chuong',
          name: 'Khán Giả VIP Xin Thỉnh Chuông',
          enabled: false,
          matchType: 'contains',
          keywords: ['#thinhchuong', 'thỉnh đại hồng chung'],
          requireDonor: true,
          minCoins: 50,
          cooldownSec: 60,
          actions: {
            bow: true,
            allBow: true,
            forceSkin: '',
            particleTier: 3,
            pulseHalo: true,
            sfx: 'great_bell',
            bonusCoins: 0,
            showChantBanner: false,
            ttsEnabled: true,
            ttsPriority: 2,
            ttsTemplate: 'Theo tâm nguyện của thí chủ {name}, chánh điện xin thỉnh một hồi Đại Hồng Chung.'
          }
        }
      ],
      moderation: {
        enabled: true,
        fallbackNickname: 'Phật tử hữu duyên',
        blacklistWords: [
          'đm', 'dmm', 'đcm', 'vcl', 'vkl', 'loz', 'lồn', 'cặc', 'buồi', 'địt', 'đéo', 'đụ',
          'mẹ mày', 'đụ má', 'mẹ kiếp', 'chó chết', 'khốn nạn',
          'dâm', 'thủ dâm', 'bú cu', 'hiếp', 'giao cấu', 'làm tình', 'dương vật', 'âm vật', 'khiêu dâm',
          'chùa lừa', 'sư giả', 'buôn thần bán thánh', 'ma tăng', 'lừa đảo tôn giáo', 'phỉ báng tam bảo'
        ],
        blockedUserIds: []
      }
    },

    // =========================================================================
    // GROUP 5: GIFT TIERS & SPECIFIC GIFT MAPPING FLOWS
    // =========================================================================
    giftFlows: {
      general: {
        enabled: true,
        comboDebounceMs: 1500,
        intermediateParticles: true,
        readAllTts: true,
        minDiamondsForTts: 1,
        priority1ThresholdCoins: 99,
        autoGrantVipOnGift: true
      },
      tiers: [
        {
          id: 'tier_1',
          level: 1,
          name: 'Cấp 1 · Hoa Tâm Thành (1 - 9 xu)',
          minCoins: 1,
          maxCoins: 9,
          particleTier: 1,
          sfx: 'mo',
          pulseHalo: false,
          allBow: false,
          rainPetals: false,
          showBanner: false,
          bannerTitle: 'LỄ VẬT DÂNG CÚNG',
          bannerDurationSec: 8,
          grantVip: true,
          forceSkin: '',
          ttsEnabled: true,
          ttsPriority: 2,
          ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {name} thành tâm cúng dường {countText}{giftName}. {prayer}'
        },
        {
          id: 'tier_2',
          level: 2,
          name: 'Cấp 2 · Đèn Sen Cúng Dường (10 - 99 xu)',
          minCoins: 10,
          maxCoins: 99,
          particleTier: 2,
          sfx: 'tier2_chime',
          pulseHalo: false,
          allBow: false,
          rainPetals: false,
          showBanner: false,
          bannerTitle: 'PHƯỚC BÁU CÚNG DƯỜNG',
          bannerDurationSec: 8,
          grantVip: true,
          forceSkin: '',
          ttsEnabled: true,
          ttsPriority: 2,
          ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {name} thành tâm cúng dường {countText}{giftName}. {prayer}'
        },
        {
          id: 'tier_3',
          level: 3,
          name: 'Cấp 3 · Đại Lễ Trang Nghiêm (100 - 999 xu)',
          minCoins: 100,
          maxCoins: 999,
          particleTier: 3,
          sfx: 'great_bell',
          pulseHalo: true,
          allBow: true,
          rainPetals: true,
          showBanner: true,
          bannerTitle: 'ĐẠI LỄ CÚNG DƯỜNG',
          bannerDurationSec: 10,
          grantVip: true,
          forceSkin: '',
          ttsEnabled: true,
          ttsPriority: 1,
          ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {name} thành tâm cúng dường {countText}{giftName}. {prayer}'
        },
        {
          id: 'tier_4',
          level: 4,
          name: 'Cấp 4 · Đại Thí Chủ Hộ Pháp (1000+ xu)',
          minCoins: 1000,
          maxCoins: 9999999,
          particleTier: 3,
          sfx: 'great_bell',
          pulseHalo: true,
          allBow: true,
          rainPetals: true,
          showBanner: true,
          bannerTitle: 'ĐẠI THÍ CHỦ HỘ PHÁP CÚNG DƯỜNG',
          bannerDurationSec: 14,
          grantVip: true,
          forceSkin: 'master',
          ttsEnabled: true,
          ttsPriority: 1,
          ttsTemplate: 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Đại thí chủ {name} phát đại bồ đề tâm cúng dường {countText}{giftName}. {prayer}'
        }
      ],
      giftOverrides: [
        {
          id: 'ov_lotus_lamp',
          enabled: false,
          giftId: '1002',
          giftName: 'Đèn Hoa Sen',
          meritMultiplier: 1,
          particleTier: 2,
          sfx: 'small_bell',
          pulseHalo: true,
          allBow: false,
          rainPetals: true,
          showBanner: true,
          bannerTitle: 'THẮP ĐÈN HOA SEN CẦU AN',
          bannerDurationSec: 8,
          grantVip: true,
          forceSkin: '',
          ttsMode: 'custom', // 'inherit' | 'custom' | 'mute'
          ttsPriority: 1,
          ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {name} vừa thắp sáng {countText}Đèn Hoa Sen dâng lên Tam Bảo. {prayer}'
        },
        {
          id: 'ov_rose_quiet',
          enabled: false,
          giftId: '5655',
          giftName: 'Hoa Hồng',
          meritMultiplier: 1,
          particleTier: 1,
          sfx: 'mo',
          pulseHalo: false,
          allBow: false,
          rainPetals: false,
          showBanner: false,
          bannerTitle: '',
          bannerDurationSec: 6,
          grantVip: true,
          forceSkin: '',
          ttsMode: 'mute',
          ttsPriority: 3,
          ttsTemplate: ''
        }
      ]
    },

    // =========================================================================
    // GROUP 6: 5-CHANNEL AUDIO MIXER, EDGE-TTS & LITURGICAL SCHEDULER
    // =========================================================================
    audioRitual: {
      volumes: {
        master: 1.0,
        bgm: 0.55,
        sfx: 0.85,
        bell: 0.95,
        tts: 1.0,
        duckedBgm: 0.12
      },
      bgm: {
        enabled: true,
        trackUrl: '/assets/audio/bgm/music1.mp3',
        availableTracks: [
          { id: 'music1', name: 'Trăng Trên Rừng Trúc (Sáo Trúc Tĩnh Tâm)', url: '/assets/audio/bgm/music1.mp3' },
          { id: 'music2', name: 'Hơi Thở Ban Mai (Đàn Tranh & Tiếng Suối)', url: '/assets/audio/bgm/music2.mp3' }
        ]
      },
      mo: {
        enabled: true,
        bpm: 52
      },
      chant: {
        enabled: true,
        everyMin: 3,
        bannerDurationSec: 12,
        items: [
          'Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo.',
          'Nam mô A Di Đà Phật, nguyện cầu an lạc thái hòa, gia đạo hưng long.',
          'Nam mô Bổn Sư Thích Ca Mâu Ni Phật, từ bi tiếp độ chúng sanh.',
          'Nam mô Đại Bi Quán Thế Âm Bồ Tát, cứu khổ cứu nạn muôn loài.'
        ]
      },
      tts: {
        voice: envConfig.tts.voice || 'vi-VN-NamMinhNeural',
        pitch: parseInt(String(envConfig.tts.pitch || '-18').replace(/[^-\d]/g, ''), 10) || -18,
        rate: parseInt(String(envConfig.tts.rate || '-20').replace(/[^-\d]/g, ''), 10) || -20,
        maxQueueSize: 10
      }
    },

    // =========================================================================
    // GROUP 7: TEMPLE SCENE, VISUAL FX, HUD & SEATING ENGINE
    // =========================================================================
    sceneSeating: {
      plaque: {
        visible: true,
        title: 'Chánh Điện Tịnh Tâm',
        subtitle: 'Nam Mô A Di Đà Phật'
      },
      background: {
        url: '/assets/backgrounds/hall.jpg',
        availableBackgrounds: [
          { id: 'bg_main_hall', name: 'Đại Hùng Bảo Điện (Chánh Điện Cổ Tự)', url: '/assets/backgrounds/hall.jpg' },
          { id: 'bg_zen_garden', name: 'Thiền Viện Trúc Lâm Cảnh Đêm', url: '/assets/backgrounds/zen_garden.jpg' }
        ]
      },
      fx: {
        smokeEnabled: true,
        smokeIntensity: 1.0,
        candlesEnabled: false,
        haloEnabled: true,
        haloIntensity: 1.0
      },
      hud: {
        showMeritBoard: true,
        meritTopLimit: 5,
        showPills: true,
        showNametags: true
      },
      seating: {
        seatMode: 'auto', // 'auto' | '24' | '36' | '64' | '100'
        donorIdleEvictMin: 15,
        defaultSkin: 'man'
      }
    },

    // =========================================================================
    // GROUP 8: ONE-CLICK LIVE MANAGER SCENE PRESETS
    // =========================================================================
    scenePresets: [
      {
        id: 'khai_kinh',
        name: '🌅 Khai Kinh Đón Khách',
        description: 'Nhịp mõ chuẩn 52 BPM, nhạc sáo trúc ấm áp, đọc kinh mỗi 3 phút, đọc tất cả quà.',
        patch: {
          audioRitual: {
            bgm: { enabled: true, trackUrl: '/assets/audio/bgm/music1.mp3' },
            mo: { enabled: true, bpm: 52 },
            chant: { enabled: true, everyMin: 3 }
          },
          sceneSeating: {
            background: { url: '/assets/backgrounds/hall.jpg' },
            fx: { smokeEnabled: true, smokeIntensity: 1.0, haloEnabled: true, haloIntensity: 1.0 }
          },
          giftFlows: {
            general: { readAllTts: true, minDiamondsForTts: 1 }
          }
        }
      },
      {
        id: 'tinh_toa',
        name: '🧘 Tĩnh Tọa Thiền Định',
        description: 'Nhịp mõ chậm 36 BPM, nhạc đàn tranh êm dịu, chỉ đọc TTS quà từ 10 xu trở lên để giữ tĩnh lặng.',
        patch: {
          audioRitual: {
            bgm: { enabled: true, trackUrl: '/assets/audio/bgm/music2.mp3' },
            mo: { enabled: true, bpm: 36 },
            chant: { enabled: true, everyMin: 5 }
          },
          sceneSeating: {
            fx: { smokeEnabled: true, smokeIntensity: 0.7, haloEnabled: true, haloIntensity: 0.85 }
          },
          giftFlows: {
            general: { readAllTts: false, minDiamondsForTts: 10 }
          }
        }
      },
      {
        id: 'dai_le',
        name: '🔔 Đại Lễ Cầu An',
        description: 'Nhịp mõ tụng 72 BPM, hào quang rực rỡ, đọc kinh mỗi 2 phút, tôn vinh toàn bộ lễ vật.',
        patch: {
          audioRitual: {
            bgm: { enabled: true, trackUrl: '/assets/audio/bgm/music1.mp3' },
            mo: { enabled: true, bpm: 72 },
            chant: { enabled: true, everyMin: 2 }
          },
          sceneSeating: {
            background: { url: '/assets/backgrounds/hall.jpg' },
            fx: { smokeEnabled: true, smokeIntensity: 1.4, haloEnabled: true, haloIntensity: 1.35 }
          },
          giftFlows: {
            general: { readAllTts: true, minDiamondsForTts: 1 }
          }
        }
      },
      {
        id: 'tinh_do_dem',
        name: '🌙 Tịnh Độ Đêm Khuya',
        description: 'Cảnh Thiền Viện Trúc Lâm đêm trăng, tắt mõ tự động, nhạc thiền nhỏ dịu nhẹ.',
        patch: {
          audioRitual: {
            volumes: { bgm: 0.35 },
            bgm: { enabled: true, trackUrl: '/assets/audio/bgm/music2.mp3' },
            mo: { enabled: false, bpm: 40 },
            chant: { enabled: true, everyMin: 6 }
          },
          sceneSeating: {
            background: { url: '/assets/backgrounds/zen_garden.jpg' },
            fx: { smokeEnabled: true, smokeIntensity: 0.6, candlesEnabled: true, haloEnabled: true, haloIntensity: 0.9 }
          }
        }
      }
    ]
  };
}

/**
 * Deep merge utility that replaces arrays cleanly when overridden,
 * while recursively merging nested plain objects.
 */
export function deepMergeConfig(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target;
  }

  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const srcVal = source[key];
    const tgtVal = target ? target[key] : undefined;

    if (srcVal === undefined) continue;

    if (Array.isArray(srcVal)) {
      output[key] = srcVal.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item) ? { ...item } : item
      );
    } else if (srcVal !== null && typeof srcVal === 'object') {
      output[key] = deepMergeConfig(
        tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal) ? tgtVal : {},
        srcVal
      );
    } else {
      output[key] = srcVal;
    }
  }
  return output;
}

/**
 * Derive legacy `settings` object from Full AppConfig for 100% backwards
 * compatibility with `WEBSOCKET_SPEC.md`, `control.html`, and `overlay.html`.
 */
export function toLegacyRoomSettings(appConfig) {
  return {
    title: appConfig.sceneSeating.plaque.title,
    subtitle: appConfig.sceneSeating.plaque.subtitle,
    voice: appConfig.audioRitual.tts.voice,
    pitch: appConfig.audioRitual.tts.pitch,
    rate: appConfig.audioRitual.tts.rate,
    music: appConfig.audioRitual.bgm.enabled,
    bgmUrl: appConfig.audioRitual.bgm.trackUrl,
    volumes: { ...appConfig.audioRitual.volumes },
    mo: appConfig.audioRitual.mo.enabled,
    moBpm: appConfig.audioRitual.mo.bpm,
    autoChant: appConfig.audioRitual.chant.enabled,
    chantEveryMin: appConfig.audioRitual.chant.everyMin,
    chantBannerDurationSec: appConfig.audioRitual.chant.bannerDurationSec,
    seatMode: appConfig.sceneSeating.seating.seatMode,
    joinOnEnter: Boolean(
      appConfig.presenceFlows.memberJoin.seatOnJoin || appConfig.likeFlows.perLike.seatOnLike
    ),
    gifts: {
      readAll: appConfig.giftFlows.general.readAllTts,
      minDiamonds: appConfig.giftFlows.general.minDiamondsForTts
    },
    overlay: {
      backgroundUrl: appConfig.sceneSeating.background.url,
      plaqueVisible: appConfig.sceneSeating.plaque.visible,
      fx: { ...appConfig.sceneSeating.fx },
      hud: { ...appConfig.sceneSeating.hud },
      bubbleDurationSec: appConfig.commentFlows.general.bubbleDurationSec,
      showBubble: appConfig.commentFlows.general.showBubble,
      skinChange: appConfig.commentFlows.skinChange
    }
  };
}

/**
 * Convert legacy `settings` partial updates (e.g. from `ctl` cmd="settings")
 * into a structured patch for Full AppConfig.
 */
export function fromLegacySettingsPatch(legacySettings = {}) {
  const patch = {};

  if (legacySettings.title !== undefined || legacySettings.subtitle !== undefined) {
    patch.sceneSeating = patch.sceneSeating || {};
    patch.sceneSeating.plaque = {};
    if (legacySettings.title !== undefined) patch.sceneSeating.plaque.title = String(legacySettings.title);
    if (legacySettings.subtitle !== undefined) patch.sceneSeating.plaque.subtitle = String(legacySettings.subtitle);
  }

  if (legacySettings.seatMode !== undefined) {
    patch.sceneSeating = patch.sceneSeating || {};
    patch.sceneSeating.seating = { seatMode: String(legacySettings.seatMode) };
  }

  if (legacySettings.joinOnEnter !== undefined) {
    const val = Boolean(legacySettings.joinOnEnter);
    patch.presenceFlows = { memberJoin: { seatOnJoin: val } };
    patch.likeFlows = { perLike: { seatOnLike: val } };
  }

  if (
    legacySettings.voice !== undefined ||
    legacySettings.pitch !== undefined ||
    legacySettings.rate !== undefined
  ) {
    patch.audioRitual = patch.audioRitual || {};
    patch.audioRitual.tts = {};
    if (legacySettings.voice !== undefined) patch.audioRitual.tts.voice = String(legacySettings.voice);
    if (legacySettings.pitch !== undefined) patch.audioRitual.tts.pitch = Number(legacySettings.pitch);
    if (legacySettings.rate !== undefined) patch.audioRitual.tts.rate = Number(legacySettings.rate);
  }

  if (legacySettings.music !== undefined || legacySettings.bgmUrl !== undefined) {
    patch.audioRitual = patch.audioRitual || {};
    patch.audioRitual.bgm = {};
    if (legacySettings.music !== undefined) patch.audioRitual.bgm.enabled = Boolean(legacySettings.music);
    if (legacySettings.bgmUrl !== undefined) patch.audioRitual.bgm.trackUrl = String(legacySettings.bgmUrl);
  }

  if (legacySettings.volumes && typeof legacySettings.volumes === 'object') {
    patch.audioRitual = patch.audioRitual || {};
    patch.audioRitual.volumes = { ...legacySettings.volumes };
  }

  if (legacySettings.mo !== undefined || legacySettings.moBpm !== undefined) {
    patch.audioRitual = patch.audioRitual || {};
    patch.audioRitual.mo = {};
    if (legacySettings.mo !== undefined) patch.audioRitual.mo.enabled = Boolean(legacySettings.mo);
    if (legacySettings.moBpm !== undefined) patch.audioRitual.mo.bpm = Number(legacySettings.moBpm);
  }

  if (legacySettings.autoChant !== undefined || legacySettings.chantEveryMin !== undefined) {
    patch.audioRitual = patch.audioRitual || {};
    patch.audioRitual.chant = {};
    if (legacySettings.autoChant !== undefined) patch.audioRitual.chant.enabled = Boolean(legacySettings.autoChant);
    if (legacySettings.chantEveryMin !== undefined) patch.audioRitual.chant.everyMin = Number(legacySettings.chantEveryMin);
  }

  if (legacySettings.gifts && typeof legacySettings.gifts === 'object') {
    patch.giftFlows = { general: {} };
    if (legacySettings.gifts.readAll !== undefined) {
      patch.giftFlows.general.readAllTts = Boolean(legacySettings.gifts.readAll);
    }
    if (legacySettings.gifts.minDiamonds !== undefined) {
      patch.giftFlows.general.minDiamondsForTts = Number(legacySettings.gifts.minDiamonds);
    }
  }

  return patch;
}

/**
 * Strip sensitive credentials when sending config to read-only clients if needed,
 * or mask secrets for safe export when requested.
 */
export function sanitizeConfigForOverlay(appConfig) {
  return toLegacyRoomSettings(appConfig);
}

