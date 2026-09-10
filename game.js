const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;

// Game States
const STATE_DUNGEON = 1;
const STATE_VILLAGE = 2;
let gameState = STATE_DUNGEON;

// Player Progression & Loot
const playerStats = {
    fragments: 0,
    maxHp: 100,
    hp: 100,
    damageLevel: 1
};

// Camera State
const camera = {
    x: 0,
    y: 0,
    update(targetX, targetY) {
        this.x += (targetX - CANVAS_WIDTH / 2 - this.x) * 0.1;
        this.y += (targetY - CANVAS_HEIGHT / 2 - this.y) * 0.1;
        this.x = Math.max(0, Math.min(WORLD_WIDTH - CANVAS_WIDTH, this.x));
        this.y = Math.max(0, Math.min(WORLD_HEIGHT - CANVAS_HEIGHT, this.y));
    }
};

let shakeTimer = 0;
let shakeIntensity = 0;

function triggerShake(duration, intensity) {
    shakeTimer = duration;
    shakeIntensity = intensity;
}

function resizeCanvas() {
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    if (windowRatio < gameRatio) {
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = (window.innerWidth / gameRatio) + 'px';
    } else {
        canvas.style.width = (window.innerHeight * gameRatio) + 'px';
        canvas.style.height = window.innerHeight + 'px';
    }
}

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const keys = {};
const mouse = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, isMoving: false };
let mouseTimeout = null;

const moveJoystick = { active: false, id: null, startX: 0, startY: 0, moveX: 0, moveY: 0 };
const bowJoystick = { active: false, id: null, angle: 0, dragX: 0, dragY: 0, dist: 0 };

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') performDash();
    if (e.code === 'KeyR' && gameState === STATE_VILLAGE) resetDungeon();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

const dashBtnArea = { x: CANVAS_WIDTH - 50, y: CANVAS_HEIGHT - 45, r: 24 };
const slashBtnArea = { x: CANVAS_WIDTH - 50, y: CANVAS_HEIGHT - 105, r: 24 };
const bowBtnArea = { x: CANVAS_WIDTH - 110, y: CANVAS_HEIGHT - 45, r: 26 };
const BOW_DEADZONE = 14;

let isTouchDevice = false;

function getCanvasTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
        y: (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
    };
}

function handleTouchStart(e) {
    e.preventDefault();
    isTouchDevice = true;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const pos = getCanvasTouchPos(touch);

        if (gameState === STATE_VILLAGE) {
            resetDungeon();
            continue;
        }

        if (Math.hypot(pos.x - dashBtnArea.x, pos.y - dashBtnArea.y) < dashBtnArea.r + 15) {
            performDash();
            continue;
        }

        if (Math.hypot(pos.x - slashBtnArea.x, pos.y - slashBtnArea.y) < slashBtnArea.r + 15) {
            performSlash();
            continue;
        }

        if (Math.hypot(pos.x - bowBtnArea.x, pos.y - bowBtnArea.y) < bowBtnArea.r + 20 && !bowJoystick.active) {
            bowJoystick.active = true;
            bowJoystick.id = touch.identifier;
            bowJoystick.dragX = pos.x;
            bowJoystick.dragY = pos.y;
            bowJoystick.dist = 0;
            bowJoystick.angle = player.angle;
            continue;
        }

        if (pos.x < CANVAS_WIDTH / 2 && !moveJoystick.active) {
            moveJoystick.active = true;
            moveJoystick.id = touch.identifier;
            moveJoystick.startX = pos.x;
            moveJoystick.startY = pos.y;
            moveJoystick.moveX = pos.x;
            moveJoystick.moveY = pos.y;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (gameState !== STATE_DUNGEON) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const pos = getCanvasTouchPos(touch);

        if (moveJoystick.active && touch.identifier === moveJoystick.id) {
            moveJoystick.moveX = pos.x;
            moveJoystick.moveY = pos.y;
        }

        if (bowJoystick.active && touch.identifier === bowJoystick.id) {
            bowJoystick.dragX = pos.x;
            bowJoystick.dragY = pos.y;

            const dx = pos.x - bowBtnArea.x;
            const dy = pos.y - bowBtnArea.y;
            bowJoystick.dist = Math.hypot(dx, dy);

            if (bowJoystick.dist > BOW_DEADZONE) {
                bowJoystick.angle = Math.atan2(dy, dx);
            }
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (gameState !== STATE_DUNGEON) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (moveJoystick.active && touch.identifier === moveJoystick.id) {
            moveJoystick.active = false;
            moveJoystick.id = null;
        }

        if (bowJoystick.active && touch.identifier === bowJoystick.id) {
            if (bowJoystick.dist > BOW_DEADZONE) {
                performBow(bowJoystick.angle);
            }
            bowJoystick.active = false;
            bowJoystick.id = null;
            bowJoystick.dist = 0;
        }
    }
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

canvas.addEventListener('mousemove', e => {
    if (gameState !== STATE_DUNGEON) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const screenY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    mouse.x = screenX + camera.x;
    mouse.y = screenY + camera.y;
    
    mouse.isMoving = true;
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(() => { mouse.isMoving = false; }, 100);
});

canvas.addEventListener('mousedown', e => {
    if (isTouchDevice || gameState !== STATE_DUNGEON) return;
    if (e.button === 2) performBow(player.angle);
    else performSlash();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

const walls = [
    { x: 400, y: 200, w: 60, h: 160 },
    { x: 1000, y: 200, w: 60, h: 160 },
    { x: 700, y: 550, w: 200, h: 60 },
    { x: 300, y: 650, w: 100, h: 100 },
    { x: 1200, y: 600, w: 120, h: 80 }
];

const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    size: 14,
    speed: 130,
    angle: 0,
    energy: 100,
    maxEnergy: 100,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    maxDashCooldown: 1.6,
    slashCooldown: 0,
    maxSlashCooldown: 0.8,
    dashDirX: 0,
    dashDirY: 0,
    dashSpeed: 380,
    ghosts: []
};

let slashes = [];
let arrows = [];
let particles = [];
let projectiles = [];

let turrets = [
    { x: 500, y: 120, hp: 4, maxHp: 4, shootTimer: 2, range: 320, hitFlash: 0 },
    { x: 1100, y: 120, hp: 4, maxHp: 4, shootTimer: 3, range: 320, hitFlash: 0 },
    { x: 900, y: 750, hp: 4, maxHp: 4, shootTimer: 2.5, range: 320, hitFlash: 0 }
];

function resetDungeon() {
    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;
    player.energy = 100;
    slashes = [];
    arrows = [];
    projectiles = [];
    particles = [];
    turrets = [
        { x: 500, y: 120, hp: 4, maxHp: 4, shootTimer: 2, range: 320, hitFlash: 0 },
        { x: 1100, y: 120, hp: 4, maxHp: 4, shootTimer: 3, range: 320, hitFlash: 0 },
        { x: 900, y: 750, hp: 4, maxHp: 4, shootTimer: 2.5, range: 320, hitFlash: 0 }
    ];
    gameState = STATE_DUNGEON;
}

function checkCircleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    let closestX = Math.max(rx, Math.min(cx, rx + rw));
    let closestY = Math.max(ry, Math.min(cy, ry + rh));
    return ((cx - closestX) ** 2 + (cy - closestY) ** 2) < (cr * cr);
}

function performDash() {
    if (player.dashCooldown > 0 || player.isDashing) return;
    player.isDashing = true;
    player.dashTimer = 0.2;
    player.dashCooldown = player.maxDashCooldown;
    player.dashDirX = Math.cos(player.angle);
    player.dashDirY = Math.sin(player.angle);
    triggerShake(0.15, 4);
}

function performSlash() {
    if (player.slashCooldown > 0) return;
    player.slashCooldown = player.maxSlashCooldown;
    slashes.push({ x: player.x, y: player.y, angle: player.angle, radius: 38, life: 0.15, maxLife: 0.15 });
    triggerShake(0.1, 3);
}

function performBow(shootAngle) {
    if (player.energy < 25) return;
    player.energy -= 25;
    arrows.push({
        x: player.x + Math.cos(shootAngle) * 15,
        y: player.y + Math.sin(shootAngle) * 15,
        vx: Math.cos(shootAngle) * 450,
        vy: Math.sin(shootAngle) * 450,
        angle: shootAngle,
        distTraveled: 0,
        maxDist: 280
    });
    triggerShake(0.1, 2);
}

const guidingLight = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, targetX: 0, targetY: 0, pulse: 0 };

function update(dt) {
    if (gameState === STATE_VILLAGE) return;

    if (shakeTimer > 0) shakeTimer -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.slashCooldown > 0) player.slashCooldown -= dt;

    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (moveJoystick.active) {
        let jx = moveJoystick.moveX - moveJoystick.startX;
        let jy = moveJoystick.moveY - moveJoystick.startY;
        let dist = Math.hypot(jx, jy);
        if (dist > 5) { dx = jx / dist; dy = jy / dist; }
    }

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    const isBowArmed = bowJoystick.active && bowJoystick.dist > BOW_DEADZONE;
    if (isBowArmed) player.angle = bowJoystick.angle;
    else if (dx !== 0 || dy !== 0) player.angle = Math.atan2(dy, dx);
    else if (mouse.isMoving && !isTouchDevice) player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    const moveSpeed = isBowArmed ? player.speed * 0.7 : player.speed;

    if (player.isDashing) {
        player.dashTimer -= dt;
        let nx = player.x + player.dashDirX * player.dashSpeed * dt;
        let ny = player.y + player.dashDirY * player.dashSpeed * dt;
        if (!walls.some(w => checkCircleRectCollision(nx, player.y, player.size, w.x, w.y, w.w, w.h))) player.x = nx;
        if (!walls.some(w => checkCircleRectCollision(player.x, ny, player.size, w.x, w.y, w.w, w.h))) player.y = ny;
        if (player.dashTimer <= 0) player.isDashing = false;
    } else {
        let nx = player.x + dx * moveSpeed * dt;
        if (!walls.some(w => checkCircleRectCollision(nx, player.y, player.size, w.x, w.y, w.w, w.h))) player.x = nx;
        let ny = player.y + dy * moveSpeed * dt;
        if (!walls.some(w => checkCircleRectCollision(player.x, ny, player.size, w.x, w.y, w.w, w.h))) player.y = ny;
    }

    camera.update(player.x, player.y);

    // Check Win Condition (All turrets destroyed)
    if (turrets.every(t => t.hp <= 0)) {
        playerStats.fragments += 3;
        gameState = STATE_VILLAGE;
    }

    turrets.forEach(t => { if (t.hitFlash > 0) t.hitFlash -= dt; });

    arrows.forEach((a, i) => {
        a.x += a.vx * dt; a.y += a.vy * dt;
        a.distTraveled += Math.hypot(a.vx * dt, a.vy * dt);
        let hit = walls.some(w => a.x >= w.x && a.x <= w.x + w.w && a.y >= w.y && a.y <= w.y + w.h);
        turrets.forEach(t => {
            if (t.hp > 0 && Math.hypot(a.x - t.x, a.y - t.y) < 20) {
                t.hp -= 2; t.hitFlash = 0.15; hit = true;
            }
        });
        if (a.distTraveled >= a.maxDist) hit = true;
        if (hit) arrows.splice(i, 1);
    });

    slashes.forEach((s, i) => {
        s.life -= dt;
        turrets.forEach(t => {
            if (t.hp > 0 && Math.hypot(s.x - t.x, s.y - t.y) < 35) {
                t.hp -= 1; t.hitFlash = 0.15;
                player.energy = Math.min(player.maxEnergy, player.energy + 25);
            }
        });
        if (s.life <= 0) slashes.splice(i, 1);
    });

    turrets.forEach(t => {
        if (t.hp > 0 && Math.hypot(player.x - t.x, player.y - t.y) < t.range) {
            t.shootTimer -= dt;
            if (t.shootTimer <= 0) {
                t.shootTimer = 2.2;
                let angle = Math.atan2(player.y - t.y, player.x - t.x);
                projectiles.push({ x: t.x, y: t.y, vx: Math.cos(angle) * 160, vy: Math.sin(angle) * 160, life: 3 });
            }
        }
    });

    guidingLight.pulse += dt * 3;
    guidingLight.x = player.x + Math.cos(player.angle - Math.PI / 4) * 22;
    guidingLight.y = player.y + Math.sin(player.angle - Math.PI / 4) * 22;
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState === STATE_VILLAGE) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SAFE VILLAGE HAVEN', CANVAS_WIDTH / 2, 120);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#78dcff';
        ctx.fillText(`Corrupted Fragments Collected: ${playerStats.fragments}`, CANVAS_WIDTH / 2, 170);

        ctx.fillStyle = '#4ade80';
        ctx.fillText('Press [R] or Tap Screen to Return to Dungeon', CANVAS_WIDTH / 2, 260);
        return;
    }

    ctx.save();
    if (shakeTimer > 0) ctx.translate((Math.random() - 0.5) * shakeIntensity * 2, (Math.random() - 0.5) * shakeIntensity * 2);

    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // Walls
    walls.forEach(w => {
        ctx.fillStyle = '#1f293d';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Turrets
    turrets.forEach(t => {
        if (t.hp > 0) {
            ctx.fillStyle = t.hitFlash > 0 ? '#ffffff' : '#2f3542';
            ctx.fillRect(t.x - 12, t.y - 12, 24, 24);
            ctx.fillStyle = '#ff4757';
            ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, Math.PI * 2); ctx.fill();
        }
    });

    // Arrows & Projectiles
    arrows.forEach(a => { ctx.fillStyle = '#78dcff'; ctx.fillRect(a.x - 8, a.y - 1.5, 16, 3); });
    projectiles.forEach(p => { ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });

    // Player
    ctx.fillStyle = player.isDashing ? '#78dcff' : '#2d3748';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2); ctx.fill();

    // Slashes
    slashes.forEach(s => {
        ctx.strokeStyle = '#48efad'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, -Math.PI / 3, Math.PI / 3); ctx.stroke();
    });

    // Companion Spirit Light
    let grad = ctx.createRadialGradient(guidingLight.x, guidingLight.y, 1, guidingLight.x, guidingLight.y, 24);
    grad.addColorStop(0, 'rgba(255, 140, 60, 0.95)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(guidingLight.x, guidingLight.y, 24, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(15, 15, 120, 12);
    ctx.fillStyle = '#78dcff';
    ctx.fillRect(15, 15, (player.energy / player.maxEnergy) * 120, 12);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(15, 15, 120, 12);
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
