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

const keys = {};
const mouse = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, down: false };
const touchJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', () => mouse.down = true);
canvas.addEventListener('mouseup', () => mouse.down = false);

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchJoystick.active = true;
    touchJoystick.startX = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    touchJoystick.startY = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    touchJoystick.moveX = touchJoystick.startX;
    touchJoystick.moveY = touchJoystick.startY;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!touchJoystick.active) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchJoystick.moveX = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    touchJoystick.moveY = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    touchJoystick.active = false;
}, { passive: false });

const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: 16,
    speed: 120,
    angle: 0
};

const guidingLight = {
    x: CANVAS_WIDTH / 2 + 20,
    y: CANVAS_HEIGHT / 2 - 20,
    targetX: CANVAS_WIDTH / 2,
    targetY: CANVAS_HEIGHT / 2,
    pulse: 0
};

function update(dt) {
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

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    player.x = Math.max(player.size, Math.min(CANVAS_WIDTH - player.size, player.x));
    player.y = Math.max(player.size, Math.min(CANVAS_HEIGHT - player.size, player.y));

    if (touchJoystick.active && (dx !== 0 || dy !== 0)) {
        player.angle = Math.atan2(dy, dx);
    } else {
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }

    guidingLight.pulse += dt * 4;
    const floatOffsetX = Math.cos(guidingLight.pulse) * 12;
    const floatOffsetY = Math.sin(guidingLight.pulse) * 12;

    guidingLight.targetX = player.x - Math.cos(player.angle) * 20 + floatOffsetX;
    guidingLight.targetY = player.y - Math.sin(player.angle) * 20 + floatOffsetY;

    guidingLight.x += (guidingLight.targetX - guidingLight.x) * dt * 5;
    guidingLight.y += (guidingLight.targetY - guidingLight.y) * dt * 5;
}

function draw() {
    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#1d2230';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.arc(0, 0, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, -3, 10, 6);

    ctx.restore();

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
