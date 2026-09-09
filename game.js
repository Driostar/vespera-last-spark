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

// Dual Joysticks: Left = Move, Right = 360 Bow Aim
const moveJoystick = { active: false, id: null, startX: 0, startY: 0, moveX: 0, moveY: 0 };
const bowJoystick = { active: false, id: null, startX: 0, startY: 0, moveX: 0, moveY: 0, angle: 0 };

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') performDash();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Action UI Buttons
const dashBtnArea = { x: CANVAS_WIDTH - 50, y: 50, r: 24 };
const slashBtnArea = { x: CANVAS_WIDTH - 110, y: 50, r: 24 };

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

        // Tap Dash / Slash
        if (Math.hypot(pos.x - dashBtnArea.x, pos.y - dashBtnArea.y) < dashBtnArea.r + 15) {
            performDash();
            continue;
        }
        if (Math.hypot(pos.x - slashBtnArea.x, pos.y - slashBtnArea.y) < slashBtnArea.r + 15) {
            performSlash();
            continue;
        }

        // Left Half Touch = Move Joystick
        if (pos.x < CANVAS_WIDTH / 2 && !moveJoystick.active) {
            moveJoystick.active = true;
            moveJoystick.id = touch.identifier;
            moveJoystick.startX = pos.x;
            moveJoystick.startY = pos.y;
            moveJoystick.moveX = pos.x;
            moveJoystick.moveY = pos.y;
            continue;
        }

        // Right Half Touch = 360 Bow Aim Joystick
        if (pos.x >= CANVAS_WIDTH / 2 && !bowJoystick.active) {
            bowJoystick.active = true;
            bowJoystick.id = touch.identifier;
            bowJoystick.startX = pos.x;
            bowJoystick.startY = pos.y;
            bowJoystick.moveX = pos.x;
            bowJoystick.moveY = pos.y;
            bowJoystick.angle = player.angle;
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
            bowJoystick.moveX = pos.x;
            bowJoystick.moveY = pos.y;

            const dx = pos.x - bowJoystick.startX;
            const dy = pos.y - bowJoystick.startY;
            if (Math.hypot(dx, dy) > 8) {
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

        // Releasing Right Joystick Fires Arrow!
        if (bowJoystick.active && touch.identifier === bowJoystick.id) {
            performBow(bowJoystick.angle);
            bowJoystick.active = false;
            bowJoystick.id = null;
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
    if (e.button === 2) performBow(player.angle);
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

function performBow(shootAngle) {
    if (player.energy < 25) return;
    player.energy -= 25;

    arrows.push({
        x: player.x + Math.cos(shootAngle) * 15,
        y: player.y + Math.sin(shootAngle) * 15,
        vx: Math.cos(shootAngle) * 450,
        vy: Math.sin(shootAngle) * 450,
        angle: shootAngle,
        life: 2
    });

    createEmberParticles(player.x + Math.cos(shootAngle) * 15, player.y + Math.sin(shootAngle) * 15, '#78dcff');
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

    // Facing Angle Logic
    if (bowJoystick.active) {
        player.angle = bowJoystick.angle;
    } else if (moveJoystick.active && (dx !== 0 || dy !== 0)) {
        player.angle = Math.atan2(dy, dx);
    } else if (!moveJoystick.active) {
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }

    if (player.isDashing) {
        player.dashTimer -= dt;
        player.x += player.dashDirX * player.dashSpeed * dt;
        player.y += player.dashDirY * player.dashSpeed * dt;
        player.ghosts.push({ x: player.x, y: player.y, angle: player.angle, alpha: 0.6 });

        if (player.dashTimer <= 0) player.isDashing = false;
    } else {
        const moveSpeed = bowJoystick.active ? player.speed * 0.7 : player.speed;
        player.x += dx * moveSpeed * dt;
        player.y += dy * moveSpeed * dt;
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

    // Update Arrows
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

    // Update Slashes
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

    // Update Turrets
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

    // Update Projectiles
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

    // Guiding Light Companion / Target Reticle Position
    guidingLight.pulse += dt * 4;
    const floatOffsetX = Math.cos(guidingLight.pulse) * 8;
    const floatOffsetY = Math.sin(guidingLight.pulse) * 8;

    const reticleDist = bowJoystick.active ? 130 : 35;
    guidingLight.targetX = player.x + Math.cos(player.angle) * reticleDist + floatOffsetX;
    guidingLight.targetY = player.y + Math.sin(player.angle) * reticleDist + floatOffsetY;

    guidingLight.x += (guidingLight.targetX - guidingLight.x) * dt * 8;
    guidingLight.y += (guidingLight.targetY - guidingLight.y) * dt * 8;
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

    // Aim Trajectory Line
    if (bowJoystick.active) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(guidingLight.x, guidingLight.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Sword Slashes
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

    // Draw Guiding Light / Ranged Aim Reticle
    const glowGradient = ctx.createRadialGradient(
        guidingLight.x, guidingLight.y, 1,
        guidingLight.x, guidingLight.y, 18
    );
    glowGradient.addColorStop(0, bowJoystick.active ? 'rgba(168, 85, 247, 0.9)' : 'rgba(120, 220, 255, 0.9)');
    glowGradient.addColorStop(0.5, bowJoystick.active ? 'rgba(147, 51, 234, 0.4)' : 'rgba(60, 160, 240, 0.3)');
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

    // Touch UI (Always active for touch devices)
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        // Left Movement Joystick
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

        // Right 360 Bow Aim Joystick
        if (bowJoystick.active) {
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bowJoystick.startX, bowJoystick.startY, 40, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.beginPath();
            ctx.arc(bowJoystick.moveX, bowJoystick.moveY, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        // DASH Button (Top Right)
        ctx.fillStyle = 'rgba(120, 220, 255, 0.35)';
        ctx.strokeStyle = 'rgba(120, 220, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dashBtnArea.x, dashBtnArea.y, dashBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DASH', dashBtnArea.x, dashBtnArea.y + 3);

        // SLASH Button (Top Right next to Dash)
        ctx.fillStyle = 'rgba(72, 239, 173, 0.35)';
        ctx.strokeStyle = 'rgba(72, 239, 173, 0.9)';
        ctx.beginPath(); ctx.arc(slashBtnArea.x, slashBtnArea.y, slashBtnArea.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SLASH', slashBtnArea.x, slashBtnArea.y + 3);
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
