/**
 * QuizJump - UI (HUD, screens, modals, feedback)
 */
const QuizJumpUI = {
  elements: {},

  init() {
    this.elements = {
      container: document.getElementById('game-container'),
      canvas: document.getElementById('game-canvas'),
      hud: document.getElementById('hud'),
      hearts: document.getElementById('hearts'),
      coins: document.getElementById('coins'),
      coinCount: document.getElementById('coin-count'),
      problemText: document.getElementById('problem-text'),
      score: document.getElementById('score'),
      best: document.getElementById('best'),
      streak: document.getElementById('streak'),
      feedback: document.getElementById('feedback-message'),
      startScreen: document.getElementById('start-screen'),
      gameOverScreen: document.getElementById('game-over-screen'),
      gameOverReason: document.getElementById('game-over-reason'),
      finalScore: document.getElementById('final-score'),
      finalBest: document.getElementById('final-best'),
      btnStart: document.getElementById('btn-start'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      btnItems: document.getElementById('btn-items'),
      btnSettings: document.getElementById('btn-settings'),
      btnShop: document.getElementById('btn-shop'),
      btnPause: document.getElementById('btn-pause'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalSettings: document.getElementById('modal-settings'),
      modalItems: document.getElementById('modal-items'),
      modalShop: document.getElementById('modal-shop'),
      touchControls: document.getElementById('touch-controls'),
      touchLeft: document.getElementById('touch-left'),
      touchRight: document.getElementById('touch-right'),
      touchJump: document.getElementById('touch-jump'),
    };
    this.bindEvents();
  },

  bindEvents() {
    this.initPauseOverlay();
    this.elements.btnStart?.addEventListener('click', () => this.onStart?.());
    this.elements.btnPlayAgain?.addEventListener('click', () => this.onPlayAgain?.());
    this.elements.btnSettings?.addEventListener('click', () => {
      this.renderSettingsModal(QuizJumpStorage.getSettings(), (s) => {
        const current = QuizJumpStorage.getSettings();
        QuizJumpStorage.setSettings({ ...current, ...s });
      });
      this.openModal('settings');
    });
    this.elements.btnItems?.addEventListener('click', () => {
      const items = [
        { id: 'starHat', name: 'Star Hat', unlock: '50 pts or 30 coins', scoreReq: 50, coinCost: 30, type: 'hat' },
        { id: 'crown', name: 'Crown', unlock: '200 pts or 100 coins', scoreReq: 200, coinCost: 100, type: 'hat' },
        { id: 'shades', name: 'Cool Shades', unlock: '500 pts or 200 coins', scoreReq: 500, coinCost: 200, type: 'hat' },
      ];
      const characters = [
        { id: 'char_default', name: 'Blobby (Default)', color: '#FF9F43', dark: '#E67E22', unlock: 'Always available', reqKey: null },
        { id: 'char_frosty', name: 'Frosty', color: '#42A5F5', dark: '#1976D2', unlock: 'Easy Addition Boss', reqKey: 'easy_addition' },
        { id: 'char_leafy', name: 'Leafy', color: '#66BB6A', dark: '#388E3C', unlock: 'Easy Subtraction Boss', reqKey: 'easy_subtraction' },
        { id: 'char_sunny', name: 'Sunny', color: '#FFEE58', dark: '#F9A825', unlock: 'Easy Multiplication Boss', reqKey: 'easy_multiplication' },
        { id: 'char_berry', name: 'Berry', color: '#EF5350', dark: '#C62828', unlock: 'Medium Addition Boss', reqKey: 'medium_addition' },
        { id: 'char_grape', name: 'Grape', color: '#AB47BC', dark: '#7B1FA2', unlock: 'Medium Subtraction Boss', reqKey: 'medium_subtraction' },
        { id: 'char_coral', name: 'Coral', color: '#FF7043', dark: '#D84315', unlock: 'Medium Multiplication Boss', reqKey: 'medium_multiplication' },
        { id: 'char_ocean', name: 'Ocean', color: '#26C6DA', dark: '#00838F', unlock: 'Hard Addition Boss', reqKey: 'hard_addition' },
        { id: 'char_storm', name: 'Storm', color: '#78909C', dark: '#37474F', unlock: 'Hard Subtraction Boss', reqKey: 'hard_subtraction' },
        { id: 'char_blaze', name: 'Blaze', color: '#FF5722', dark: '#BF360C', unlock: 'Hard Multiplication Boss', reqKey: 'hard_multiplication' },
        { id: 'char_shadow', name: 'Shadow', color: '#37474F', dark: '#1a1a2e', unlock: 'Hard Combined Boss', reqKey: 'hard_combined' },
        { id: 'char_nova', name: 'Nova', color: '#E040FB', dark: '#AA00FF', unlock: 'X-Hard Addition Boss', reqKey: 'extremely-hard_addition' },
        { id: 'char_titan', name: 'Titan', color: '#FFD600', dark: '#FF6F00', unlock: 'X-Hard Subtraction Boss', reqKey: 'extremely-hard_subtraction' },
        { id: 'char_phantom', name: 'Phantom', color: '#B0BEC5', dark: '#546E7A', unlock: 'X-Hard Multiplication Boss', reqKey: 'extremely-hard_multiplication' },
        { id: 'char_cosmic', name: 'Cosmic', color: '#7C4DFF', dark: '#304FFE', unlock: 'X-Hard Combined Boss', reqKey: 'extremely-hard_combined' },
      ];
      const handleEquip = (id, type) => {
        const c = QuizJumpStorage.getCosmetics();
        const next = { ...c };
        if (type === 'hat') {
          next.equippedHat = next.equippedHat === id ? null : id;
        } else if (type === 'skin') {
          next.equippedSkin = next.equippedSkin === id ? null : id;
        } else if (type === 'character') {
          next.equippedCharacter = next.equippedCharacter === id ? null : id;
        }
        QuizJumpStorage.setCosmetics(next);
        window.dispatchEvent(new CustomEvent('quizjump-cosmetics-updated'));
        this.renderItemsModal(items, characters, QuizJumpStorage.getCosmetics(), QuizJumpStorage.getHighscore(), QuizJumpStorage.getCoins(), handleEquip);
      };
      this.renderItemsModal(items, characters, QuizJumpStorage.getCosmetics(), QuizJumpStorage.getHighscore(), QuizJumpStorage.getCoins(), handleEquip);
      this.openModal('items');
    });
    this.elements.btnShop?.addEventListener('click', () => {
      this.renderShopModal(QuizJumpStorage.getCoins(), QuizJumpStorage.getInventory(), () => {});
      this.openModal('shop');
    });
    this.elements.btnPause?.addEventListener('click', () => this.onPause?.());
    document.getElementById('btn-next-level')?.addEventListener('click', () => this.onNextLevel?.());
    this.elements.modalBackdrop?.addEventListener('click', () => this.closeModals());
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModals());
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.onEscape?.();
    });
    this.elements.touchLeft?.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchInput.left = true; });
    this.elements.touchLeft?.addEventListener('touchend', (e) => { e.preventDefault(); this.touchInput.left = false; });
    this.elements.touchRight?.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchInput.right = true; });
    this.elements.touchRight?.addEventListener('touchend', (e) => { e.preventDefault(); this.touchInput.right = false; });
    this.elements.touchJump?.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchInput.jump = true; });
    this.elements.touchJump?.addEventListener('touchend', (e) => { e.preventDefault(); this.touchInput.jump = false; });
  },

  touchInput: { left: false, right: false, jump: false },

  onStart: null,
  onPlayAgain: null,
  onPause: null,
  onEscape: null,
  onNextLevel: null,

  showStartScreen() {
    this.elements.startScreen?.classList.remove('hidden');
    this.elements.gameOverScreen?.classList.add('hidden');
  },

  hideStartScreen() {
    this.elements.startScreen?.classList.add('hidden');
  },

  showGameOver(reason, score, best) {
    this.elements.gameOverScreen?.classList.remove('hidden');
    if (this.elements.gameOverReason) this.elements.gameOverReason.textContent = reason;
    if (this.elements.finalScore) this.elements.finalScore.textContent = score;
    if (this.elements.finalBest) this.elements.finalBest.textContent = best;
  },

  hideGameOver() {
    this.elements.gameOverScreen?.classList.add('hidden');
  },

  showBossComplete(score, streak, multiplier) {
    const el = document.getElementById('boss-complete-screen');
    if (el) el.classList.remove('hidden');
    const msg = document.getElementById('boss-complete-msg');
    if (msg) msg.textContent = multiplier > 1 ? `Score multiplier: x${multiplier}` : 'Keep going!';
    const sc = document.getElementById('boss-score');
    if (sc) sc.textContent = score;
    const st = document.getElementById('boss-streak');
    if (st) st.textContent = streak;
  },

  hideBossComplete() {
    const el = document.getElementById('boss-complete-screen');
    if (el) el.classList.add('hidden');
  },

  updateHUD(state) {
    const bossBanner = document.getElementById('boss-banner');
    const bossProgress = document.getElementById('boss-progress');
    if (bossBanner) {
      bossBanner.classList.toggle('hidden', !state.bossRound);
      bossBanner.style.cssText = state.bossRound ? 'font-size:18px;font-weight:bold;color:#f1c40f;text-shadow:0 0 10px #ff0;margin-bottom:4px;' : '';
    }
    if (bossProgress && state.correctCount !== undefined && state.bossRound !== undefined) {
      const toBoss = 10 - (state.correctCount % 10);
      const show = !state.bossRound && toBoss <= 5 && toBoss > 0;
      bossProgress.classList.toggle('hidden', !show);
      bossProgress.textContent = show ? `${toBoss} more until Boss!` : '';
    }
    if (this.elements.hearts) {
      let heartsHTML = '';
      for (let i = 0; i < 3; i++) {
        heartsHTML += i < state.hearts ? '\u2764\uFE0F' : '\uD83E\uDD0D';
      }
      this.elements.hearts.innerHTML = heartsHTML;
    }
    if (this.elements.problemText) this.elements.problemText.textContent = state.problem || '';
    if (this.elements.score) {
      const multText = (state.multiplier && state.multiplier > 1) ? ` (x${state.multiplier})` : '';
      this.elements.score.textContent = (state.score ?? 0) + multText;
    }
    if (this.elements.best) this.elements.best.textContent = state.best ?? 0;
    if (this.elements.streak) {
      this.elements.streak.textContent = state.streak ?? 0;
      this.elements.streak.style.color = (state.streak >= 5) ? '#e74c3c' : (state.streak >= 3) ? '#f39c12' : '';
    }
    if (this.elements.coinCount) this.elements.coinCount.textContent = state.coins ?? 0;
    if (state.coins !== undefined && this.elements.coins) {
      this.elements.coins.classList.toggle('hidden', false);
    }
    const ph = document.getElementById('powerup-hud');
    if (ph && state.inventory) {
      const parts = [];
      if (state.inventory.shield) parts.push(`\uD83D\uDEE1\uFE0F${state.inventory.shield}`);
      if (state.inventory.extraLife) parts.push(`\u2764\uFE0F+${state.inventory.extraLife}`);
      ph.innerHTML = parts.length ? parts.join(' ') : '';
      ph.style.fontSize = '14px';
      ph.style.marginTop = '4px';
    }
  },

  triggerHeartShake() {
    const el = this.elements.hearts;
    if (el) {
      el.classList.remove('shake');
      el.offsetHeight;
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 400);
    }
  },

  showFeedback(type, text) {
    const el = this.elements.feedback;
    if (!el) return;
    const icon = type === 'correct' ? '✓ ' : '✗ ';
    el.textContent = icon + text;
    el.className = 'visible ' + type;
    el.classList.remove('hidden');
    clearTimeout(this._feedbackTimeout);
    this._feedbackTimeout = setTimeout(() => {
      el.classList.remove('visible');
      el.classList.add('hidden');
    }, 1200);
  },

  openModal(name) {
    this.elements.modalBackdrop?.classList.remove('hidden');
    const modal = this.elements['modal' + name.charAt(0).toUpperCase() + name.slice(1)];
    modal?.classList.remove('hidden');
  },

  closeModals() {
    this.elements.modalBackdrop?.classList.add('hidden');
    this.elements.modalSettings?.classList.add('hidden');
    this.elements.modalItems?.classList.add('hidden');
    this.elements.modalShop?.classList.add('hidden');
    if (typeof window.QuizJumpGameState !== 'undefined' && window.QuizJumpGameState === 'paused') {
      this.showPauseOverlay(true);
    }
  },

  showPauseButton(show) {
    this.elements.btnPause?.classList.toggle('hidden', !show);
  },

  showPauseOverlay(show) {
    const el = document.getElementById('pause-overlay');
    if (el) el.classList.toggle('hidden', !show);
  },

  initPauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    document.getElementById('pause-resume')?.addEventListener('click', () => this.onPauseResume?.());
    document.getElementById('pause-settings')?.addEventListener('click', () => {
      this.showPauseOverlay(false);
      this.renderSettingsModal(QuizJumpStorage.getSettings(), (s) => {
        const current = QuizJumpStorage.getSettings();
        QuizJumpStorage.setSettings({ ...current, ...s });
      });
      this.openModal('settings');
    });
    document.getElementById('pause-shop')?.addEventListener('click', () => {
      this.showPauseOverlay(false);
      this.renderShopModal(QuizJumpStorage.getCoins(), QuizJumpStorage.getInventory(), () => {});
      this.openModal('shop');
    });
    document.getElementById('pause-quit')?.addEventListener('click', () => this.onPauseQuit?.());
  },

  onPauseResume: null,
  onPauseQuit: null,

  showTouchControls(show) {
    this.elements.touchControls?.classList.toggle('hidden', !show);
  },

  applyColorScheme(scheme) {
    document.body.classList.toggle('dark-mode', scheme === 'dark');
  },

  applyFontSize(size) {
    document.body.classList.toggle('font-large', size === 'large');
  },

  renderSettingsModal(settings, onSave) {
    const body = document.getElementById('settings-body');
    if (!body) return;
    body.innerHTML = `
      <div class="setting-row">
        <label>Jump Height</label>
        <input type="range" id="setting-jump" min="600" max="800" value="${Math.min(800, Math.max(600, settings.jumpHeight || 600))}">
        <span id="setting-jump-val">${Math.min(800, Math.max(600, settings.jumpHeight || 600))}</span>
      </div>
      <div class="setting-row">
        <label>Speed Sensitivity</label>
        <input type="range" id="setting-speed" min="0.5" max="2" step="0.1" value="${settings.speedSensitivity}">
        <span id="setting-speed-val">${settings.speedSensitivity}</span>
      </div>
      <div class="setting-row">
        <label>Color Scheme</label>
        <select id="setting-color">
          <option value="light" ${settings.colorScheme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${settings.colorScheme === 'dark' ? 'selected' : ''}>Dark</option>
        </select>
      </div>
      <div class="setting-row">
        <label>Sound</label>
        <input type="checkbox" id="setting-sound" ${settings.soundEnabled ? 'checked' : ''}>
      </div>
      <div class="setting-row">
        <label>Math Mode</label>
        <select id="setting-math">
          <option value="addition" ${settings.mathMode === 'addition' ? 'selected' : ''}>Addition</option>
          <option value="subtraction" ${settings.mathMode === 'subtraction' ? 'selected' : ''}>Subtraction</option>
          <option value="multiplication" ${settings.mathMode === 'multiplication' ? 'selected' : ''}>Multiplication</option>
          <option value="combined" ${settings.mathMode === 'combined' ? 'selected' : ''}>Combined</option>
        </select>
      </div>
      <div class="setting-row">
        <label>Difficulty</label>
        <select id="setting-difficulty">
          <option value="easy" ${settings.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          <option value="medium" ${settings.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="hard" ${settings.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
          <option value="extremely-hard" ${settings.difficulty === 'extremely-hard' ? 'selected' : ''}>Extremely Hard</option>
        </select>
      </div>
      <div class="setting-row">
        <label>Boss Questions</label>
        <input type="checkbox" id="setting-boss" ${settings.bossEnabled !== false ? 'checked' : ''}>
      </div>
      <div class="setting-row">
        <label>Power-ups</label>
        <input type="checkbox" id="setting-powerups" ${settings.powerUpsEnabled !== false ? 'checked' : ''}>
      </div>
      <button id="settings-save">Save</button>
    `;
    this.elements.settingsBody = body;
    body.querySelector('#setting-jump')?.addEventListener('input', (e) => {
      body.querySelector('#setting-jump-val').textContent = e.target.value;
    });
    body.querySelector('#setting-speed')?.addEventListener('input', (e) => {
      body.querySelector('#setting-speed-val').textContent = e.target.value;
    });
    body.querySelector('#settings-save')?.addEventListener('click', () => {
      const s = {
        jumpHeight: Math.min(800, Math.max(600, parseInt(body.querySelector('#setting-jump').value, 10) || 600)),
        speedSensitivity: parseFloat(body.querySelector('#setting-speed').value),
        colorScheme: body.querySelector('#setting-color').value,
        soundEnabled: body.querySelector('#setting-sound').checked,
        mathMode: body.querySelector('#setting-math').value,
        difficulty: body.querySelector('#setting-difficulty').value,
        bossEnabled: body.querySelector('#setting-boss').checked,
        powerUpsEnabled: body.querySelector('#setting-powerups').checked,
      };
      onSave(s);
      this.closeModals();
    });
  },

  onEquipItem: null,

  renderItemsModal(items, characters, cosmetics, highScore, coins, onEquip) {
    const body = document.getElementById('items-body');
    if (!body) return;
    const refresh = () => this.renderItemsModal(items, characters, QuizJumpStorage.getCosmetics(), QuizJumpStorage.getHighscore(), QuizJumpStorage.getCoins(), onEquip);
    const completions = cosmetics.completions || {};

    let html = '<h3 style="margin:0 0 10px;font-size:16px;color:#333;">Characters</h3>';
    html += characters.map((ch) => {
      const isDefault = !ch.reqKey;
      const isUnlocked = isDefault || (completions[ch.reqKey] && completions[ch.reqKey] >= 1);
      const equipped = cosmetics.equippedCharacter === ch.id || (isDefault && !cosmetics.equippedCharacter);
      const swatch = `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${ch.color};border:2px solid ${ch.dark};vertical-align:middle;margin-right:6px;"></span>`;
      return `
        <div class="item-row">
          <span>${swatch}${ch.name}</span>
          <span>
            ${isUnlocked
              ? (equipped
                  ? (isDefault ? '<em>Active</em>' : `<button data-id="${ch.id}" data-type="character" class="equipped-btn">Unequip</button>`)
                  : `<button data-id="${ch.id}" data-type="character">Equip</button>`)
              : `<em style="color:#999;">Beat ${ch.unlock}</em>`}
          </span>
        </div>
      `;
    }).join('');

    html += '<h3 style="margin:16px 0 10px;font-size:16px;color:#333;">Accessories</h3>';
    html += items.map((item) => {
      const scoreUnlock = item.scoreReq && highScore >= item.scoreReq;
      const isUnlocked = (cosmetics.unlocked || []).includes(item.id) || scoreUnlock;
      const canPurchase = !isUnlocked && item.coinCost && coins >= item.coinCost;
      const equipped = cosmetics.equippedHat === item.id || cosmetics.equippedSkin === item.id;
      return `
        <div class="item-row">
          <span>${item.name}</span>
          <span>
            ${isUnlocked
              ? (equipped
                  ? `<button data-id="${item.id}" data-type="${item.type}" class="equipped-btn">Unequip</button>`
                  : `<button data-id="${item.id}" data-type="${item.type}">Equip</button>`)
              : canPurchase
                ? `<button data-id="${item.id}" data-cost="${item.coinCost}" data-action="buy">Buy (${item.coinCost} coins)</button>`
                : `Locked (${item.unlock})`}
          </span>
        </div>
      `;
    }).join('');

    body.innerHTML = html;
    body.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'buy') {
          const id = btn.dataset.id;
          const cost = parseInt(btn.dataset.cost, 10);
          const c = QuizJumpStorage.getCosmetics();
          if (QuizJumpStorage.getCoins() >= cost && !(c.unlocked || []).includes(id)) {
            QuizJumpStorage.setCoins(QuizJumpStorage.getCoins() - cost);
            QuizJumpStorage.setCosmetics({
              ...c,
              unlocked: [...(c.unlocked || []), id],
            });
            refresh();
          }
        } else if (onEquip) {
          onEquip(btn.dataset.id, btn.dataset.type);
        }
      });
    });
  },

  renderShopModal(coins, inventory, onPurchase) {
    const body = document.getElementById('shop-body');
    if (!body) return;
    const powerUps = [
      { id: 'shield', name: 'Shield', cost: 15, desc: 'Blocks 1 wrong answer' },
      { id: 'extraLife', name: 'Extra Life', cost: 30, desc: '+1 heart (max 5)' },
    ];
    const cosmetics = [
      { id: 'starHat', name: 'Star Hat', cost: 30 },
      { id: 'crown', name: 'Crown', cost: 100 },
      { id: 'shades', name: 'Cool Shades', cost: 200 },
    ];
    const inv = inventory || {};
    const cos = QuizJumpStorage.getCosmetics();
    const unlocked = cos.unlocked || [];
    body.innerHTML = `
      <p style="font-size:18px;margin-bottom:16px;">🪙 Coins: <strong>${coins}</strong></p>
      ${coins === 0 ? '<p class="shop-empty">Earn coins by playing!</p>' : ''}
      <h3 style="margin:16px 0 8px;">Power-ups</h3>
      ${powerUps.map((p) => `
        <div class="item-row">
          <span>${p.name} (${p.desc})</span>
          <span>
            <button data-id="${p.id}" data-cost="${p.cost}" data-type="powerup">Buy (${p.cost})</button>
            ${inv[p.id] ? ` · Have: ${inv[p.id]}` : ''}
          </span>
        </div>
      `).join('')}
      <h3 style="margin:16px 0 8px;">Cosmetics</h3>
      ${cosmetics.map((c) => `
        <div class="item-row">
          <span>${c.name}</span>
          <span>
            ${unlocked.includes(c.id) ? 'Owned' : `<button data-id="${c.id}" data-cost="${c.cost}" data-type="cosmetic">Buy (${c.cost})</button>`}
          </span>
        </div>
      `).join('')}
    `;
    body.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cost = parseInt(btn.dataset.cost, 10);
        const type = btn.dataset.type;
        if (QuizJumpStorage.getCoins() < cost) return;
        if (type === 'powerup') {
          if (id === 'extraLife') {
            const inv = QuizJumpStorage.getInventory();
            inv.extraLife = (inv.extraLife || 0) + 1;
            QuizJumpStorage.setInventory(inv);
          } else {
            const inv = QuizJumpStorage.getInventory();
            inv[id] = (inv[id] || 0) + 1;
            QuizJumpStorage.setInventory(inv);
          }
        } else {
          const c = QuizJumpStorage.getCosmetics();
          if (!(c.unlocked || []).includes(id)) {
            QuizJumpStorage.setCosmetics({
              ...c,
              unlocked: [...(c.unlocked || []), id],
            });
          }
        }
        QuizJumpStorage.setCoins(QuizJumpStorage.getCoins() - cost);
        window.dispatchEvent(new CustomEvent('quizjump-cosmetics-updated'));
        window.dispatchEvent(new CustomEvent('quizjump-coins-updated'));
        window.dispatchEvent(new CustomEvent('quizjump-inventory-updated'));
        this.renderShopModal(QuizJumpStorage.getCoins(), QuizJumpStorage.getInventory(), onPurchase);
      });
    });
  },
};
