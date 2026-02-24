/**
 * QuizJump - Audio (Web Audio API)
 */
const QuizJumpAudio = {
  enabled: true,
  ctx: null,

  init(settings) {
    this.enabled = settings?.soundEnabled ?? true;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch { this.ctx = null; }
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  beep(freq, duration, type = 'sine', vol = 0.12, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration);
    } catch { /* ignore */ }
  },

  playJump() {
    this.beep(520, 0.08, 'sine', 0.1);
    this.beep(620, 0.06, 'sine', 0.06, 0.03);
  },

  playCorrect() {
    this.beep(523, 0.12, 'sine', 0.12);
    this.beep(659, 0.12, 'sine', 0.12, 0.08);
    this.beep(784, 0.15, 'sine', 0.1, 0.16);
  },

  playWrong() {
    this.beep(250, 0.15, 'sawtooth', 0.08);
    this.beep(200, 0.2, 'sawtooth', 0.06, 0.1);
  },

  playCoin() {
    this.beep(1200, 0.05, 'sine', 0.08);
    this.beep(1600, 0.06, 'sine', 0.06, 0.04);
  },

  playPowerUp() {
    this.beep(440, 0.1, 'triangle', 0.1);
    this.beep(554, 0.1, 'triangle', 0.08, 0.06);
    this.beep(660, 0.12, 'triangle', 0.06, 0.12);
  },

  playBoss() {
    this.beep(330, 0.15, 'triangle', 0.1);
    this.beep(440, 0.15, 'triangle', 0.1, 0.1);
    this.beep(554, 0.2, 'triangle', 0.12, 0.2);
    this.beep(660, 0.25, 'triangle', 0.1, 0.3);
  },

  setEnabled(enabled) {
    this.enabled = !!enabled;
  },
};
