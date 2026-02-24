/**
 * QuizJump - Main game loop and state
 */
(function () {
  const PLAYER_WIDTH = 36;
  const PLAYER_HEIGHT = 44;
  const GROUND_HEIGHT = 32;
  const PLATFORM_HEIGHT = 40;
  const PLATFORM_GAP = 10;
  const ROW_SPACING = 130;
  const WORLD_HEIGHT = 2000;
  const CAMERA_LERP = 0.1;
  const LETTERS = ['A', 'B', 'C', 'D'];
  const BOSS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const PLATFORM_COLORS = [
    '#5B8DEF', '#9B6ED8', '#E8805A', '#4ECDC4',
    '#F7B731', '#45B7D1', '#FC5C65', '#26DE81',
  ];

  function getDifficultyMultiplier(diff) {
    return { easy: 1, medium: 2, hard: 3, 'extremely-hard': 5 }[diff] || 1;
  }

  let canvas, ctx;
  let gameState = 'start'; // start | playing | paused | gameover
  let state = {};
  let lastTime = 0;
  let input = { left: false, right: false, jump: false, usePowerUp: false };
  let keys = {};

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    QuizJumpUI.init();
    QuizJumpUI.onStart = startGame;
    QuizJumpUI.onPlayAgain = startGame;
    QuizJumpUI.onPause = togglePause;
    QuizJumpUI.onPauseResume = resumeGame;
    QuizJumpUI.onPauseQuit = () => {
      gameState = 'start';
      window.QuizJumpGameState = 'start';
      QuizJumpUI.showPauseOverlay(false);
      QuizJumpUI.showStartScreen();
      QuizJumpUI.showPauseButton(false);
    };
    QuizJumpUI.onEscape = () => {
      if (gameState === 'paused') resumeGame();
      else if (gameState === 'playing') togglePause();
    };
    QuizJumpUI.onNextLevel = () => {
      resumeAfterBoss();
    };

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { input.left = true; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { input.right = true; e.preventDefault(); }
      if (e.key === ' ') { input.jump = true; e.preventDefault(); }
      if (e.key === 'e' || e.key === 'E') { input.usePowerUp = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
      if (e.key === ' ') input.jump = false;
    });

    window.addEventListener('quizjump-cosmetics-updated', () => {
      if (state && state.cosmetics) state.cosmetics = QuizJumpStorage.getCosmetics();
    });
    window.addEventListener('quizjump-coins-updated', () => {
      if (state && state.coins !== undefined) state.coins = QuizJumpStorage.getCoins();
    });
    window.addEventListener('quizjump-inventory-updated', () => {
      if (state && state.inventory) state.inventory = { ...QuizJumpStorage.getInventory() };
    });

    // Touch input
    if ('ontouchstart' in window) {
      QuizJumpUI.showTouchControls(true);
      const ti = QuizJumpUI.touchInput;
      const updateInput = () => {
        input.left = ti.left;
        input.right = ti.right;
        if (ti.jump) { input.jump = true; ti.jump = false; }
      };
      setInterval(updateInput, 50);
    }

    QuizJumpUI.showStartScreen();
    window.addEventListener('load', resizeCanvas);
    requestAnimationFrame(loop);
  }

  function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (!container || !canvas) return;
    const rect = container.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }

  function startGame() {
    QuizJumpAudio.ctx?.resume?.().catch(() => {});
    const settings = QuizJumpStorage.getSettings();
    QuizJumpUI.applyColorScheme(settings.colorScheme);
    QuizJumpUI.applyFontSize(settings.fontSize);
    QuizJumpAudio.init(settings);

    const worldWidth = canvas.width;
    const groundY = WORLD_HEIGHT - GROUND_HEIGHT;

    const cosmetics = QuizJumpStorage.getCosmetics();
    state = {
      player: {
        x: worldWidth / 2 - PLAYER_WIDTH / 2,
        y: groundY - PLAYER_HEIGHT,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        vx: 0,
        vy: 0,
      },
      cameraY: 0,
      ground: { x: 0, y: groundY, width: worldWidth, height: GROUND_HEIGHT },
      platforms: [],
      problem: null,
      score: 0,
      best: Math.max(QuizJumpStorage.getHighscore(), 0),
      streak: 0,
      hearts: 3,
      coins: QuizJumpStorage.getCoins(),
      checkpoint: { x: worldWidth / 2 - PLAYER_WIDTH / 2, y: groundY - PLAYER_HEIGHT },
      checkpointGround: null,
      ignoreWrongLandings: false,
      correctCount: 0,
      bossRound: false,
      bossPhase: null, // null | 'lever' | 'active'
      bossLever: null,
      multiplier: getDifficultyMultiplier(settings.difficulty),
      cosmetics,
      inventory: { ...QuizJumpStorage.getInventory() },
      activePowerUps: {},
      collectibles: [],
      bossBalls: [],
    };

    // Generate first problem and platforms
    state.problem = QuizJumpMath.generate(settings, state.score);
    spawnPlatformRow(settings, worldWidth);

    gameState = 'playing';
    window.QuizJumpGameState = 'playing';
    QuizJumpUI.hideStartScreen();
    QuizJumpUI.hideGameOver();
    QuizJumpUI.hideBossComplete();
    QuizJumpUI.showPauseButton(true);
    QuizJumpUI.updateHUD(getHUDState());
  }

  function getHUDState() {
    return {
      problem: state.problem?.problem,
      score: state.score,
      best: state.best,
      streak: state.streak,
      hearts: state.hearts,
      coins: state.coins,
      inventory: state.inventory,
      bossRound: state.bossRound,
      correctCount: state.correctCount,
      multiplier: state.multiplier,
    };
  }

  function resetToGround(worldWidth) {
    const groundY = state.ground.y;
    state.checkpointGround = null;
    state.checkpoint = {
      x: worldWidth / 2 - PLAYER_WIDTH / 2,
      y: groundY - PLAYER_HEIGHT,
    };
    state.player.x = state.checkpoint.x;
    state.player.y = state.checkpoint.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.cameraY = 0;
    state.collectibles = [];
  }

  function trackCompletion(settings) {
    const key = `${settings.difficulty}_${settings.mathMode}`;
    const c = QuizJumpStorage.getCosmetics();
    const completions = c.completions || {};
    completions[key] = (completions[key] || 0) + 1;
    QuizJumpStorage.setCosmetics({ ...c, completions });
    window.dispatchEvent(new CustomEvent('quizjump-cosmetics-updated'));
  }

  function spawnBossBalls(problem, worldWidth) {
    const distractors = QuizJumpMath.generateBossDistractors(problem.correct, 5);
    const answers = [...distractors, problem.correct];
    QuizJumpMath.shuffle(answers);
    const ballRadius = 28;
    const groundY = state.ground.y;
    // Balls start held above — evenly spaced in a gate
    const gateY = groundY - 280;
    state.bossBalls = [];
    for (let i = 0; i < 6; i++) {
      state.bossBalls.push({
        x: 60 + (i * (worldWidth - 120) / 5),
        y: gateY + (Math.random() - 0.5) * 10,
        vx: 0,
        vy: 0,
        answer: answers[i],
        isCorrect: answers[i] === problem.correct,
        radius: ballRadius,
        held: true,
      });
    }
    // Big floor button on the right side
    state.bossPhase = 'lever';
    state.bossLever = {
      x: worldWidth - 130,
      y: groundY - 22,
      width: 100,
      height: 22,
      pulled: false,
    };
    // Move player to the left so they don't land on the button
    state.player.x = 40;
    state.player.y = groundY - PLAYER_HEIGHT;
    state.player.vx = 0;
    state.player.vy = 0;
  }

  function releaseBossBalls(worldWidth) {
    state.bossPhase = 'active';
    state.bossLever.pulled = true;
    const groundY = state.ground.y;
    for (const b of state.bossBalls) {
      b.held = false;
      b.vx = (Math.random() - 0.5) * 160;
      b.vy = 30 + Math.random() * 60;
    }
    // Drop extra life heart
    state.bossBalls.push({
      x: worldWidth / 2 + (Math.random() - 0.5) * 100,
      y: groundY - 300,
      vx: (Math.random() - 0.5) * 80,
      vy: 20 + Math.random() * 40,
      answer: null,
      isCorrect: false,
      isHeart: true,
      radius: 20,
      held: false,
    });
    // Drop a random power-up ball
    const puType = 'shield';
    state.bossBalls.push({
      x: worldWidth / 2 + (Math.random() - 0.5) * 150,
      y: groundY - 320,
      vx: (Math.random() - 0.5) * 100,
      vy: 10 + Math.random() * 50,
      answer: null,
      isCorrect: false,
      isPowerUp: puType,
      radius: 20,
      held: false,
    });
  }

  function spawnPlatformRow(settings, worldWidth, aboveY, isBoss = false, isPreBossRow = false) {
    const problem = state.problem;
    if (!problem) return;

    if (isBoss) {
      // Reset to ground for boss fight
      resetToGround(worldWidth);
      spawnBossBalls(problem, worldWidth);
      state.platforms = [];
      return;
    }
    const count = 4;
    const totalGap = PLATFORM_GAP * (count + 1);
    const platformWidth = (worldWidth - totalGap) / count;
    const spacing = isPreBossRow ? 90 : ROW_SPACING;
    const baseY = aboveY != null
      ? aboveY - spacing - PLATFORM_HEIGHT
      : state.ground.y - ROW_SPACING - PLATFORM_HEIGHT;
    const labels = LETTERS;

    state.platforms = [];
    for (let i = 0; i < count; i++) {
      const x = PLATFORM_GAP + i * (platformWidth + PLATFORM_GAP);
      state.platforms.push({
        x,
        y: baseY,
        width: platformWidth,
        height: PLATFORM_HEIGHT,
        answer: problem.answers[i],
        label: labels[i],
        color: PLATFORM_COLORS[Math.floor(Math.random() * PLATFORM_COLORS.length)],
      });
    }
  }

  function togglePause() {
    if (gameState === 'playing') {
      gameState = 'paused';
      window.QuizJumpGameState = 'paused';
      QuizJumpUI.showPauseOverlay(true);
    } else if (gameState === 'paused') {
      resumeGame();
    }
  }

  function resumeGame() {
    gameState = 'playing';
    window.QuizJumpGameState = 'playing';
    QuizJumpUI.showPauseOverlay(false);
  }

  function resumeAfterBoss() {
    const settings = QuizJumpStorage.getSettings();
    const worldWidth = canvas.width;
    QuizJumpUI.hideBossComplete();
    resetToGround(worldWidth);
    state.problem = QuizJumpMath.generate(settings, state.score, false);
    spawnPlatformRow(settings, worldWidth, state.ground.y, false, (state.correctCount % 10 === 9) && settings.bossEnabled);
    gameState = 'playing';
    window.QuizJumpGameState = 'playing';
    QuizJumpUI.updateHUD(getHUDState());
  }

  function respawn() {
    state.player.x = state.checkpoint.x;
    state.player.y = state.checkpoint.y;
    state.player.vx = 0;
    state.player.vy = 0;
  }

  function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;

    if (gameState === 'playing') {
      update(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    const settings = QuizJumpStorage.getSettings();
    const worldWidth = canvas.width;
    if (!settings.powerUpsEnabled) {
      state.activePowerUps = {};
    }

    const now = performance.now() / 1000;
    const effDt = dt;

    const feet = state.player.y + state.player.height;
    const onMainGround = feet >= state.ground.y - 2 && state.player.vy >= 0;
    const onCheckpointGround = state.checkpointGround &&
      Math.abs(feet - state.checkpointGround.y) <= 6 && state.player.vy >= 0 &&
      state.player.x + state.player.width > state.checkpointGround.x &&
      state.player.x < state.checkpointGround.x + state.checkpointGround.width;
    const onGround = onMainGround || onCheckpointGround;
    const onPlatform = state.platforms.some((p) => {
      return Math.abs(feet - p.y) <= 6 && state.player.vy >= 0 &&
        state.player.x + state.player.width > p.x && state.player.x < p.x + p.width &&
        p.answer === state.problem.correct;
    });
    const inAir = !onGround && !onPlatform;

    // Physics
    QuizJumpPhysics.update(state.player, input, effDt, settings);

    // Boss button check — player lands on the button to release balls
    if (state.bossPhase === 'lever' && state.bossLever && !state.bossLever.pulled) {
      const btn = state.bossLever;
      const feetY = state.player.y + state.player.height;
      const playerRight = state.player.x + state.player.width;
      const onButton = feetY >= btn.y && feetY <= btn.y + btn.height + 6 &&
        playerRight > btn.x && state.player.x < btn.x + btn.width &&
        state.player.vy >= 0;
      if (onButton) {
        state.player.y = btn.y - state.player.height;
        state.player.vy = 0;
        releaseBossBalls(worldWidth);
        QuizJumpAudio.playPowerUp();
      }
    }

    if (input.jump) {
      if (onGround || onPlatform) {
        QuizJumpPhysics.jump(state.player, settings.jumpHeight);
        QuizJumpAudio.playJump();
        input.jump = false;
      }
    }

    // Checkpoint ground collision (when falling after wrong - land on last correct platform)
    if (state.checkpointGround && state.player.y + state.player.height >= state.checkpointGround.y - 2 &&
        state.player.y + state.player.height <= state.checkpointGround.y + 12 && state.player.vy > 0) {
      const overlap = state.player.x + state.player.width > state.checkpointGround.x &&
        state.player.x < state.checkpointGround.x + state.checkpointGround.width;
      if (overlap) {
        state.player.y = state.checkpointGround.y - state.player.height;
        state.player.vy = 0;
        state.ignoreWrongLandings = false;
      }
    }

    // Ground collision (prevent falling through)
    if (state.player.y + state.player.height >= state.ground.y && state.player.vy > 0) {
      state.player.y = state.ground.y - state.player.height;
      state.player.vy = 0;
      state.ignoreWrongLandings = false;
    }

    // Boss balls - physics and player collision
    if (state.bossBalls && state.bossBalls.length > 0 && state.bossPhase === 'active') {
      const GRAVITY = 980;
      const RESTITUTION = 0.72;
      const groundY = state.ground.y;

      for (const b of state.bossBalls) {
        if (b.held) continue;
        b.vy += GRAVITY * effDt;
        b.x += b.vx * effDt;
        b.y += b.vy * effDt;

        if (b.y + b.radius >= groundY) {
          b.y = groundY - b.radius;
          b.vy *= -RESTITUTION;
          b.vx *= 0.98;
        }
        if (b.x - b.radius <= 0) {
          b.x = b.radius;
          b.vx *= -RESTITUTION;
        }
        if (b.x + b.radius >= worldWidth) {
          b.x = worldWidth - b.radius;
          b.vx *= -RESTITUTION;
        }
      }

      // Player-ball collision
      const px = state.player.x;
      const py = state.player.y;
      const pw = state.player.width;
      const ph = state.player.height;
      const pcx = px + pw / 2;
      const pcy = py + ph / 2;

      for (let i = state.bossBalls.length - 1; i >= 0; i--) {
        const b = state.bossBalls[i];
        if (b.held) continue;
        const dx = pcx - b.x;
        const dy = pcy - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.radius + Math.min(pw, ph) / 2 + 8) {
          // Heart pickup
          if (b.isHeart) {
            state.bossBalls.splice(i, 1);
            spawnParticles(b.x, b.y, 'rgb(231, 76, 60)', 8);
            state.hearts = Math.min(state.hearts + 1, 5);
            QuizJumpUI.showFeedback('correct', '+1 Life!');
            QuizJumpAudio.playCoin();
            QuizJumpUI.updateHUD(getHUDState());
            continue;
          }
          // Power-up pickup
          if (b.isPowerUp) {
            state.bossBalls.splice(i, 1);
            spawnParticles(b.x, b.y, 'rgb(155, 89, 182)', 8);
            state.inventory.shield = (state.inventory.shield || 0) + 1;
            QuizJumpStorage.setInventory(state.inventory);
            QuizJumpUI.showFeedback('correct', 'Got Shield!');
            QuizJumpAudio.playPowerUp();
            QuizJumpUI.updateHUD(getHUDState());
            continue;
          }
          // Answer ball
          spawnParticles(b.x, b.y, b.isCorrect ? 'rgb(46, 204, 113)' : 'rgb(231, 76, 60)', 12);
          state.bossBalls.splice(i, 1);
          if (b.isCorrect) {
            const m = state.multiplier;
            state.score += (10 + state.streak * 2 + 25) * m;
            state.streak++;
            state.correctCount++;
            if (state.score > state.best) {
              state.best = state.score;
              QuizJumpStorage.setHighscore(state.best);
            }
            state.coins += 10;
            QuizJumpStorage.setCoins(state.coins);
            QuizJumpAudio.playBoss();
            trackCompletion(settings);
            state.bossRound = false;
            state.bossPhase = null;
            state.bossLever = null;
            state.bossBalls = [];

            // Show boss complete screen on easy/medium/hard, auto-continue on x-hard
            if (settings.difficulty === 'extremely-hard') {
              QuizJumpUI.showFeedback('correct', `Boss Clear! x${m} +10 coins!`);
              resetToGround(worldWidth);
              state.problem = QuizJumpMath.generate(settings, state.score, false);
              spawnPlatformRow(settings, worldWidth, state.ground.y, false, (state.correctCount % 10 === 9) && settings.bossEnabled);
              QuizJumpUI.updateHUD(getHUDState());
            } else {
              gameState = 'bossComplete';
              window.QuizJumpGameState = 'bossComplete';
              QuizJumpUI.showBossComplete(state.score, state.streak, m);
            }
            return;
          } else {
            if ((state.inventory.shield || 0) > 0) {
              state.inventory.shield--;
              QuizJumpStorage.setInventory(state.inventory);
              QuizJumpUI.showFeedback('correct', 'Shield protected you!');
            } else {
              state.hearts--;
              state.streak = 0;
              QuizJumpUI.triggerHeartShake?.();
              QuizJumpUI.showFeedback('wrong', 'Wrong ball! -1 heart');
              QuizJumpAudio.playWrong();
            }
            if (state.hearts <= 0 && (state.inventory.extraLife || 0) > 0) {
              state.inventory.extraLife--;
              state.hearts = 1;
              QuizJumpStorage.setInventory(state.inventory);
              QuizJumpUI.showFeedback('correct', 'Extra life saved you!');
            }
            QuizJumpUI.updateHUD(getHUDState());
            if (state.hearts <= 0) {
              gameOver('Out of hearts!');
            }
          }
        }
      }
    }

    // Platform collision - landing check (feet descending onto platform)
    for (const platform of state.platforms) {
      const result = QuizJumpPhysics.checkLanding(state.player, platform, state.problem.correct);
      if (result === 'correct') {
        if (state.ignoreWrongLandings) {
          state.ignoreWrongLandings = false;
          state.player.y = platform.y - state.player.height;
          state.player.vy = 0;
          break;
        }
        const isBoss = state.bossRound;
        const m = state.multiplier;
        state.score += (10 + state.streak * 2 + (isBoss ? 25 : 0)) * m;
        state.streak++;
        state.correctCount++;
        const coinX = platform.x + platform.width / 2 - 12;
        const coinY = platform.y - 45;
        state.collectibles.push({ x: coinX, y: coinY, type: 'coin', value: 1, w: 24, h: 24, bob: 0 });
        if (isBoss) {
          state.collectibles.push({ x: coinX + 28, y: coinY, type: 'coin', value: 10, w: 24, h: 24, bob: 0 });
        }
        if (state.streak > 0 && state.streak % 5 === 0) {
          state.collectibles.push({ x: coinX - 28, y: coinY, type: 'coin', value: 5, w: 24, h: 24, bob: 0 });
        }
        if (state.score > state.best) {
          state.best = state.score;
          QuizJumpStorage.setHighscore(state.best);
        }
        state.checkpoint = {
          x: platform.x + platform.width / 2 - PLAYER_WIDTH / 2,
          y: platform.y - PLAYER_HEIGHT,
        };
        state.checkpointGround = {
          x: 0,
          y: platform.y,
          width: worldWidth,
          height: GROUND_HEIGHT,
        };
        const nextBoss = settings.bossEnabled && (state.correctCount % 10 === 0);
        spawnParticles(platform.x + platform.width / 2, platform.y, 'rgb(46, 204, 113)', 10);
        const streakMsg = state.streak > 1 ? ` ${state.streak} streak!` : '';
        const multMsg = m > 1 ? ` x${m}` : '';
        QuizJumpUI.showFeedback('correct', isBoss ? `Boss Clear!${multMsg} +10 coins!` : `Got it right!${multMsg}${streakMsg}`);
        if (isBoss) {
          QuizJumpAudio.playBoss();
          state.bossRound = false;
        } else {
          QuizJumpAudio.playCorrect();
        }

        // Boss drop - spawn visible power-up
        if (isBoss && settings.powerUpsEnabled && Math.random() < 0.5) {
          state.collectibles.push({
            x: platform.x + platform.width / 2 - 14,
            y: platform.y - 50,
            type: 'shield',
            w: 28,
            h: 28,
            bob: 0,
          });
        }

        // Power-up drops - spawn visible collectibles
        if (settings.powerUpsEnabled && Math.random() < 0.15) {
          state.collectibles.push({
            x: platform.x + platform.width / 2 - 14,
            y: platform.y - 50,
            type: 'shield',
            w: 28,
            h: 28,
            bob: 0,
          });
        }

        // New problem and platforms (spawn above the platform we just landed on)
        state.bossRound = nextBoss;
        state.problem = QuizJumpMath.generate(settings, state.score, nextBoss);
        spawnPlatformRow(settings, worldWidth, platform.y, nextBoss, (state.correctCount % 10 === 9) && settings.bossEnabled);

        QuizJumpUI.updateHUD(getHUDState());
        return;
      }
      if (result === 'wrong' && !state.ignoreWrongLandings) {
        platform.isWrong = true;
        state.ignoreWrongLandings = true;
        spawnParticles(state.player.x + PLAYER_WIDTH / 2, platform.y, 'rgb(231, 76, 60)', 8);
        if ((state.inventory.shield || 0) > 0) {
          state.inventory.shield--;
          QuizJumpStorage.setInventory(state.inventory);
          QuizJumpUI.showFeedback('correct', 'Shield protected you!');
        } else {
          state.hearts--;
          state.streak = 0;
          QuizJumpUI.triggerHeartShake?.();
          QuizJumpUI.showFeedback('wrong', 'Wrong! -1 heart');
          QuizJumpAudio.playWrong();
        }
        if (state.hearts <= 0 && (state.inventory.extraLife || 0) > 0) {
          state.inventory.extraLife--;
          state.hearts = 1;
          QuizJumpStorage.setInventory(state.inventory);
          QuizJumpUI.showFeedback('correct', 'Extra life saved you!');
        }
        QuizJumpUI.updateHUD(getHUDState());
        if (state.hearts <= 0) {
          gameOver('Out of hearts!');
        }
      }
    }

    // Resolve standing on correct platform
    for (const platform of state.platforms) {
      if (platform.answer !== state.problem.correct) continue;
      const feet = state.player.y + state.player.height;
      if (feet >= platform.y && feet <= platform.y + platform.height + 4 && state.player.vy > 0) {
        const overlap = state.player.x + state.player.width > platform.x && state.player.x < platform.x + platform.width;
        if (overlap) {
          state.player.y = platform.y - state.player.height;
          state.player.vy = 0;
          state.ignoreWrongLandings = false;
        }
      }
    }

    // Collectibles - check collision with player
    const px = state.player.x;
    const py = state.player.y;
    const pw = state.player.width;
    const ph = state.player.height;
    state.collectibles = state.collectibles.filter((c) => {
      const overlap = px + pw > c.x && px < c.x + c.w && py + ph > c.y && py < c.y + c.h;
      if (overlap) {
        if (c.type === 'coin') {
          state.coins += c.value || 1;
          QuizJumpStorage.setCoins(state.coins);
          QuizJumpAudio.playCoin();
        } else if (c.type === 'shield') {
          state.inventory.shield = (state.inventory.shield || 0) + 1;
          QuizJumpStorage.setInventory(state.inventory);
          QuizJumpAudio.playPowerUp();
        }
        QuizJumpUI.updateHUD(getHUDState());
        return false;
      }
      return true;
    });

    // Fall off
    if (state.player.y > WORLD_HEIGHT + 100) {
      gameOver('You fell!');
    }

    // Camera - follows player (Doodle Jump style: moves with character)
    const targetY = state.player.y - canvas.height * 0.4;
    state.cameraY += (targetY - state.cameraY) * CAMERA_LERP;
    state.cameraY = Math.max(0, state.cameraY);
  }

  function gameOver(reason) {
    gameState = 'gameover';
    window.QuizJumpGameState = 'gameover';
    QuizJumpStorage.setHighscore(state.best);
    QuizJumpUI.showGameOver(reason, state.score, state.best);
    QuizJumpUI.showPauseButton(false);
  }

  const CHARACTER_MAP = {
    char_default: { color: '#FF9F43', dark: '#E67E22' },
    char_frosty: { color: '#42A5F5', dark: '#1976D2' },
    char_leafy: { color: '#66BB6A', dark: '#388E3C' },
    char_sunny: { color: '#FFEE58', dark: '#F9A825' },
    char_berry: { color: '#EF5350', dark: '#C62828' },
    char_grape: { color: '#AB47BC', dark: '#7B1FA2' },
    char_coral: { color: '#FF7043', dark: '#D84315' },
    char_ocean: { color: '#26C6DA', dark: '#00838F' },
    char_storm: { color: '#78909C', dark: '#37474F' },
    char_blaze: { color: '#FF5722', dark: '#BF360C' },
    char_shadow: { color: '#37474F', dark: '#1a1a2e' },
    char_nova: { color: '#E040FB', dark: '#AA00FF' },
    char_titan: { color: '#FFD600', dark: '#FF6F00' },
    char_phantom: { color: '#B0BEC5', dark: '#546E7A' },
    char_cosmic: { color: '#7C4DFF', dark: '#304FFE' },
  };

  function getCharacterColors(cosmetics) {
    const equipped = cosmetics.equippedCharacter;
    if (equipped && CHARACTER_MAP[equipped]) {
      return CHARACTER_MAP[equipped];
    }
    if (cosmetics.equippedSkin === 'blueSkin') {
      return { color: '#42A5F5', dark: '#1976D2' };
    }
    return CHARACTER_MAP.char_default;
  }

  // Particles system
  let particles = [];
  function spawnParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: -Math.random() * 150 - 50,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color,
      });
    }
  }

  // Seeded clouds (stable across frames)
  let clouds = [];
  function generateClouds(w) {
    clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: (i * 137 + 50) % (w + 100),
        baseY: 60 + (i * 97) % 200,
        w: 60 + (i * 31) % 60,
        h: 20 + (i * 17) % 15,
        speed: 8 + (i % 3) * 4,
        alpha: 0.3 + (i % 4) * 0.1,
      });
    }
  }

  function render() {
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const isNight = document.body.classList.contains('dark-mode');
    const now = performance.now() / 1000;

    if (clouds.length === 0) generateClouds(w);

    // Sky background
    if (isNight) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#060614');
      grad.addColorStop(0.4, '#0f1638');
      grad.addColorStop(1, '#0a2040');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Stars (twinkling)
      for (let i = 0; i < 100; i++) {
        const sx = (i * 137.3) % w;
        const sy = (i * 97.7) % h;
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(now * 1.5 + i * 0.7));
        ctx.fillStyle = `rgba(255,255,255,${twinkle * (0.4 + (i % 4) * 0.15)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Moon
      const moonX = w - 80;
      const moonBaseY = 70;
      ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
      ctx.shadowColor = 'rgba(255, 248, 220, 0.3)';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(moonX, moonBaseY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(6, 6, 20, 0.35)';
      ctx.beginPath();
      ctx.arc(moonX + 6, moonBaseY - 4, 26, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#5BC0F8');
      grad.addColorStop(0.6, '#A8E6FF');
      grad.addColorStop(1, '#E8F8FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Clouds (parallax)
      for (const cloud of clouds) {
        const cx = (cloud.x + now * cloud.speed) % (w + cloud.w * 2) - cloud.w;
        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
        ctx.beginPath();
        ctx.ellipse(cx, cloud.baseY, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - cloud.w * 0.25, cloud.baseY + 4, cloud.w * 0.35, cloud.h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + cloud.w * 0.3, cloud.baseY + 3, cloud.w * 0.3, cloud.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (gameState === 'start' || gameState === 'gameover' || gameState === 'bossComplete') return;

    const camY = state.cameraY || 0;
    ctx.save();
    ctx.translate(0, -camY);

    // Draw ground with grass
    function drawGround(gx, gy, gw, gh, isCheckpoint) {
      // Dirt body
      const dirtGrad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
      dirtGrad.addColorStop(0, isCheckpoint ? '#a0764a' : '#8B6340');
      dirtGrad.addColorStop(1, isCheckpoint ? '#7a5530' : '#6B4226');
      ctx.fillStyle = dirtGrad;
      roundRect(ctx, gx, gy + 6, gw, gh - 6, 2);
      ctx.fill();
      // Grass top
      const grassGrad = ctx.createLinearGradient(gx, gy, gx, gy + 10);
      grassGrad.addColorStop(0, isCheckpoint ? '#5ebd3e' : '#4CAF50');
      grassGrad.addColorStop(1, isCheckpoint ? '#3d8b2a' : '#2E7D32');
      ctx.fillStyle = grassGrad;
      roundRect(ctx, gx, gy, gw, 10, 4);
      ctx.fill();
      // Grass tufts
      ctx.fillStyle = isCheckpoint ? '#6dd44c' : '#66BB6A';
      for (let i = 0; i < gw; i += 18) {
        const tx = gx + i + 6;
        ctx.beginPath();
        ctx.moveTo(tx - 3, gy + 2);
        ctx.quadraticCurveTo(tx, gy - 4, tx + 3, gy + 2);
        ctx.fill();
      }
    }

    // Ground
    drawGround(state.ground.x, state.ground.y, state.ground.width, state.ground.height, false);

    // Checkpoint ground
    if (state.checkpointGround) {
      const cg = state.checkpointGround;
      drawGround(cg.x, cg.y, cg.width, cg.height, true);
    }

    // Platforms
    const pcx = state.player.x + state.player.width / 2;
    const pcy = state.player.y + state.player.height / 2;
    for (const p of state.platforms) {
      const platCx = p.x + p.width / 2;
      const platCy = p.y + p.height / 2;
      const dist = Math.hypot(pcx - platCx, pcy - platCy);
      const near = dist < 120;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      roundRect(ctx, p.x + 3, p.y + 3, p.width, p.height, 12);
      ctx.fill();

      // Platform body with gradient
      const baseColor = p.isWrong ? '#e74c3c' : (p.color || '#5B8DEF');
      const platGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      platGrad.addColorStop(0, baseColor);
      platGrad.addColorStop(1, adjustColor(baseColor, -30));
      ctx.fillStyle = platGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 12);
      ctx.fill();

      // Top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      roundRect(ctx, p.x + 2, p.y + 2, p.width - 4, p.height / 3, 10);
      ctx.fill();

      // Border
      ctx.strokeStyle = near ? '#FFD700' : 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = near ? 3 : 2;
      roundRect(ctx, p.x, p.y, p.width, p.height, 12);
      ctx.stroke();

      // Glow when near
      if (near) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 2;
        roundRect(ctx, p.x, p.y, p.width, p.height, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Label and answer text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = 'bold 11px "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, platCx, p.y + 14);
      ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
      ctx.fillText(String(p.answer), platCx, p.y + 32);
    }

    // Boss drop button
    if (state.bossLever && state.bossPhase === 'lever') {
      const btn = state.bossLever;
      const btnCx = btn.x + btn.width / 2;
      const pulse = 1 + Math.sin(now * 4) * 0.03;

      // Button shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      roundRect(ctx, btn.x + 3, btn.y + 3, btn.width, btn.height, 8);
      ctx.fill();

      // Button body
      const btnGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
      btnGrad.addColorStop(0, '#EF5350');
      btnGrad.addColorStop(1, '#C62828');
      ctx.fillStyle = btnGrad;
      roundRect(ctx, btn.x, btn.y, btn.width, btn.height, 8);
      ctx.fill();

      // Top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      roundRect(ctx, btn.x + 4, btn.y + 2, btn.width - 8, btn.height / 3, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 3;
      roundRect(ctx, btn.x, btn.y, btn.width, btn.height, 8);
      ctx.stroke();

      // Text on button
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DROP!', btnCx, btn.y + 14);

      // Bouncing arrow above button
      const arrowBob = Math.sin(now * 4) * 8;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(btnCx, btn.y - 20 + arrowBob);
      ctx.lineTo(btnCx - 10, btn.y - 35 + arrowBob);
      ctx.lineTo(btnCx + 10, btn.y - 35 + arrowBob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 13px "Comic Sans MS", sans-serif';
      ctx.fillText('JUMP HERE!', btnCx, btn.y - 40 + arrowBob);

      // Gate line across the top (where balls are held)
      const gateY = state.ground.y - 250;
      ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, gateY);
      ctx.lineTo(w, gateY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Boss balls (answer balls, heart balls, power-up balls)
    if (state.bossBalls && state.bossBalls.length > 0) {
      for (const b of state.bossBalls) {
        const dist = Math.hypot(b.x - pcx, b.y - pcy);
        const near = dist < 100 && !b.held;
        const pulse = b.held ? 1 : 1 + Math.sin(now * 4 + b.x * 0.05) * 0.04;

        if (!b.held) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.beginPath();
          ctx.ellipse(b.x + 2, b.y + 4, b.radius * 0.8, b.radius * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        if (b.isHeart) {
          // Red heart ball
          const hg = ctx.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, b.radius);
          hg.addColorStop(0, '#FF6B6B');
          hg.addColorStop(0.7, '#EF5350');
          hg.addColorStop(1, '#C62828');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#B71C1C';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2764', b.x, b.y);
          ctx.textBaseline = 'alphabetic';
        } else if (b.isPowerUp) {
          // Blue/purple power-up ball
          const pg = ctx.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, b.radius);
          pg.addColorStop(0, '#64B5F6');
          pg.addColorStop(0.7, '#42A5F5');
          pg.addColorStop(1, '#1565C0');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0D47A1';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.isPowerUp === 'shield' ? '\uD83D\uDEE1' : '\u2B06', b.x, b.y);
          ctx.textBaseline = 'alphabetic';
        } else {
          // Answer ball
          const ballGrad = ctx.createRadialGradient(b.x - 6, b.y - 6, 2, b.x, b.y, b.radius);
          ballGrad.addColorStop(0, '#C084FC');
          ballGrad.addColorStop(0.7, '#8B5CF6');
          ballGrad.addColorStop(1, '#6D28D9');
          ctx.fillStyle = ballGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.ellipse(b.x - 5, b.y - 7, 6, 4, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = near ? '#FFD700' : 'rgba(109, 40, 217, 0.6)';
          ctx.lineWidth = near ? 3 : 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px "Comic Sans MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(b.answer), b.x, b.y);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    // Collectibles (coins and power-ups)
    for (const c of state.collectibles) {
      const bob = Math.sin(now * 3 + c.x * 0.01) * 4;
      const cy = c.y + bob;
      const glow = 0.5 + Math.sin(now * 4 + c.x) * 0.3;

      if (c.type === 'coin') {
        ctx.shadowColor = 'rgba(241, 196, 15, 0.5)';
        ctx.shadowBlur = 8;
        const coinGrad = ctx.createRadialGradient(c.x + c.w / 2 - 3, cy + c.h / 2 - 3, 1, c.x + c.w / 2, cy + c.h / 2, c.w / 2);
        coinGrad.addColorStop(0, '#FFEB3B');
        coinGrad.addColorStop(1, '#F9A825');
        ctx.fillStyle = coinGrad;
        ctx.beginPath();
        ctx.ellipse(c.x + c.w / 2, cy + c.h / 2, c.w / 2 - 1, c.h / 2 - 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#E65100';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#5D4037';
        ctx.font = 'bold 11px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.value > 1 ? c.value : '$', c.x + c.w / 2, cy + c.h / 2 + 4);
      } else if (c.type === 'shield') {
        ctx.fillStyle = '#42A5F5';
        ctx.strokeStyle = '#1565C0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sx = c.x + c.w / 2, sy = cy + c.h / 2;
        ctx.moveTo(sx, cy + 2);
        ctx.quadraticCurveTo(sx + c.w / 2, cy + 4, sx + c.w / 2 - 2, cy + c.h - 4);
        ctx.quadraticCurveTo(sx, cy + c.h + 2, sx - c.w / 2 + 2, cy + c.h - 4);
        ctx.quadraticCurveTo(sx - c.w / 2, cy + 4, sx, cy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Particles
    particles = particles.filter(p => {
      p.life -= 1 / 60;
      if (p.life <= 0) return false;
      p.x += p.vx / 60;
      p.y += p.vy / 60;
      p.vy += 200 / 60;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });

    // Player (cute character)
    const px = state.player.x;
    const py = state.player.y;
    const cosmetics = state.cosmetics || {};
    const charColors = getCharacterColors(cosmetics);
    const skinColor = charColors.color;
    const skinDark = charColors.dark;

    // Squash/stretch based on velocity
    const vyNorm = Math.max(-1, Math.min(1, state.player.vy / 400));
    const scaleX = 1 - vyNorm * 0.08;
    const scaleY = 1 + vyNorm * 0.12;

    ctx.save();
    ctx.translate(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT / 2);
    ctx.scale(scaleX, scaleY);

    // Body shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.ellipse(2, 3, PLAYER_WIDTH / 2 + 1, PLAYER_HEIGHT / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body with gradient
    const bodyGrad = ctx.createRadialGradient(-4, -6, 2, 0, 0, PLAYER_WIDTH / 2 + 4);
    bodyGrad.addColorStop(0, lightenColor(skinColor, 30));
    bodyGrad.addColorStop(0.7, skinColor);
    bodyGrad.addColorStop(1, skinDark);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skinDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = 'rgba(255, 150, 150, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-10, 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - white
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(-6, -6, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -6, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (look toward movement direction)
    const lookX = state.player.vx > 20 ? 1.5 : state.player.vx < -20 ? -1.5 : 0;
    const lookY = state.player.vy > 100 ? 1 : state.player.vy < -100 ? -1.5 : 0;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-6 + lookX, -6 + lookY, 2.8, 0, Math.PI * 2);
    ctx.arc(6 + lookX, -6 + lookY, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-7.5 + lookX * 0.3, -7.5 + lookY * 0.3, 1.2, 0, Math.PI * 2);
    ctx.arc(4.5 + lookX * 0.3, -7.5 + lookY * 0.3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    if (state.player.vy < -100) {
      // Excited open mouth when jumping
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.ellipse(0, 5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Happy smile
      ctx.beginPath();
      ctx.arc(0, 3, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // Hat (Star Hat, Crown, or Shades)
    if (cosmetics.equippedHat === 'starHat') {
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -PLAYER_HEIGHT / 2 - 12);
      ctx.lineTo(5, -PLAYER_HEIGHT / 2 - 2);
      ctx.lineTo(12, -PLAYER_HEIGHT / 2 - 2);
      ctx.lineTo(7, -PLAYER_HEIGHT / 2 + 4);
      ctx.lineTo(9, -PLAYER_HEIGHT / 2 + 12);
      ctx.lineTo(0, -PLAYER_HEIGHT / 2 + 6);
      ctx.lineTo(-9, -PLAYER_HEIGHT / 2 + 12);
      ctx.lineTo(-7, -PLAYER_HEIGHT / 2 + 4);
      ctx.lineTo(-12, -PLAYER_HEIGHT / 2 - 2);
      ctx.lineTo(-5, -PLAYER_HEIGHT / 2 - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (cosmetics.equippedHat === 'crown') {
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -PLAYER_HEIGHT / 2 + 4);
      ctx.lineTo(-12, -PLAYER_HEIGHT / 2 - 8);
      ctx.lineTo(-6, -PLAYER_HEIGHT / 2 - 2);
      ctx.lineTo(0, -PLAYER_HEIGHT / 2 - 10);
      ctx.lineTo(6, -PLAYER_HEIGHT / 2 - 2);
      ctx.lineTo(12, -PLAYER_HEIGHT / 2 - 8);
      ctx.lineTo(12, -PLAYER_HEIGHT / 2 + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Gems
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.arc(0, -PLAYER_HEIGHT / 2 - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (cosmetics.equippedHat === 'shades') {
      // Cool sunglasses across the eyes
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.5;
      const eyeY = -6;
      const wTotal = 28;
      const h = 7;
      // Left lens
      roundRect(ctx, -wTotal / 2, eyeY - h / 2, wTotal / 2 - 2, h, 2);
      ctx.fill();
      ctx.stroke();
      // Right lens
      roundRect(ctx, 2, eyeY - h / 2, wTotal / 2 - 2, h, 2);
      ctx.fill();
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(-2, eyeY);
      ctx.lineTo(2, eyeY);
      ctx.stroke();
      // Temples
      ctx.beginPath();
      ctx.moveTo(-wTotal / 2, eyeY - 1);
      ctx.lineTo(-wTotal / 2 - 4, eyeY - 1);
      ctx.moveTo(wTotal / 2, eyeY - 1);
      ctx.lineTo(wTotal / 2 + 4, eyeY - 1);
      ctx.stroke();
    }

    // No trail for hats; shades are drawn on the face

    ctx.restore(); // player transform

    ctx.restore(); // camera transform
  }

  // Color utility functions
  function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function lightenColor(hex, amount) {
    return adjustColor(hex, amount);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  window.addEventListener('resize', resizeCanvas);
  init();
})();
