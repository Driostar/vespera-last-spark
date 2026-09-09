const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

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
const mouse = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
const touchJoystick = { active: false, id: null, startX: 0, startY: 0, moveX: 0, moveY: 0 };

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') performDash();
    if (e.key.toLowerCase() === 'e') performBow();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Repositioned UI Buttons specifically fitted for iPad screens
const dashBtnArea = { x: CANVAS_WIDTH - 60, y: CANVAS_HEIGHT - 50, r: 28 };
const slashBtnArea = { x: CANVAS_WIDTH - 60, y: CANVAS_HEIGHT - 125, r: 28 };
const bowBtnArea = { x: CANVAS_WIDTH - 130, y: CANVAS_HEIGHT - 50, r: 28 };

function getCanvasTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
        y: (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
    };
}

function handleTouchStart(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const pos = getCanvasTouchPos(touch);

        // Check Button Taps
        if (Math.hypot(pos.x - dashBtnArea.x, pos.y - dashBtnArea.y) < dashBtnArea.r + 15) {
            performDash();
            continue;
        }
        if (Math.hypot(pos.x - slashBtnArea.x, pos.y - slashBtnArea.y) < slashBtnArea.r + 15) {
            performSlash();
            continue;
        }
        if (Math.hypot(pos.x - bowBtnArea.x, pos.y - bowBtnArea.y) < bowBtnArea.r + 15) {
            performBow();
            continue;
        }

        // Left half touch activates virtual movement joystick
        if (pos.x < CANVAS_WIDTH / 2 && !touchJoystick.active) {
            touchJoystick.active = true;
            touchJoystick.id = touch.identifier;
            touchJoystick.startX = pos.x;
            touchJoystick.startY = pos.y;
            touchJoystick.moveX = pos.x;
            touchJoystick.moveY = pos.y;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touchJoystick.active && touch.identifier === touchJoystick.id) {
            const pos = getCanvasTouchPos(touch);
            touchJoystick.moveX = pos.x;
            touchJoystick.moveY = pos.y;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (touchJoystick.active && e.changedTouches[i].identifier === touchJoystick.id) {
            touchJoystick.active = false;
            touchJoystick.id = null;
        }
    }
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    mouse.y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
});
canvas.addEventListener('mousedown', e => {
    if (e.button === 2) performBow();
    else performSlash();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Player State
const player = {
    x: 150,
    y: CANVAS_HEIGHT / 2,
    size: 16,
    speed: 130,
    angle: 0,
    energy: 100,
    maxEnergy: 100,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: 0,
    dashSpeed: 380,
    ghosts: []
};

const slashes = [];
const arrows = [];
const particles = [];
const projectiles = [];

// Rune-Sentry Turrets
const turrets = [
    { x: 620, y: 140, hp: 4, maxHp: 4, shootTimer: 2, range: 320 },
    { x: 620, y: 310, hp: 4, maxHp: 4, shootTimer: 3, range: 320 }
];

function performDash() {
    if (player.dashCooldown > 0 || player.isDashing) return;
    player.isDashing = true;
    player.dashTimer = 0.2;
    player.dashCooldown = 0.5;
    player.dashDirX = Math.cos(player.angle);
    player.dashDirY = Math.sin(player.angle);
}

function performSlash() {
    if (slashes.length > 0) return;
    slashes.push({
        x: player.x,
        y: player.y,
        angle: player.angle,
        radius: 38,
        life: 0.15,
        maxLife: 0.15
    });
}

function performBow() {
    if (player.energy < 25) return;
    player.energy -= 25;

    arrows.push({
        x: player.x + Math.cos(player.angle) * 15,
        y: player.y + Math.sin(player.angle) * 15,
        vx: Math.cos(player.angle) * 420,
        vy: Math.sin(player.angle) * 420,
        angle: player.angle,
        life: 2
    });

    createEmberParticles(player.x + Math.cos(player.angle) * 15, player.y + Math.sin(player.angle) * 15, '#78dcff');
}

function createEmberParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 90,
            vy: (Math.random() - 0.5) * 90,
            life: 0.4,
            maxLife: 0.4,
            color: color
        });
    }
}

const guidingLight = {
    x: 170,
    y: CANVAS_HEIGHT / 2 - 20,
    targetX: 150,
    targetY: CANVAS_HEIGHT / 2,
    pulse: 0
};

function update(dt) {
    if (player.dashCooldown > 0) player.dashCooldown -= dt;

    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (touchJoystick.active) {
        const jx = touchJoystick.moveX - touchJoystick.startX;
        const jy = touchJoystick.moveY - touchJoystick.startY;
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

    if (touchJoystick.active && (dx !== 0 || dy !== 0)) {
        player.angle = Math.atan2(dy, dx);
    } else if (!touchJoystick.active) {
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }

    if (player.isDashing) {
        player.dashTimer -= dt;
        player.x += player.dashDirX * player.dashSpeed * dt;
        player.y += player.dashDirY * player.dashSpeed * dt;
        player.ghosts.push({ x: player.x, y: player.y, angle: player.angle, alpha: 0.6 });

        if (player.dashTimer <= 0) player.isDashing = false;
    } else {
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
    }

    player.x = Math.max(player.size, Math.min(CANVAS_WIDTH - player.size, player.x));
    player.y = Math.max(player.size, Math.min(CANVAS_HEIGHT - player.size, player.y));

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Ghosts
    for (let i = player.ghosts.length - 1; i >= 0; i--) {
        player.ghosts[i].alpha -= dt * 3;
        if (player.ghosts[i].alpha <= 0) player.ghosts.splice(i, 1);
    }

    // Update Player Arrows
    for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        a.life -= dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        let hit = false;
        turrets.forEach(t => {
            if (t.hp > 0 && Math.hypot(a.x - t.x, a.y - t.y) < 20) {
                t.hp -= 2;
                createEmberParticles(t.x, t.y, '#78dcff');
                hit = true;
            }
        });

        if (hit || a.life <= 0) arrows.splice(i, 1);
    }

    // Update Sword Slashes & Energy Regen
    for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.life -= dt;

        turrets.forEach(t => {
            if (t.hp > 0) {
                const dist = Math.hypot(s.x + Math.cos(s.angle) * 20 - t.x, s.y + Math.sin(s.angle) * 20 - t.y);
                if (dist < 35) {
                    t.hp -= 1;
                    player.energy = Math.min(player.maxEnergy, player.energy + 25);
                    createEmberParticles(t.x, t.y, '#ff4757');
                }
            }
        });

        if (s.life <= 0) slashes.splice(i, 1);
    }

    // Update Turrets & AI Shooting
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

    // Update Enemy Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (!player.isDashing) {
            const dist = Math.hypot(p.x - player.x, p.y - player.y);
            if (dist < player.size + 4) {
                createEmberParticles(player.x, player.y, '#ff4757');
                projectiles.splice(i, 1);
                continue;
            }
        }

        if (p.life <= 0) projectiles.splice(i, 1);
    }

    // Guiding Light Logic
    guidingLight.pulse += dt * 4;
    const floatOffsetX = Math.cos(guidingLight.pulse) * 10;
    const floatOffsetY = Math.sin(guidingLight.pulse) * 10;

    const reticleDist = 45;
    guidingLight.targetX = player.x + Math.cos(player.angle) * reticleDist + floatOffsetX;
    guidingLight.targetY = player.y + Math.sin(player.angle) * reticleDist + floatOffsetY;

    guidingLight.x += (guidingLight.targetX - guidingLight.x) * dt * 7;
    guidingLight.y += (guidingLight.targetY - guidingLight.y) * dt * 7;
}

function draw() {
    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Floor Grid
    ctx.strokeStyle = '#1d2230';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1.0;
    });

    // Draw Turrets
    turrets.forEach(t => {
        if (t.hp > 0) {
            ctx.fillStyle = '#2f3542';
            ctx.fillRect(t.x - 12, t.y - 12, 24, 24);

            ctx.fillStyle = t.shootTimer < 0.6 ? '#ff6b81' : '#ff4757';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
            ctx.fill();

            // HP Bar
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(t.x - 12, t.y - 18, (t.hp / t.maxHp) * 24, 3);
        }
    });

    // Draw Enemy Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Player Arrows
    arrows.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        ctx.fillStyle = '#78dcff';
        ctx.fillRect(-8, -1.5, 16, 3);
        ctx.restore();
    });

    // Ghost trails
    player.ghosts.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle);
        ctx.fillStyle = `rgba(120, 220, 255, ${g.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, 0, player.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = player.isDashing ? '#78dcff' : '#2d3748';
    ctx.beginPath();
    ctx.arc(0, 0, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, -3, 10, 6);
    ctx.restore();

    // Draw Sword Slash
    slashes.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        const progress = 1 - (s.life / s.maxLife);
        ctx.strokeStyle = `rgba(72, 239, 173, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        ctx.restore();
    });

    // Draw Guiding Light Companion
    const glowGradient = ctx.createRadialGradient(
        guidingLight.x, guidingLight.y, 1,
        guidingLight.x, guidingLight.y, 18
    );
    glowGradient.addColorStop(0, 'rgba(120, 220, 255, 0.9)');
    glowGradient.addColorStop(0.5, 'rgba(60, 160, 240, 0.3)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(guidingLight.x, guidingLight.y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(guidingLight.x, guidingLight.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Arcane Energy Bar (HUD)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(15, 15, 120, 12);
    ctx.fillStyle = '#78dcff';
    ctx.fillRect(15, 15, (player.energy / player.maxEnergy) * 120, 12);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(15, 15, 120, 12);

    // Touch UI Controls (Always drawn on Touch Devices)
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        if (touchJoystick.active) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(touchJoystick.startX, touchJoystick.startY, 32, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(touchJoystick.moveX, touchJoystick.moveY, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        // DASH (Cyan)
        ctx.fillStyle = 'rgba(120, 220, 255, 0.35)';
        ctx.strokeStyle = 'rgba(120, 220, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dashBtnArea.x, dashBtnArea.y, dashBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DASH', dashBtnArea.x, dashBtnArea.y + 4);

        // SLASH (Green)
        ctx.fillStyle = 'rgba(72, 239, 173, 0.35)';
        ctx.strokeStyle = 'rgba(72, 239, 173, 0.9)';
        ctx.beginPath(); ctx.arc(slashBtnArea.x, slashBtnArea.y, slashBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SLASH', slashBtnArea.x, slashBtnArea.y + 4);

        // BOW (Purple)
        ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)';
        ctx.beginPath(); ctx.arc(bowBtnArea.x, bowBtnArea.y, bowBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BOW', bowBtnArea.x, bowBtnArea.y + 4);
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
