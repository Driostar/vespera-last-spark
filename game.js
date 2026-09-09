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
const mouse = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, down: false };
const touchJoystick = { active: false, id: null, startX: 0, startY: 0, moveX: 0, moveY: 0 };
const touchButtons = { dash: false, slash: false };

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') performDash();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    mouse.y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
});

canvas.addEventListener('mousedown', e => {
    mouse.down = true;
    performSlash();
});
canvas.addEventListener('mouseup', () => mouse.down = false);

// Touch Handling (Multi-touch support for joystick + buttons)
const dashBtnArea = { x: CANVAS_WIDTH - 70, y: CANVAS_HEIGHT - 60, r: 25 };
const slashBtnArea = { x: CANVAS_WIDTH - 60, y: CANVAS_HEIGHT - 120, r: 25 };

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const tx = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const ty = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

        // Check Dash Button
        if (Math.hypot(tx - dashBtnArea.x, ty - dashBtnArea.y) < dashBtnArea.r + 10) {
            performDash();
            continue;
        }
        // Check Slash Button
        if (Math.hypot(tx - slashBtnArea.x, ty - slashBtnArea.y) < slashBtnArea.r + 10) {
            performSlash();
            continue;
        }
        // Left side joystick touch
        if (tx < CANVAS_WIDTH / 2 && !touchJoystick.active) {
            touchJoystick.active = true;
            touchJoystick.id = touch.identifier;
            touchJoystick.startX = tx;
            touchJoystick.startY = ty;
            touchJoystick.moveX = tx;
            touchJoystick.moveY = ty;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touchJoystick.active && touch.identifier === touchJoystick.id) {
            touchJoystick.moveX = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
            touchJoystick.moveY = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (touchJoystick.active && e.changedTouches[i].identifier === touchJoystick.id) {
            touchJoystick.active = false;
            touchJoystick.id = null;
        }
    }
}, { passive: false });

// Player State
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: 16,
    speed: 130,
    angle: 0,
    // Dash State
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: 0,
    dashSpeed: 380,
    ghosts: []
};

// Attack Effects
const slashes = [];

function performDash() {
    if (player.dashCooldown > 0 || player.isDashing) return;
    player.isDashing = true;
    player.dashTimer = 0.2; // 0.2 second dash burst
    player.dashCooldown = 0.6; // Cooldown before next dash

    // Dash in facing or movement direction
    player.dashDirX = Math.cos(player.angle);
    player.dashDirY = Math.sin(player.angle);
}

function performSlash() {
    // Prevent spamming
    if (slashes.length > 0) return;
    slashes.push({
        x: player.x,
        y: player.y,
        angle: player.angle,
        radius: 35,
        life: 0.15, // Duration of slash visual arc
        maxLife: 0.15
    });
}

const guidingLight = {
    x: CANVAS_WIDTH / 2 + 20,
    y: CANVAS_HEIGHT / 2 - 20,
    targetX: CANVAS_WIDTH / 2,
    targetY: CANVAS_HEIGHT / 2,
    pulse: 0
};

function update(dt) {
    // Cooldown timers
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

    // Facing direction update
    if (touchJoystick.active && (dx !== 0 || dy !== 0)) {
        player.angle = Math.atan2(dy, dx);
    } else if (!touchJoystick.active) {
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }

    // Handle Movement or Dash
    if (player.isDashing) {
        player.dashTimer -= dt;
        player.x += player.dashDirX * player.dashSpeed * dt;
        player.y += player.dashDirY * player.dashSpeed * dt;

        // Leave phantom dash trail
        player.ghosts.push({ x: player.x, y: player.y, angle: player.angle, alpha: 0.6 });

        if (player.dashTimer <= 0) player.isDashing = false;
    } else {
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
    }

    // Keep player in arena bounds
    player.x = Math.max(player.size, Math.min(CANVAS_WIDTH - player.size, player.x));
    player.y = Math.max(player.size, Math.min(CANVAS_HEIGHT - player.size, player.y));

    // Fade dash ghost trail
    for (let i = player.ghosts.length - 1; i >= 0; i--) {
        player.ghosts[i].alpha -= dt * 3;
        if (player.ghosts[i].alpha <= 0) player.ghosts.splice(i, 1);
    }

    // Update Slashes
    for (let i = slashes.length - 1; i >= 0; i--) {
        slashes[i].life -= dt;
        if (slashes[i].life <= 0) slashes.splice(i, 1);
    }

    // Guiding Light floating logic
    guidingLight.pulse += dt * 4;
    const floatOffsetX = Math.cos(guidingLight.pulse) * 12;
    const floatOffsetY = Math.sin(guidingLight.pulse) * 12;

    guidingLight.targetX = player.x - Math.cos(player.angle) * 22 + floatOffsetX;
    guidingLight.targetY = player.y - Math.sin(player.angle) * 22 + floatOffsetY;

    guidingLight.x += (guidingLight.targetX - guidingLight.x) * dt * 5;
    guidingLight.y += (guidingLight.targetY - guidingLight.y) * dt * 5;
}

function draw() {
    // Clear Background
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

    // Draw Dash Trail Ghosts
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

    // Draw Player Body
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = player.isDashing ? '#78dcff' : '#2d3748';
    ctx.beginPath();
    ctx.arc(0, 0, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Facing weapon notch
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, -3, 10, 6);
    ctx.restore();

    // Draw Sword Slash Arc
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

    // Mobile Action UI Overlay
    // Left Movement Joystick
    if (touchJoystick.active) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(touchJoystick.startX, touchJoystick.startY, 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(touchJoystick.moveX, touchJoystick.moveY, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // Right Action Buttons
    // Dash Button
    ctx.fillStyle = 'rgba(120, 220, 255, 0.25)';
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(dashBtnArea.x, dashBtnArea.y, dashBtnArea.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DASH', dashBtnArea.x, dashBtnArea.y + 3);

    // Slash Button
    ctx.fillStyle = 'rgba(72, 239, 173, 0.25)';
    ctx.strokeStyle = 'rgba(72, 239, 173, 0.6)';
    ctx.beginPath();
    ctx.arc(slashBtnArea.x, slashBtnArea.y, slashBtnArea.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SLASH', slashBtnArea.x, slashBtnArea.y + 3);
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
