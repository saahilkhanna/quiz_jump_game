/**
 * QuizJump - Physics and collision
 */
const QuizJumpPhysics = {
  GRAVITY: 980,
  FRICTION: 0.87,
  ACCEL: 36,
  MAX_SPEED: 400,

  update(player, input, dt, settings = {}, gravityMult = 1) {
    const sens = settings.speedSensitivity ?? 1.0;
    const accel = this.ACCEL * sens;
    const maxSpeed = this.MAX_SPEED * sens;

    if (input.left) player.vx -= accel;
    if (input.right) player.vx += accel;
    player.vx *= this.FRICTION;
    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));

    player.vy += this.GRAVITY * dt * gravityMult;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  },

  jump(player, jumpVelocity = 600) {
    player.vy = -jumpVelocity;
  },

  boost(player, jumpVelocity = 600) {
    player.vy = -jumpVelocity * 0.45;
  },

  checkLanding(player, platform, correctAnswer) {
    const feetY = player.y + player.height;
    const platformTop = platform.y;
    const platformLeft = platform.x;
    const platformRight = platform.x + platform.width;
    const playerLeft = player.x;
    const playerRight = player.x + player.width;

    if (player.vy <= 0) return null;

    const landingTolerance = 12;
    if (feetY < platformTop - 2) return null;
    if (feetY > platformTop + landingTolerance) return null;

    if (playerRight <= platformLeft || playerLeft >= platformRight) return null;

    const isCorrect = platform.answer === correctAnswer;
    return isCorrect ? 'correct' : 'wrong';
  },

  isOnGround(player, ground, platforms, correctPlatformId) {
    const feetY = player.y + player.height;
    const tolerance = 4;

    if (ground) {
      const gTop = ground.y;
      if (Math.abs(feetY - gTop) <= tolerance && player.vx !== undefined) {
        const overlap = player.x + player.width > ground.x && player.x < ground.x + ground.width;
        if (overlap) return true;
      }
    }

    for (const p of platforms) {
      if (p.answer !== correctPlatformId) continue;
      const pTop = p.y + p.height;
      if (Math.abs(feetY - pTop) <= tolerance) {
        const overlap = player.x + player.width > p.x && player.x < p.x + p.width;
        if (overlap) return true;
      }
    }
    return false;
  },

  resolveGroundCollision(player, ground) {
    if (!ground) return;
    const feetY = player.y + player.height;
    if (feetY >= ground.y && player.vy > 0) {
      player.y = ground.y - player.height;
      player.vy = 0;
    }
  },

  resolvePlatformCollision(player, platform, correctAnswer) {
    if (platform.answer !== correctAnswer) return;
    const feetY = player.y + player.height;
    const platformTop = platform.y;
    if (feetY >= platformTop && player.vy > 0) {
      const overlap = player.x + player.width > platform.x && player.x < platform.x + platform.width;
      if (overlap) {
        player.y = platformTop - player.height;
        player.vy = 0;
      }
    }
  },
};
