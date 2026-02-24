/**
 * QuizJump - localStorage persistence helpers
 */
const QuizJumpStorage = {
  keys: {
    highscore: 'quizjump_highscore',
    coins: 'quizjump_coins',
    settings: 'quizjump_settings',
    inventory: 'quizjump_inventory',
    cosmetics: 'quizjump_cosmetics',
  },

  defaultSettings: {
    jumpHeight: 600,
    speedSensitivity: 1.0,
    bossEnabled: true,
    bossMode: '8-choice',
    powerUpsEnabled: true,
    mathMode: 'addition',
    difficulty: 'easy',
    colorScheme: 'light',
    soundEnabled: true,
    fontSize: 'normal',
  },

  getHighscore() {
    const v = localStorage.getItem(this.keys.highscore);
    return v != null ? parseInt(v, 10) : 0;
  },

  setHighscore(value) {
    localStorage.setItem(this.keys.highscore, String(Math.max(0, value)));
  },

  getCoins() {
    const v = localStorage.getItem(this.keys.coins);
    return v != null ? parseInt(v, 10) : 0;
  },

  setCoins(value) {
    localStorage.setItem(this.keys.coins, String(Math.max(0, value)));
  },

  getSettings() {
    try {
      const raw = localStorage.getItem(this.keys.settings);
      if (!raw) return { ...this.defaultSettings };
      const parsed = JSON.parse(raw);
      const s = { ...this.defaultSettings, ...parsed };
      s.jumpHeight = Math.min(800, Math.max(600, s.jumpHeight || 600));
      return s;
    } catch {
      return { ...this.defaultSettings };
    }
  },

  setSettings(settings) {
    localStorage.setItem(this.keys.settings, JSON.stringify(settings));
  },

  getInventory() {
    try {
      const raw = localStorage.getItem(this.keys.inventory);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  setInventory(inv) {
    localStorage.setItem(this.keys.inventory, JSON.stringify(inv));
  },

  getCosmetics() {
    const defaults = {
      equippedSkin: null,
      equippedHat: null,
      equippedSparkle: false,
      equippedCharacter: null,
      unlocked: [],
      completions: {},
    };
    try {
      const raw = localStorage.getItem(this.keys.cosmetics);
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return { ...defaults };
    }
  },

  setCosmetics(cosmetics) {
    localStorage.setItem(this.keys.cosmetics, JSON.stringify(cosmetics));
  },
};
