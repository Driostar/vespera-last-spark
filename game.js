const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

// World Size
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;

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

// Screen Shake State
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

// Inputs
const keys = {};
const mouse = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, isMoving: false };
let mouseTimeout = null;

// Joysticks & Touch Locks
const moveJoystick = { active: false, id: null, startX: 0, startY: 0, moveX: 0, moveY: 0 };
const bowJoystick = { active: false, id: null, angle: 0, dragX: 0, dragY: 0, dist: 0 };

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') performDash();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// UI Buttons (Fixed to Screen Space)
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
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const screenY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    mouse.x = screenX + camera.x;
    mouse.y = screenY + camera.y;
    
    mouse.isMoving = true;
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(() => {
        mouse.isMoving = false;
    }, 100);
});

canvas.addEventListener('mousedown', e => {
    if (isTouchDevice) return;
    if (e.button === 2) performBow(player.angle);
    else performSlash();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Solid Dungeon Walls & Pillars (Obstacles)
const walls = [
    // Outer boundaries / border walls (handled by world bounds, but let's add interior pillars & partitions)
    { x: 400, y: 200, w: 60, h: 160 },
    { x: 1000, y: 200, w: 60, h: 160 },
    { x: 700, y: 550, w: 200, h: 60 },
    { x: 300, y: 650, w: 100, h: 100 },
    { x: 1200, y: 600, w: 120, h: 80 }
];

// Player State
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

const slashes = [];
const arrows = [];
const particles = [];
const projectiles = [];

// Turrets
const turrets = [
    { x: 500, y: 120, hp: 4, maxHp: 4, shootTimer: 2, range: 320, hitFlash: 0 },
    { x: 1100, y: 120, hp: 4, maxHp: 4, shootTimer: 3, range: 320, hitFlash: 0 },
    { x: 900, y: 750, hp: 4, maxHp: 4, shootTimer: 2.5, range: 320, hitFlash: 0 }
];

// Collision helper function (Circle vs Box)
function checkCircleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    let closestX = Math.max(rx, Math.min(cx, rx + rw));
    let closestY = Math.max(ry, Math.min(cy, ry + rh));
    let distX = cx - closestX;
    let distY = cy - closestY;
    return (distX * distX + distY * distY) < (cr * cr);
}

function performDash() {
    if (player.dashCooldown > 0 || player.isDashing) return;

    player.isDashing = true;
    player.dashTimer = 0.2;
    player.dashCooldown = player.maxDashCooldown;
    player.dashDirX = Math.cos(player.angle);
    player.dashDirY = Math.sin(player.angle);
    
    triggerShake(0.15, 4);
    createEmberParticles(player.x, player.y, '#78dcff', 12);
}

function performSlash() {
    if (player.slashCooldown > 0) return;

    player.slashCooldown = player.maxSlashCooldown;
    slashes.push({
        x: player.x,
        y: player.y,
        angle: player.angle,
        radius: 38,
        life: 0.15,
        maxLife: 0.15
    });

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
    createEmberParticles(player.x + Math.cos(shootAngle) * 15, player.y + Math.sin(shootAngle) * 15, '#78dcff', 8);
}

function createEmberParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 140,
            vy: (Math.random() - 0.5) * 140,
            life: 0.5,
            maxLife: 0.5,
            color: color
        });
    }
}

const guidingLight = {
    x: WORLD_WIDTH / 2 + 20,
    y: WORLD_HEIGHT / 2 - 20,
    targetX: WORLD_WIDTH / 2,
    targetY: WORLD_HEIGHT / 2,
    pulse: 0
};

function update(dt) {
    if (shakeTimer > 0) {
        shakeTimer -= dt;
        if (shakeTimer < 0) shakeTimer = 0;
    }

    if (player.dashCooldown > 0) {
        player.dashCooldown -= dt;
        if (player.dashCooldown < 0) player.dashCooldown = 0;
    }

    if (player.slashCooldown > 0) {
        player.slashCooldown -= dt;
        if (player.slashCooldown < 0) player.slashCooldown = 0;
    }

    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (moveJoystick.active) {
        const jx = moveJoystick.moveX - moveJoystick.startX;
        const jy = moveJoystick.moveY - moveJoystick.startY;
        const dist = Math.hypot(jx, jy);
        if (dist > 5) {
            dx = jx / dist;
            dy = jy / dist;
        }
    }

    if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
    }

    const isBowArmed = bowJoystick.active && bowJoystick.dist > BOW_DEADZONE;
    
    if (isBowArmed) {
        player.angle = bowJoystick.angle;
    } else if (dx !== 0 || dy !== 0) {
        player.angle = Math.atan2(dy, dx);
    } else if (mouse.isMoving && !isTouchDevice) {
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }

    const moveSpeed = isBowArmed ? player.speed * 0.7 : player.speed;

    if (player.isDashing) {
        player.dashTimer -= dt;
        
        // Move with wall collision checks during dash
        let nextX = player.x + player.dashDirX * player.dashSpeed * dt;
        let nextY = player.y + player.dashDirY * player.dashSpeed * dt;
        
        let collideX = walls.some(w => checkCircleRectCollision(nextX, player.y, player.size, w.x, w.y, w.w, w.h));
        let collideY = walls.some(w => checkCircleRectCollision(player.x, nextY, player.size, w.x, w.y, w.w, w.h));

        if (!collideX) player.x = nextX;
        if (!collideY) player.y = nextY;

        player.ghosts.push({ x: player.x, y: player.y, angle: player.angle, alpha: 0.6 });
        if (player.dashTimer <= 0) player.isDashing = false;
    } else {
        // Separate Axis Movement for smooth sliding against walls
        let nextX = player.x + dx * moveSpeed * dt;
        let collideX = walls.some(w => checkCircleRectCollision(nextX, player.y, player.size, w.x, w.y, w.w, w.h));
        if (!collideX) player.x = nextX;

        let nextY = player.y + dy * moveSpeed * dt;
        let collideY = walls.some(w => checkCircleRectCollision(player.x, nextY, player.size, w.x, w.y, w.w, w.h));
        if (!collideY) player.y = nextY;
    }

    // Clamp within world bounds
    player.x = Math.max(player.size, Math.min(WORLD_WIDTH - player.size, player.x));
    player.y = Math.max(player.size, Math.min(WORLD_HEIGHT - player.size, player.y));

    camera.update(player.x, player.y);

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = player.ghosts.length - 1; i >= 0; i--) {
        player.ghosts[i].alpha -= dt * 3;
        if (player.ghosts[i].alpha <= 0) player.ghosts.splice(i, 1);
    }

    turrets.forEach(t => {
        if (t.hitFlash > 0) t.hitFlash -= dt;
    });

    // Update Arrows & Wall Collisions
    for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        const stepX = a.vx * dt;
        const stepY = a.vy * dt;

        a.x += stepX;
        a.y += stepY;
        a.distTraveled += Math.hypot(stepX, stepY);

        let hit = false;
        
        // Check wall collision for arrows
        if (walls.some(w => a.x >= w.x && a.x <= w.x + w.w && a.y >= w.y && a.y <= w.y + w.h)) {
            createEmberParticles(a.x, a.y, '#78dcff', 6);
            hit = true;
        }

        turrets.forEach(t => {
            if (t.hp > 0 && Math.hypot(a.x - t.x, a.y - t.y) < 20) {
                t.hp -= 2;
                t.hitFlash = 0.15;
                triggerShake(0.12, 3);
                createEmberParticles(t.x, t.y, '#78dcff', 10);
                hit = true;
            }
        });

        if (a.distTraveled >= a.maxDist) {
            createEmberParticles(a.x, a.y, '#78dcff', 6);
            hit = true;
        }

        if (hit) arrows.splice(i, 1);
    }

    // Update Slashes
    for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.life -= dt;

        turrets.forEach(t => {
            if (t.hp > 0) {
                const dist = Math.hypot(s.x + Math.cos(s.angle) * 20 - t.x, s.y + Math.sin(s.angle) * 20 - t.y);
                if (dist < 35) {
                    t.hp -= 1;
                    t.hitFlash = 0.15;
                    triggerShake(0.15, 5);
                    player.energy = Math.min(player.maxEnergy, player.energy + 25);
                    createEmberParticles(t.x, t.y, '#ff4757', 12);
                }
            }
        });

        if (s.life <= 0) slashes.splice(i, 1);
    }

    // Turret Attack Behavior
    turrets.forEach(t => {
        if (t.hp > 0) {
            const distToPlayer = Math.hypot(player.x - t.x, player.y - t.y);
            if (distToPlayer < t.range) {
                t.shootTimer -= dt;
                if (t.shootTimer <= 0) {
                    t.shootTimer = 2.2;
                    const angle = Math.atan2(player.y - t.y, player.x - t.x);
                    projectiles.push({
                        x: t.x,
                        y: t.y,
                        vx: Math.cos(angle) * 160,
                        vy: Math.sin(angle) * 160,
                        life: 3
                    });
                }
            }
        }
    });

    // Update Projectiles & Wall Collisions
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Check wall collision for enemy projectiles
        if (walls.some(w => p.x >= w.x && p.x <= w.x + w.w && p.y >= w.y && p.y <= w.y + w.h)) {
            projectiles.splice(i, 1);
            continue;
        }

        if (!player.isDashing) {
            const dist = Math.hypot(p.x - player.x, p.y - player.y);
            if (dist < player.size + 4) {
                triggerShake(0.2, 6);
                createEmberParticles(player.x, player.y, '#ff4757', 14);
                projectiles.splice(i, 1);
                continue;
            }
        }

        if (p.life <= 0) projectiles.splice(i, 1);
    }

    // Companion hover logic
    guidingLight.pulse += dt * 3;
    const floatOffsetX = Math.cos(guidingLight.pulse) * 6;
    const floatOffsetY = Math.sin(guidingLight.pulse) * 6;

    if (isBowArmed) {
        guidingLight.targetX = player.x + Math.cos(player.angle) * 120 + floatOffsetX;
        guidingLight.targetY = player.y + Math.sin(player.angle) * 120 + floatOffsetY;
    } else {
        const shoulderAngle = player.angle - Math.PI / 4;
        guidingLight.targetX = player.x + Math.cos(shoulderAngle) * 22 + floatOffsetX;
        guidingLight.targetY = player.y + Math.sin(shoulderAngle) * 22 + floatOffsetY;
    }

    guidingLight.x += (guidingLight.targetX - guidingLight.x) * dt * 6;
    guidingLight.y += (guidingLight.targetY - guidingLight.y) * dt * 6;
}

function draw() {
    ctx.save();

    if (shakeTimer > 0) {
        const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
        const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
        ctx.translate(offsetX, offsetY);
    }

    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // World Grid Floor
    ctx.strokeStyle = '#1d2230';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_WIDTH; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
    }

    // Draw Dungeon Walls & Pillars
    walls.forEach(w => {
        ctx.fillStyle = '#1f293d';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        
        // Mossy accent dots
        ctx.fillStyle = '#10b981';
        ctx.fillRect(w.x + 4, w.y + 4, 6, 6);
        ctx.fillRect(w.x + w.w - 10, w.y + w.h - 10, 6, 6);
    });

    // World Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });

    // Turrets
    turrets.forEach(t => {
        if (t.hp > 0) {
            ctx.fillStyle = t.hitFlash > 0 ? '#ffffff' : '#2f3542';
            ctx.fillRect(t.x - 12, t.y - 12, 24, 24);

            ctx.fillStyle = t.shootTimer < 0.6 ? '#ff6b81' : '#ff4757';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff4757';
            ctx.fillRect(t.x - 12, t.y - 18, (t.hp / t.maxHp) * 24, 3);
        }
    });

    // Enemy Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Player Arrows
    arrows.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        ctx.fillStyle = '#78dcff';
        ctx.fillRect(-8, -1.5, 16, 3);
        ctx.restore();
    });

    // Ghosts
    player.ghosts.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle);
        ctx.fillStyle = `rgba(120, 220, 255, ${g.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, 0, player.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = player.isDashing ? '#78dcff' : '#2d3748';
    ctx.beginPath();
    ctx.arc(0, 0, player.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, -3, 10, 6);
    ctx.restore();

    // Aim Line
    if (bowJoystick.active && bowJoystick.dist > BOW_DEADZONE) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(guidingLight.x, guidingLight.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Sword Slashes
    slashes.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        const progress = 1 - (s.life / s.maxLife);
        ctx.strokeStyle = `rgba(72, 239, 173, ${1 - progress})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        ctx.restore();
    });

    // Companion Spirit Torch
    const glowGradient = ctx.createRadialGradient(
        guidingLight.x, guidingLight.y, 1,
        guidingLight.x, guidingLight.y, 24
    );
    const isArmed = bowJoystick.active && bowJoystick.dist > BOW_DEADZONE;
    glowGradient.addColorStop(0, isArmed ? 'rgba(168, 85, 247, 0.95)' : 'rgba(255, 140, 60, 0.95)');
    glowGradient.addColorStop(0.5, isArmed ? 'rgba(147, 51, 234, 0.4)' : 'rgba(230, 90, 20, 0.35)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(guidingLight.x, guidingLight.y, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(guidingLight.x, guidingLight.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();

    // HUD Elements
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(15, 15, 120, 12);
    ctx.fillStyle = '#78dcff';
    ctx.fillRect(15, 15, (player.energy / player.maxEnergy) * 120, 12);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(15, 15, 120, 12);

    // Touch UI Controls
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        if (moveJoystick.active) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(moveJoystick.startX, moveJoystick.startY, 32, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(moveJoystick.moveX, moveJoystick.moveY, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        // DASH BUTTON
        ctx.fillStyle = player.dashCooldown > 0 ? 'rgba(120, 220, 255, 0.15)' : 'rgba(120, 220, 255, 0.35)';
        ctx.strokeStyle = player.dashCooldown > 0 ? 'rgba(120, 220, 255, 0.3)' : 'rgba(120, 220, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dashBtnArea.x, dashBtnArea.y, dashBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DASH', dashBtnArea.x, dashBtnArea.y + 3);

        if (player.dashCooldown > 0) {
            const ratio = player.dashCooldown / player.maxDashCooldown;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.beginPath();
            ctx.moveTo(dashBtnArea.x, dashBtnArea.y);
            ctx.arc(dashBtnArea.x, dashBtnArea.y, dashBtnArea.r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
            ctx.closePath();
            ctx.fill();
        }

        // SLASH BUTTON
        ctx.fillStyle = player.slashCooldown > 0 ? 'rgba(72, 239, 173, 0.15)' : 'rgba(72, 239, 173, 0.35)';
        ctx.strokeStyle = player.slashCooldown > 0 ? 'rgba(72, 239, 173, 0.3)' : 'rgba(72, 239, 173, 0.9)';
        ctx.beginPath(); ctx.arc(slashBtnArea.x, slashBtnArea.y, slashBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SLASH', slashBtnArea.x, slashBtnArea.y + 3);

        if (player.slashCooldown > 0) {
            const ratio = player.slashCooldown / player.maxSlashCooldown;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.beginPath();
            ctx.moveTo(slashBtnArea.x, slashBtnArea.y);
            ctx.arc(slashBtnArea.x, slashBtnArea.y, slashBtnArea.r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
            ctx.closePath();
            ctx.fill();
        }

        // BOW BUTTON
        const inCancelZone = bowJoystick.active && bowJoystick.dist <= BOW_DEADZONE;
        ctx.fillStyle = inCancelZone ? 'rgba(255, 71, 87, 0.45)' : (bowJoystick.active ? 'rgba(168, 85, 247, 0.65)' : 'rgba(168, 85, 247, 0.35)');
        ctx.strokeStyle = inCancelZone ? '#ff4757' : 'rgba(168, 85, 247, 0.9)';
        ctx.beginPath(); ctx.arc(bowBtnArea.x, bowBtnArea.y, bowBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(inCancelZone ? 'CANCEL' : 'BOW', bowBtnArea.x, bowBtnArea.y + 3);

        if (bowJoystick.active) {
            ctx.strokeStyle = inCancelZone ? 'rgba(255, 71, 87, 0.6)' : 'rgba(168, 85, 247, 0.8)';
            ctx.beginPath();
            ctx.arc(bowBtnArea.x, bowBtnArea.y, BOW_DEADZONE, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = inCancelZone ? '#ff4757' : '#ffffff';
            ctx.beginPath();
            ctx.arc(bowJoystick.dragX, bowJoystick.dragY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
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
