const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playPickup() {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playHit() {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playWave() {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.1, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.2);
        });
    }

    playVictory() {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const melody = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        melody.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.2, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.4);
        });
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    add(p) {
        this.particles.push(p);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.sizeDecay) {
                p.size -= p.sizeDecay * dt;
                if (p.size < 0) p.size = 0;
            }
            if (p.life <= 0 || p.size <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        for (let p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    spawnEngineTrail(x, y, angle, speed) {
        const backAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const spd = Math.random() * 50 + 20;
        this.add({
            x: x,
            y: y,
            vx: Math.cos(backAngle) * spd,
            vy: Math.sin(backAngle) * spd,
            life: 0.4,
            maxLife: 0.4,
            size: Math.random() * 3 + 2,
            sizeDecay: 6,
            color: '#ffa500'
        });
    }

    spawnSparkle(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 120 + 30;
            this.add({
                x: x,
                y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 0.6,
                maxLife: 0.6,
                size: Math.random() * 4 + 1,
                sizeDecay: 5,
                color: '#ffdd44'
            });
        }
    }

    spawnExplosion(x, y) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 200 + 50;
            this.add({
                x: x,
                y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 0.8,
                maxLife: 0.8,
                size: Math.random() * 6 + 2,
                sizeDecay: 6,
                color: Math.random() > 0.5 ? '#ff4422' : '#ffaa00'
            });
        }
    }

    spawnWarpSwirl(x, y) {
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 80 + 20;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            this.add({
                x: px,
                y: py,
                vx: -Math.sin(angle) * 150,
                vy: Math.cos(angle) * 150,
                life: 0.5,
                maxLife: 0.5,
                size: Math.random() * 3 + 1,
                sizeDecay: 4,
                color: '#00ffff'
            });
        }
    }
}

class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.radius = 16;
        this.isThrusting = false;
        this.maxSpeed = 400;
        this.acceleration = 500;
        this.friction = 0.98;
    }

    update(dt, input, mouse, bounds) {
        let targetAngle = this.angle;
        if (input.left || input.keyA) targetAngle -= Math.PI * 1.5 * dt;
        if (input.right || input.keyD) targetAngle += Math.PI * 1.5 * dt;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        if (Math.hypot(dx, dy) > 20) {
            const mouseAngle = Math.atan2(dy, dx);
            let diff = mouseAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * Math.min(1, dt * 8);
        } else {
            this.angle = targetAngle;
        }

        this.isThrusting = false;
        if (input.up || input.keyW) {
            this.isThrusting = true;
            this.vx += Math.cos(this.angle) * this.acceleration * dt;
            this.vy += Math.sin(this.angle) * this.acceleration * dt;
        }

        this.vx *= Math.pow(this.friction, dt * 60);
        this.vy *= Math.pow(this.friction, dt * 60);

        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > this.maxSpeed) {
            this.vx = (this.vx / currentSpeed) * this.maxSpeed;
            this.vy = (this.vy / currentSpeed) * this.maxSpeed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.x < 0) this.x = bounds.width;
        if (this.x > bounds.width) this.x = 0;
        if (this.y < 0) this.y = bounds.height;
        if (this.y > bounds.height) this.y = 0;
    }

    draw(ctx, invulnerable, particleSystem) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (invulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        if (this.isThrusting && Math.random() > 0.3) {
            particleSystem.spawnEngineTrail(
                this.x - Math.cos(this.angle) * 15,
                this.y - Math.sin(this.angle) * 15,
                this.angle,
                Math.hypot(this.vx, this.vy)
            );
        }

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();

        ctx.fillStyle = '#ffaa22';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-12, -10);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        if (this.isThrusting) {
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(-22 - Math.random() * 8, 0);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y, radius, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.rotSpeed = (Math.random() - 0.5) * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.points = [];
        const numPoints = Math.floor(Math.random() * 4) + 7;
        for (let i = 0; i < numPoints; i++) {
            const a = (i / numPoints) * Math.PI * 2;
            const r = this.radius * (0.8 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
    }

    update(dt, bounds) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.rotSpeed * dt;

        if (this.x < -this.radius) this.x = bounds.width + this.radius;
        if (this.x > bounds.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = bounds.height + this.radius;
        if (this.y > bounds.height + this.radius) this.y = -this.radius;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = '#8899aa';
        ctx.fillStyle = '#222831';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

class Shard {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.pulse = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.pulse += dt * 4;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const currentRadius = this.radius + Math.sin(this.pulse) * 3;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 1.5);
        grad.addColorStop(0, 'rgba(255, 170, 0, 0.9)');
        grad.addColorStop(0.5, 'rgba(255, 100, 0, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class WarpGate {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 60;
        this.angle = 0;
    }

    update(dt) {
        this.angle += dt * 2;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(-this.angle * 2);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Background {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.starsFar = [];
        this.starsNear = [];
        this.nebulaBlobs = [];

        for (let i = 0; i < 150; i++) {
            this.starsFar.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.2
            });
        }

        for (let i = 0; i < 75; i++) {
            this.starsNear.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2.5 + 1,
                alpha: Math.random() * 0.8 + 0.2
            });
        }

        for (let i = 0; i < 5; i++) {
            this.nebulaBlobs.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 250 + 150,
                color: i % 2 === 0 ? 'rgba(75, 0, 130, 0.15)' : 'rgba(0, 50, 100, 0.15)'
            });
        }
    }

    update(ship, dt) {
        const dx = ship.vx * dt;
        const dy = ship.vy * dt;

        for (let star of this.starsFar) {
            star.x -= dx * 0.1;
            star.y -= dy * 0.1;
            if (star.x < 0) star.x = this.width;
            if (star.x > this.width) star.x = 0;
            if (star.y < 0) star.y = this.height;
            if (star.y > this.height) star.y = 0;
        }

        for (let star of this.starsNear) {
            star.x -= dx * 0.3;
            star.y -= dy * 0.3;
            if (star.x < 0) star.x = this.width;
            if (star.x > this.width) star.x = 0;
            if (star.y < 0) star.y = this.height;
            if (star.y > this.height) star.y = 0;
        }
    }

    draw(ctx) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#020208');
        bgGrad.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        for (let blob of this.nebulaBlobs) {
            const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
            grad.addColorStop(0, blob.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        for (let star of this.starsFar) {
            ctx.globalAlpha = star.alpha;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        for (let star of this.starsNear) {
            ctx.globalAlpha = star.alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.ctx = this.canvas.getContext('2d');

        this.setupStyles();

        this.sound = new SoundManager();
        this.particles = new ParticleSystem();
        this.background = new Background(CANVAS_WIDTH, CANVAS_HEIGHT);

        this.state = 'title'; // title, playing, paused, gameover, victory
        this.score = 0;
        this.shardsCollected = 0;
        this.hearts = 3;
        this.wave = 1;
        this.combo = 1;
        this.invulnerableTimer = 0;
        this.screenShakeTimer = 0;
        this.screenShakeIntensity = 0;

        this.ship = new Ship(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.asteroids = [];
        this.shards = [];
        this.warpGate = null;

        this.input = {
            up: false, down: false, left: false, right: false,
            keyW: false, keyA: false, keyS: false, keyD: false
        };
        this.mouse = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

        this.setupListeners();

        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    setupStyles() {
        document.body.style.margin = '0';
        document.body.style.background = '#000000';
        document.body.style.overflow = 'hidden';
        document.body.style.display = 'flex';
        document.body.style.justifyContent = 'center';
        document.body.style.alignItems = 'center';
        document.body.style.height = '100vh';

        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.objectFit = 'contain';
        this.canvas.style.background = '#020208';
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            this.sound.init();
            if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = true;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = true;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = true;

            if (e.code === 'KeyW') this.input.keyW = true;
            if (e.code === 'KeyA') this.input.keyA = true;
            if (e.code === 'KeyS') this.input.keyS = true;
            if (e.code === 'KeyD') this.input.keyD = true;

            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'playing') {
                    this.state = 'paused';
                } else if (this.state === 'paused') {
                    this.state = 'playing';
                }
            }

            if (e.code === 'KeyR') {
                if (this.state === 'gameover' || this.state === 'victory') {
                    this.resetGame();
                    this.state = 'playing';
                }
            }

            if (e.code === 'KeyM') {
                this.sound.toggleMute();
            }

            if (e.code === 'Enter') {
                if (this.state === 'title') {
                    this.resetGame();
                    this.state = 'playing';
                } else if (this.state === 'gameover' || this.state === 'victory') {
                    this.resetGame();
                    this.state = 'playing';
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = false;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = false;

            if (e.code === 'KeyW') this.input.keyW = false;
            if (e.code === 'KeyA') this.input.keyA = false;
            if (e.code === 'KeyS') this.input.keyS = false;
            if (e.code === 'KeyD') this.input.keyD = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
        });

        this.canvas.addEventListener('mousedown', () => {
            this.sound.init();
            if (this.state === 'title' || this.state === 'gameover' || this.state === 'victory') {
                this.resetGame();
                this.state = 'playing';
            }
        });
    }

    resetGame() {
        this.score = 0;
        this.shardsCollected = 0;
        this.hearts = 3;
        this.wave = 1;
        this.combo = 1;
        this.invulnerableTimer = 0;
        this.screenShakeTimer = 0;
        this.ship = new Ship(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.asteroids = [];
        this.shards = [];
        this.warpGate = null;
        this.particles = new ParticleSystem();
        this.spawnWaveAsteroids();
        this.replenishShards();
    }

    spawnWaveAsteroids() {
        this.asteroids = [];
        const count = 4 + this.wave * 3;
        const speed = 60 + this.wave * 15;
        for (let i = 0; i < count; i++) {
            let x, y, dist;
            do {
                x = Math.random() * CANVAS_WIDTH;
                y = Math.random() * CANVAS_HEIGHT;
                dist = Math.hypot(x - this.ship.x, y - this.ship.y);
            } while (dist < 250);
            const radius = Math.random() * 25 + 15;
            this.asteroids.push(new Asteroid(x, y, radius, speed));
        }
    }

    replenishShards() {
        while (this.shards.length < 6 && this.shardsCollected < 100) {
            let x, y, dist;
            do {
                x = Math.random() * (CANVAS_WIDTH - 100) + 50;
                y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
                dist = Math.hypot(x - this.ship.x, y - this.ship.y);
            } while (dist < 150);
            this.shards.push(new Shard(x, y));
        }
    }

    triggerShake(intensity, duration) {
        this.screenShakeIntensity = intensity;
        this.screenShakeTimer = duration;
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.05) dt = 0.05;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (this.screenShakeTimer > 0) {
            this.screenShakeTimer -= dt;
            if (this.screenShakeTimer <= 0) {
                this.screenShakeIntensity = 0;
            }
        }

        if (this.state === 'playing') {
            if (this.invulnerableTimer > 0) {
                this.invulnerableTimer -= dt;
            }

            this.ship.update(dt, this.input, this.mouse, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
            this.background.update(this.ship, dt);
            this.particles.update(dt);

            for (let ast of this.asteroids) {
                ast.update(dt, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
            }

            for (let shard of this.shards) {
                shard.update(dt);
            }

            if (this.warpGate) {
                this.warpGate.update(dt);
                const dist = Math.hypot(this.ship.x - this.warpGate.x, this.ship.y - this.warpGate.y);
                if (dist < this.warpGate.radius + this.ship.radius) {
                    this.particles.spawnWarpSwirl(this.warpGate.x, this.warpGate.y);
                    this.sound.playVictory();
                    this.state = 'victory';
                }
            }

            for (let i = this.shards.length - 1; i >= 0; i--) {
                const s = this.shards[i];
                const dist = Math.hypot(this.ship.x - s.x, this.ship.y - s.y);
                if (dist < this.ship.radius + s.radius) {
                    this.particles.spawnSparkle(s.x, s.y);
                    this.sound.playPickup();
                    this.shards.splice(i, 1);
                    this.shardsCollected++;
                    this.score += 10 * this.combo;

                    if (this.combo < 5) this.combo++;

                    if (this.shardsCollected % 25 === 0 && this.shardsCollected < 100) {
                        this.wave++;
                        this.score += 50;
                        this.sound.playWave();
                        this.spawnWaveAsteroids();
                    }

                    if (this.shardsCollected >= 100 && !this.warpGate) {
                        this.warpGate = new WarpGate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                        this.sound.playWave();
                    }

                    this.replenishShards();
                }
            }

            if (this.invulnerableTimer <= 0) {
                for (let ast of this.asteroids) {
                    const dist = Math.hypot(this.ship.x - ast.x, this.ship.y - ast.y);
                    if (dist < this.ship.radius + ast.radius) {
                        this.hearts--;
                        this.combo = 1;
                        this.invulnerableTimer = 1.5;
                        this.triggerShake(10, 0.3);
                        this.sound.playHit();
                        this.particles.spawnExplosion(this.ship.x, this.ship.y);

                        if (this.hearts <= 0) {
                            this.state = 'gameover';
                        }
                        break;
                    }
                }
            }
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (this.screenShakeTimer > 0) {
            const offsetX = (Math.random() - 0.5) * this.screenShakeIntensity;
            const offsetY = (Math.random() - 0.5) * this.screenShakeIntensity;
            this.ctx.translate(offsetX, offsetY);
        }

        this.background.draw(this.ctx);

        if (this.warpGate) {
            this.warpGate.draw(this.ctx);
        }

        for (let s of this.shards) {
            s.draw(this.ctx);
        }

        for (let ast of this.asteroids) {
            ast.draw(this.ctx);
        }

        this.ship.draw(this.ctx, this.invulnerableTimer > 0, this.particles);
        this.particles.draw(this.ctx);

        this.drawHUD();

        if (this.state === 'title') {
            this.drawTitleScreen();
        } else if (this.state === 'paused') {
            this.drawPauseScreen();
        } else if (this.state === 'gameover') {
            this.drawGameOverScreen();
        } else if (this.state === 'victory') {
            this.drawVictoryScreen();
        }

        this.ctx.restore();
    }

    drawHUD() {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 8;

        this.ctx.fillText(`SCORE: ${this.score}`, 30, 40);
        this.ctx.fillText(`SHARDS: ${this.shardsCollected}/100`, 30, 70);
        this.ctx.fillText(`WAVE: ${this.wave}`, 30, 100);
        this.ctx.fillText(`COMBO: x${this.combo}`, 30, 130);

        let heartsStr = '';
        for (let i = 0; i < this.hearts; i++) heartsStr += '♥ ';
        for (let i = this.hearts; i < 3; i++) heartsStr += '♡ ';
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`HULL: ${heartsStr}`, CANVAS_WIDTH - 220, 40);

        this.ctx.restore();
    }

    drawOverlayBackground() {
        this.ctx.fillStyle = 'rgba(2, 2, 8, 0.85)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    drawTitleScreen() {
        this.drawOverlayBackground();
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 15;

        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 54px monospace';
        this.ctx.fillText('STARFALL SALVAGE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

        this.ctx.fillStyle = '#ffaa22';
        this.ctx.font = '20px monospace';
        this.ctx.fillText('Collect 100 glowing shards to open the Warp Gate.', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        this.ctx.fillText('Steer with Mouse or WASD / Arrows. Thrust with W / Up.', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px monospace';
        if (Math.floor(Date.now() / 400) % 2 === 0) {
            this.ctx.fillText('PRESS ENTER OR CLICK TO START', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
        }

        this.ctx.fillStyle = '#8899aa';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('Press M to Mute/Unmute Audio', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 150);

        this.ctx.restore();
    }

    drawPauseScreen() {
        this.drawOverlayBackground();
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 15;

        this.ctx.font = 'bold 48px monospace';
        this.ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        this.ctx.font = '20px monospace';
        this.ctx.fillText('Press P or ESC to Resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        this.ctx.restore();
    }

    drawGameOverScreen() {
        this.drawOverlayBackground();
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 15;

        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 54px monospace';
        this.ctx.fillText('HULL BREACHED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px monospace';
        this.ctx.fillText(`Final Score: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx.fillText(`Shards Salvaged: ${this.shardsCollected}/100`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

        if (Math.floor(Date.now() / 400) % 2 === 0) {
            this.ctx.fillStyle = '#ffaa22';
            this.ctx.fillText('PRESS R TO RESTART', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
        }

        this.ctx.restore();
    }

    drawVictoryScreen() {
        this.drawOverlayBackground();
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;

        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 54px monospace';
        this.ctx.fillText('WARP GATE REACHED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px monospace';
        this.ctx.fillText(`Victory Score: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx.fillText('You successfully escaped the asteroid field!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

        if (Math.floor(Date.now() / 400) % 2 === 0) {
            this.ctx.fillStyle = '#ffaa22';
            this.ctx.fillText('PRESS R TO PLAY AGAIN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
        }

        this.ctx.restore();
    }
}

window.addEventListener('load', () => {
    new Game();
});
