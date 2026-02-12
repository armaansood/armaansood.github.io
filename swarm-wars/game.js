// ============================================================================
// Swarm Wars — Real-Time Strategy Game Engine
// Pure vanilla JS - HTML5 Canvas - No external dependencies
// ============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PRODUCTION_RATE_MULTIPLIER = 0.03;
const FLEET_SPEED = 2.5;
const MIN_PLANET_RADIUS = 18;
const MAX_PLANET_RADIUS = 45;
const MIN_PLANET_DISTANCE = 100;
const NEUTRAL_PRODUCTION_RATE = 0;
const SEND_PERCENTAGE_DEFAULT = 0.5;
const REFERENCE_DT = 16.667; // 60fps reference for frame-rate normalization
const SEND_PERCENTAGE_SHIFT = 0.75;

let _activeThemeColors = null;

const OWNER_LABELS = {
    neutral: 'Neutral',
    player: 'You',
    ai1: 'Enemy 1',
    ai2: 'Enemy 2',
    ai3: 'Enemy 3'
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function getOwnerColor(owner) {
    const colors = _activeThemeColors || (window.THEMES && window.THEMES['space'].colors);
    return (colors && colors[owner]) || { planet: '#666', ships: '#888', glow: 'rgba(100,100,100,0.3)' };
}

// (NatureBackground removed – backgrounds are now provided by the active theme)

// ---------------------------------------------------------------------------
// Particle – visual effects
// ---------------------------------------------------------------------------
class Particle {
    constructor(x, y, color, type, themeConfig) {
        this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
        this.color = ''; this.type = ''; this.shape = '';
        this.alive = false; this.life = 0; this.decay = 0;
        this.size = 0; this.rotation = 0; this.rotSpeed = 0;
        if (arguments.length > 0) this.init(x, y, color, type, themeConfig);
    }

    init(x, y, color, type, themeConfig) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.alive = true;

        if (type === 'explosion') {
            this.vx = rand(-3, 3);
            this.vy = rand(-3, 3);
            this.life = 1;
            this.decay = rand(0.015, 0.035);
            this.size = rand(2, 4);
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = rand(-0.1, 0.1);
            if (themeConfig) {
                this.color = themeConfig.colors[Math.floor(Math.random() * themeConfig.colors.length)];
                this.shape = themeConfig.shapes[Math.floor(Math.random() * themeConfig.shapes.length)];
            } else {
                this.shape = Math.random() < 0.5 ? 'leaf' : 'petal';
                this.color = Math.random() < 0.5 ? '#A5D6A7' : '#FFE082';
            }
        } else if (type === 'capture') {
            const angle = Math.random() * Math.PI * 2;
            const speed = rand(1.5, 5);
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 1;
            this.decay = rand(0.01, 0.025);
            this.size = rand(2, 5);
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = rand(-0.08, 0.08);
            if (themeConfig) {
                this.color = themeConfig.colors[Math.floor(Math.random() * themeConfig.colors.length)];
                this.shape = themeConfig.shapes[Math.floor(Math.random() * themeConfig.shapes.length)];
            } else {
                this.shape = Math.random() < 0.5 ? 'star' : 'heart';
            }
        } else {
            this.vx = rand(-0.3, 0.3);
            this.vy = rand(-0.5, -0.1);
            this.life = 1;
            this.decay = rand(0.005, 0.015);
            this.size = rand(1, 2.5);
            this.rotation = 0;
            this.rotSpeed = 0;
            if (themeConfig) {
                this.color = themeConfig.colors[Math.floor(Math.random() * themeConfig.colors.length)];
                this.shape = themeConfig.shapes[Math.floor(Math.random() * themeConfig.shapes.length)];
            } else {
                this.shape = 'dot';
                this.color = Math.random() < 0.5 ? '#FFF9C4' : '#FFE082';
            }
        }
        return this;
    }

    update(dtScale) {
        const s = dtScale || 1;
        this.x += this.vx * s;
        this.y += this.vy * s;
        this.life -= this.decay * s;
        if (this.rotation !== undefined) this.rotation += (this.rotSpeed || 0) * s;
        if (this.type === 'capture') {
            const decay = 1 - 0.03 * s; // linear approx of Math.pow(0.97, s)
            this.vx *= decay;
            this.vy *= decay;
        }
        if (this.type === 'explosion') {
            this.vy += 0.02 * s; // gentle gravity for leaves
        }
        if (this.life <= 0) this.alive = false;
    }

    draw(ctx) {
        ctx.globalAlpha = clamp(this.life, 0, 1);
        const s = this.size * this.life;

        if (this.shape === 'leaf') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, s * 1.2, s * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'petal') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, s * 0.6, s * 1.0, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'star') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const method = i === 0 ? 'moveTo' : 'lineTo';
                ctx[method](Math.cos(a) * s, Math.sin(a) * s);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'heart') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.3);
            ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.4);
            ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.3);
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'spark') {
            // Small bright expanding dot
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, s * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = clamp(this.life * 0.5, 0, 1);
            ctx.beginPath();
            ctx.arc(this.x, this.y, s * 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'triangle') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(-s * 0.87, s * 0.5);
            ctx.lineTo(s * 0.87, s * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'drop') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.bezierCurveTo(s * 0.6, -s * 0.3, s * 0.6, s * 0.5, 0, s);
            ctx.bezierCurveTo(-s * 0.6, s * 0.5, -s * 0.6, -s * 0.3, 0, -s);
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'hexagon') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const method = i === 0 ? 'moveTo' : 'lineTo';
                ctx[method](Math.cos(a) * s, Math.sin(a) * s);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (this.shape === 'banner') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.fillRect(-s * 0.3, -s, s * 0.6, s * 2);
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, s);
            ctx.lineTo(0, s * 0.6);
            ctx.lineTo(s * 0.3, s);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else {
            // Simple dot (pollen)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }
}

// ---------------------------------------------------------------------------
// Particle Object Pool — avoids per-frame allocations
// ---------------------------------------------------------------------------
class ParticlePool {
    constructor(size) {
        this.pool = [];
        this.active = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(new Particle());
        }
    }
    acquire(x, y, color, type, config) {
        const p = this.pool.length > 0 ? this.pool.pop() : new Particle();
        p.init(x, y, color, type, config);
        this.active.push(p);
        return p;
    }
    releaseInactive() {
        let writeIdx = 0;
        for (let i = 0; i < this.active.length; i++) {
            if (this.active[i].alive) {
                this.active[writeIdx++] = this.active[i];
            } else {
                this.pool.push(this.active[i]);
            }
        }
        this.active.length = writeIdx;
    }
    clear() {
        for (let i = 0; i < this.active.length; i++) {
            this.active[i].alive = false;
            this.pool.push(this.active[i]);
        }
        this.active.length = 0;
    }
}

// ---------------------------------------------------------------------------
// Planet
// ---------------------------------------------------------------------------
class Planet {
    constructor(x, y, radius, owner, shipCount) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.owner = owner;           // 'neutral', 'player', 'ai1', 'ai2', 'ai3'
        this.shipCount = shipCount;
        this.productionRate = owner === 'neutral' ? NEUTRAL_PRODUCTION_RATE : radius * PRODUCTION_RATE_MULTIPLIER;
        this.productionAccum = 0;      // fractional ship accumulator
        this.selected = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.captureFlashTimer = 0;    // visual flash on capture

        // Power-up properties
        this.powerUp = null;           // 'shield', 'speed', 'plague', 'fortress', 'spawner', or null
        this.shieldTimer = 0;          // seconds remaining for shield effect
        this.speedTimer = 0;           // seconds remaining for speed boost
        this._spawnerAccum = 0;        // spawner timer accumulator (ms)
        this.renderCache = null;       // offscreen canvas cache for planet visuals
    }

    update(dtScale) {
        const s = dtScale || 1;
        this.pulsePhase += 0.03 * s;
        if (this.captureFlashTimer > 0) this.captureFlashTimer -= 0.02 * s;

        // Tick down power-up timers (dtScale is at 60fps, so 1 dtScale ≈ 16.667ms)
        const dtSec = (REFERENCE_DT * s) / 1000;
        if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dtSec);
        if (this.speedTimer > 0) this.speedTimer = Math.max(0, this.speedTimer - dtSec);

        // produce ships for non-neutral owners
        if (this.owner !== 'neutral') {
            this.productionRate = this.radius * PRODUCTION_RATE_MULTIPLIER;
            // Fortress: half production rate
            const prodMult = (this.powerUp === 'fortress') ? 0.5 : 1;
            this.productionAccum += this.productionRate * prodMult * s;
            if (this.productionAccum >= 1) {
                const produced = Math.floor(this.productionAccum);
                this.shipCount += produced;
                this.productionAccum -= produced;
            }
        }
    }

    draw(ctx, time) {
        const colors = getOwnerColor(this.owner);

        // Draw power-up glow BEFORE the planet body so it appears behind
        this._drawPowerUpEffects(ctx, time);

        if (window._activeTheme && window._activeTheme.drawPlanet) {
            window._activeTheme.drawPlanet(ctx, this, time, colors);
        } else {
            // Minimal fallback: simple circle
            ctx.fillStyle = colors.planet;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            // Ship count
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.floor(this.shipCount), this.x, this.y);
        }

        // Fortress overlay: square-ish corners drawn over the planet
        if (this.powerUp === 'fortress') {
            ctx.save();
            ctx.strokeStyle = colors.planet;
            ctx.lineWidth = 3;
            const s = this.radius * 0.85;
            const cornerLen = s * 0.4;
            // Draw corner brackets
            const cx = this.x, cy = this.y;
            ctx.beginPath();
            // top-left
            ctx.moveTo(cx - s, cy - s + cornerLen); ctx.lineTo(cx - s, cy - s); ctx.lineTo(cx - s + cornerLen, cy - s);
            // top-right
            ctx.moveTo(cx + s - cornerLen, cy - s); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + s, cy - s + cornerLen);
            // bottom-right
            ctx.moveTo(cx + s, cy + s - cornerLen); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx + s - cornerLen, cy + s);
            // bottom-left
            ctx.moveTo(cx - s + cornerLen, cy + s); ctx.lineTo(cx - s, cy + s); ctx.lineTo(cx - s, cy + s - cornerLen);
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawPowerUpEffects(ctx, time) {
        if (!this.powerUp && this.shieldTimer <= 0 && this.speedTimer <= 0) return;
        const t = time || 0;

        ctx.save();

        // Shield: golden pulsing glow ring
        if (this.shieldTimer > 0) {
            const pulse = 0.6 + 0.4 * Math.sin(t * 0.005);
            ctx.shadowColor = 'rgba(255,215,0,0.8)';
            ctx.shadowBlur = 15 + 10 * pulse;
            ctx.strokeStyle = `rgba(255,215,0,${0.5 + 0.3 * pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Speed boost: green glow
        if (this.speedTimer > 0) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.006);
            ctx.shadowColor = 'rgba(0,255,100,0.7)';
            ctx.shadowBlur = 12 + 8 * pulse;
            ctx.strokeStyle = `rgba(0,255,100,${0.4 + 0.3 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Passive power-up glow on uncaptured/typed planets
        if (this.powerUp === 'shield' && this.shieldTimer <= 0) {
            const pulse = 0.3 + 0.2 * Math.sin(t * 0.003);
            ctx.shadowColor = 'rgba(255,215,0,0.4)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(255,215,0,${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (this.powerUp === 'speed' && this.speedTimer <= 0) {
            const pulse = 0.3 + 0.2 * Math.sin(t * 0.003);
            ctx.shadowColor = 'rgba(0,255,100,0.4)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(0,255,100,${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Plague: purple/toxic glow
        if (this.powerUp === 'plague') {
            const pulse = 0.4 + 0.3 * Math.sin(t * 0.004);
            ctx.shadowColor = 'rgba(180,0,255,0.5)';
            ctx.shadowBlur = 10 + 5 * pulse;
            ctx.strokeStyle = `rgba(180,0,255,${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Fortress: thicker border glow
        if (this.powerUp === 'fortress') {
            ctx.shadowColor = 'rgba(200,200,200,0.5)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = 'rgba(200,200,200,0.4)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Spawner: pulsing animation with small particles
        if (this.powerUp === 'spawner') {
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.008);
            ctx.shadowColor = 'rgba(255,150,0,0.5)';
            ctx.shadowBlur = 8 + 6 * pulse;
            ctx.strokeStyle = `rgba(255,150,0,${0.3 + 0.3 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5 + 3 * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    containsPoint(px, py) {
        return dist(this.x, this.y, px, py) <= this.radius + 5;
    }
}

// (lightenColor removed – now provided globally by themes.js via window.lightenColor)

// ---------------------------------------------------------------------------
// Fleet
// ---------------------------------------------------------------------------
class Fleet {
    constructor(fromPlanet, toPlanet, shipCount, owner) {
        this.owner = owner;
        this.shipCount = Math.floor(shipCount);
        this.targetPlanet = toPlanet;
        this.x = fromPlanet.x;
        this.y = fromPlanet.y;
        this.tx = toPlanet.x;
        this.ty = toPlanet.y;
        this.alive = true;
        this.selected = false;

        // Speed boost: 2x speed if source planet has active speed timer
        const speedMult = (fromPlanet.speedTimer > 0) ? 2 : 1;
        this.speed = FLEET_SPEED * speedMult;

        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        this.angle = Math.atan2(dy, dx);
        this.vx = (dx / d) * this.speed;
        this.vy = (dy / d) * this.speed;
        this.totalDist = d;
        this.traveled = 0;

        // Build ship positions in formation (triangle cluster)
        this.ships = [];
        const rows = Math.ceil(Math.sqrt(this.shipCount / 2));
        let placed = 0;
        for (let row = 0; row < rows && placed < Math.min(this.shipCount, 30); row++) {
            const cols = Math.min(this.shipCount - placed, row + 1);
            for (let col = 0; col < cols && placed < Math.min(this.shipCount, 30); col++) {
                this.ships.push({
                    ox: -row * 6 + rand(-1, 1),
                    oy: (col - (cols - 1) / 2) * 5 + rand(-1, 1)
                });
                placed++;
            }
        }
    }

    update(dtScale) {
        const s = dtScale || 1;
        this.x += this.vx * s;
        this.y += this.vy * s;
        this.traveled += this.speed * s;

        // Check arrival: close enough to target planet center
        const arrivalDist = this.targetPlanet.radius + 5;
        if (dist(this.x, this.y, this.targetPlanet.x, this.targetPlanet.y) <= arrivalDist ||
            this.traveled >= this.totalDist) {
            this.alive = false;
        }
    }

    arrive() {
        const target = this.targetPlanet;
        if (target.owner === this.owner) {
            // Reinforcement
            target.shipCount += this.shipCount;
            return { type: 'reinforce', planet: target };
        } else {
            // Combat — apply defense modifiers
            let damage = this.shipCount;
            // Shield: no damage while active
            if (target.shieldTimer > 0) {
                damage = 0;
            }
            // Fortress: half damage
            if (target.powerUp === 'fortress') {
                damage = Math.floor(damage * 0.5);
            }

            target.shipCount -= damage;
            if (target.shipCount <= 0) {
                // Planet captured
                const previousOwner = target.owner;
                target.owner = this.owner;
                target.renderCache = null;  // invalidate planet render cache on owner change
                target.shipCount = Math.abs(target.shipCount);
                target.captureFlashTimer = 1;

                // Activate power-up effects on capture
                if (target.powerUp === 'shield') {
                    target.shieldTimer = 10;
                } else if (target.powerUp === 'speed') {
                    target.speedTimer = 15;
                }
                // Plague is handled in Game.update after capture event

                return { type: 'capture', planet: target, previousOwner };
            }
            return { type: 'combat', planet: target };
        }
    }

    retarget(newPlanet) {
        if (newPlanet === this.targetPlanet) return;
        this.targetPlanet = newPlanet;
        this.tx = newPlanet.x;
        this.ty = newPlanet.y;
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1) return;
        this.angle = Math.atan2(dy, dx);
        this.vx = (dx / d) * this.speed;
        this.vy = (dy / d) * this.speed;
        this.totalDist = d;
        this.traveled = 0;
    }

    draw(ctx) {
        const colors = getOwnerColor(this.owner);
        ctx.save();
        ctx.translate(this.x, this.y);

        // Selection ring
        if (this.selected) {
            const theme = window._activeTheme;
            ctx.strokeStyle = (theme && theme.selectionColor) || '#4fc3f7';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.rotate(this.angle);

        // Draw each ship — let theme handle its own save/translate/restore
        const theme = window._activeTheme;
        if (theme && theme.drawShip) {
            for (const s of this.ships) {
                theme.drawShip(ctx, s, this.owner, colors);
            }
        } else {
            // Fallback: batch all ships into a single path
            ctx.fillStyle = colors.ships;
            ctx.beginPath();
            for (const s of this.ships) {
                ctx.moveTo(s.ox + 3, s.oy);
                ctx.lineTo(s.ox - 2, s.oy - 2);
                ctx.lineTo(s.ox - 2, s.oy + 2);
            }
            ctx.fill();
        }

        // Fleet count label (pill style with theme colors)
        ctx.rotate(-this.angle);
        const label = String(this.shipCount);
        const textColor = (theme && theme.textColor) || '#fff';
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const tw = ctx.measureText(label).width;
        const pw = tw + 8;
        const ph = 13;
        const px = -pw / 2;
        const py = -14 - ph;
        // Combined fill + stroke in single path pair
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, ph / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.strokeStyle = colors.planet;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = textColor === '#ffffff' ? '#ddd' : '#3E2723';
        ctx.globalAlpha = 0.9;
        ctx.fillText(label, 0, -14);
        ctx.globalAlpha = 1;

        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------
class AI {
    constructor(ownerId, difficulty) {
        this.ownerId = ownerId;
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
        this.thinkTimer = 0;
        this.thinkInterval = this._getThinkInterval();
    }

    _getThinkInterval() {
        switch (this.difficulty) {
            case 'easy':       return rand(2500, 3500);
            case 'medium':     return rand(1500, 2500);
            case 'hard':       return rand(800, 1500);
            case 'impossible': return rand(300, 600);
            default:           return 2000;
        }
    }

    update(dt, gameState) {
        this.thinkTimer += dt;
        if (this.thinkTimer >= this.thinkInterval) {
            this.thinkTimer = 0;
            this.thinkInterval = this._getThinkInterval();
            this.think(gameState);
        }
    }

    think(gameState) {
        const { planets, fleets, sendFleet } = gameState;
        const myPlanets = planets.filter(p => p.owner === this.ownerId);
        if (myPlanets.length === 0) return;

        const enemyPlanets = planets.filter(p => p.owner !== this.ownerId && p.owner !== 'neutral');
        const neutralPlanets = planets.filter(p => p.owner === 'neutral');
        const myFleets = fleets.filter(f => f.owner === this.ownerId);

        switch (this.difficulty) {
            case 'easy':       this._thinkEasy(myPlanets, enemyPlanets, neutralPlanets, sendFleet); break;
            case 'medium':     this._thinkMedium(myPlanets, enemyPlanets, neutralPlanets, fleets, sendFleet); break;
            case 'hard':       this._thinkHard(myPlanets, enemyPlanets, neutralPlanets, fleets, sendFleet); break;
            case 'impossible': this._thinkImpossible(myPlanets, enemyPlanets, neutralPlanets, fleets, sendFleet, planets); break;
        }
    }

    // --- Easy AI: random moves, no strategy ---
    _thinkEasy(myPlanets, enemyPlanets, neutralPlanets, sendFleet) {
        const sources = myPlanets.filter(p => p.shipCount > 15);
        if (sources.length === 0) return;

        const source = sources[randInt(0, sources.length - 1)];
        const targets = [...enemyPlanets, ...neutralPlanets];
        if (targets.length === 0) return;

        const target = targets[randInt(0, targets.length - 1)];
        sendFleet(source, target, 0.5);
    }

    // --- Medium AI: evaluates targets, some reinforcement ---
    _thinkMedium(myPlanets, enemyPlanets, neutralPlanets, fleets, sendFleet) {
        const sources = myPlanets.filter(p => p.shipCount > 20);
        if (sources.length === 0) return;

        // Score each potential target
        const allTargets = [...neutralPlanets, ...enemyPlanets];
        if (allTargets.length === 0) {
            this._reinforceWeakest(myPlanets, sources, sendFleet);
            return;
        }

        let bestScore = -Infinity;
        let bestTarget = null;
        let bestSource = null;

        for (const src of sources) {
            for (const tgt of allTargets) {
                const d = dist(src.x, src.y, tgt.x, tgt.y);
                const shipAdvantage = src.shipCount * 0.5 - tgt.shipCount;
                // Prefer close, weak, large planets
                const score = (shipAdvantage * 2) + (tgt.radius * 1.5) - (d * 0.1);
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = tgt;
                    bestSource = src;
                }
            }
        }

        if (bestTarget && bestScore > -10) {
            sendFleet(bestSource, bestTarget, 0.55);
        } else {
            // Reinforce weakest owned planet
            this._reinforceWeakest(myPlanets, sources, sendFleet);
        }
    }

    // --- Hard AI: optimal play, coordinated attacks ---
    _thinkHard(myPlanets, enemyPlanets, neutralPlanets, fleets, sendFleet) {
        const sources = myPlanets.filter(p => p.shipCount > 8);
        if (sources.length === 0) return;

        // Pre-index fleets by target once
        const fleetsByTarget = new Map();
        const myFleetsByTarget = new Map();
        for (const f of fleets) {
            if (!fleetsByTarget.has(f.targetPlanet)) fleetsByTarget.set(f.targetPlanet, []);
            fleetsByTarget.get(f.targetPlanet).push(f);
            if (f.owner === this.ownerId) {
                if (!myFleetsByTarget.has(f.targetPlanet)) myFleetsByTarget.set(f.targetPlanet, []);
                myFleetsByTarget.get(f.targetPlanet).push(f);
            }
        }

        // Incoming threat analysis: check if enemy fleets target our planets
        const threatened = this._findThreatenedPlanets(myPlanets, fleets);

        // Priority 1: Reinforce seriously threatened planets
        if (threatened.length > 0) {
            for (const { planet: tp, incomingShips } of threatened) {
                if (tp.shipCount < incomingShips * 1.2) {
                    // Find closest helper using cached distances
                    let closestHelper = null;
                    let closestHelperDist = Infinity;
                    for (const s of sources) {
                        if (s !== tp && s.shipCount > 20) {
                            const d = dist(s.x, s.y, tp.x, tp.y);
                            if (d < closestHelperDist) { closestHelperDist = d; closestHelper = s; }
                        }
                    }
                    if (closestHelper) {
                        sendFleet(closestHelper, tp, 0.5);
                        return;
                    }
                }
            }
        }

        // Priority 2: Coordinated attack on best target
        const allTargets = [...neutralPlanets, ...enemyPlanets];
        if (allTargets.length === 0) return;

        let bestTarget = null;
        let bestScore = -Infinity;

        for (const tgt of allTargets) {
            let totalCanSend = 0;
            let closestDist = Infinity;
            for (const src of sources) {
                const d = dist(src.x, src.y, tgt.x, tgt.y);
                if (d < closestDist) closestDist = d;
                totalCanSend += Math.floor(src.shipCount * 0.6);
            }

            // Single-pass over pre-indexed fleets
            let enemyReinforce = 0;
            const targetFleets = fleetsByTarget.get(tgt) || [];
            for (const f of targetFleets) { if (f.owner === tgt.owner) enemyReinforce += f.shipCount; }
            let ourIncoming = 0;
            const myTargetFleets = myFleetsByTarget.get(tgt) || [];
            for (const f of myTargetFleets) ourIncoming += f.shipCount;

            const effectiveDefense = tgt.shipCount + enemyReinforce - ourIncoming;
            const shipAdvantage = totalCanSend - effectiveDefense;

            // Weight by radius² for production value, but less aggressively than Impossible
            const productionValue = tgt.radius * tgt.radius * 0.06;
            const score = (shipAdvantage * 3) + productionValue * 3 - (closestDist * 0.04);

            // Strong bonus for attacking player
            if (tgt.owner === 'player') {
                const playerScore = score + 35;
                if (playerScore > bestScore) {
                    bestScore = playerScore;
                    bestTarget = tgt;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestTarget = tgt;
            }
        }

        // Occasionally attack player even when neutrals look better
        if (bestTarget && bestTarget.owner === 'neutral' && enemyPlanets.some(p => p.owner === 'player')) {
            if (Math.random() < 0.25) {
                let weakestPlayer = null;
                let weakestCount = Infinity;
                for (const p of enemyPlanets) {
                    if (p.owner === 'player' && p.shipCount < weakestCount) {
                        weakestCount = p.shipCount;
                        weakestPlayer = p;
                    }
                }
                if (weakestPlayer) bestTarget = weakestPlayer;
            }
        }

        if (bestTarget && bestScore > 0) {
            // Multi-planet coordinated attack: send from up to 3 planets
            // Schwartzian transform to cache dist calls
            const attackCandidates = [];
            for (const s of sources) {
                if (s.shipCount > 12) {
                    attackCandidates.push({ s, d: dist(s.x, s.y, bestTarget.x, bestTarget.y) });
                }
            }
            attackCandidates.sort((a, b) => a.d - b.d);

            let shipsNeeded = bestTarget.shipCount + 12;
            let sent = 0;
            let launched = 0;
            for (const { s: src } of attackCandidates) {
                if (sent >= shipsNeeded || launched >= 3) break;
                const toSend = Math.floor(src.shipCount * 0.6);
                if (toSend > 4) {
                    sendFleet(src, bestTarget, 0.6);
                    sent += toSend;
                    launched++;
                }
            }
        } else {
            // Economy awareness: reinforce large-radius planets that are low on ships
            const valuableLow = myPlanets
                .filter(p => p.radius >= 25 && p.shipCount < 20)
                .sort((a, b) => b.radius - a.radius);
            if (valuableLow.length > 0) {
                const reinforceTarget = valuableLow[0];
                const donor = sources
                    .filter(s => s !== reinforceTarget && s.shipCount > 25)
                    .sort((a, b) => b.shipCount - a.shipCount)[0];
                if (donor) {
                    sendFleet(donor, reinforceTarget, 0.35);
                    return;
                }
            }
            // Fallback: reinforce weakest planet
            this._reinforceWeakest(myPlanets, sources, sendFleet);
        }
    }

    // --- Impossible AI: near-perfect play with multi-front warfare ---
    _thinkImpossible(myPlanets, enemyPlanets, neutralPlanets, fleets, sendFleet, allPlanets) {
        if (myPlanets.length === 0) return;

        // Pre-index fleets by target and owner once
        const fleetsByTarget = new Map();
        const myFleetsByTarget = new Map();
        let myFleetShips = 0;
        for (const f of fleets) {
            if (!fleetsByTarget.has(f.targetPlanet)) fleetsByTarget.set(f.targetPlanet, []);
            fleetsByTarget.get(f.targetPlanet).push(f);
            if (f.owner === this.ownerId) {
                if (!myFleetsByTarget.has(f.targetPlanet)) myFleetsByTarget.set(f.targetPlanet, []);
                myFleetsByTarget.get(f.targetPlanet).push(f);
                myFleetShips += f.shipCount;
            }
        }

        const myTotalShips = myPlanets.reduce((s, p) => s + p.shipCount, 0) + myFleetShips;
        const myProduction = myPlanets.reduce((s, p) => s + p.radius, 0);

        // --- Phase 1: Threat response (immediate) ---
        const threatened = this._findThreatenedPlanets(myPlanets, fleets);
        for (const { planet: tp, incomingShips } of threatened) {
            const deficit = incomingShips - tp.shipCount;
            // Only defend planets worth defending (large planets or if we have few)
            const worthDefending = tp.radius >= 25 || myPlanets.length <= 3;
            if (deficit > -5 && worthDefending) {
                // Schwartzian transform for distance sort
                const helperCandidates = [];
                for (const s of myPlanets) {
                    if (s !== tp && s.shipCount > 8) {
                        helperCandidates.push({ s, d: dist(s.x, s.y, tp.x, tp.y) });
                    }
                }
                helperCandidates.sort((a, b) => a.d - b.d);
                let sent = 0;
                for (const { s: h } of helperCandidates) {
                    if (sent > deficit + 15) break;
                    const toSend = Math.floor(h.shipCount * 0.6);
                    if (toSend > 3) { sendFleet(h, tp, 0.6); sent += toSend; }
                }
                if (sent > 0) return;
            }
        }

        // --- Phase 2: Always snipe large undefended/weak neutrals ---
        const juicyNeutrals = [];
        for (const n of neutralPlanets) {
            // Check no one else is already heading there (single-pass via pre-indexed map)
            let incomingFriendly = 0;
            const myTargetFleets = myFleetsByTarget.get(n) || [];
            for (const f of myTargetFleets) incomingFriendly += f.shipCount;
            if (incomingFriendly > 0) continue;

            // Find closest own planet without array allocation
            let closestOwn = Infinity;
            for (const m of myPlanets) {
                const d = dist(m.x, m.y, n.x, n.y);
                if (d < closestOwn) closestOwn = d;
            }
            const score = (n.radius * n.radius * 0.15) - n.shipCount * 1.5 - closestOwn * 0.03;
            if (score > 0) {
                juicyNeutrals.push({ planet: n, score });
            }
        }
        juicyNeutrals.sort((a, b) => b.score - a.score);

        // Grab up to 2 neutrals simultaneously if we can afford it
        let neutralsGrabbed = 0;
        for (const neutral of juicyNeutrals) {
            if (neutralsGrabbed >= 2) break;
            // Find closest source that can afford the attack
            let bestSrc = null;
            let bestSrcDist = Infinity;
            for (const p of myPlanets) {
                if (p.shipCount > neutral.planet.shipCount + 8) {
                    const d = dist(p.x, p.y, neutral.planet.x, neutral.planet.y);
                    if (d < bestSrcDist) { bestSrcDist = d; bestSrc = p; }
                }
            }
            if (bestSrc) {
                sendFleet(bestSrc, neutral.planet, 0.55);
                neutralsGrabbed++;
            }
        }
        if (neutralsGrabbed > 0 && myPlanets.length < 5) return;

        // --- Phase 3: Identify weakest enemy and focus fire ---
        const enemies = {};
        for (const p of allPlanets) {
            if (p.owner !== this.ownerId && p.owner !== 'neutral') {
                if (!enemies[p.owner]) enemies[p.owner] = { planets: 0, ships: 0, production: 0 };
                enemies[p.owner].planets++;
                enemies[p.owner].ships += p.shipCount;
                enemies[p.owner].production += p.radius;
            }
        }
        for (const f of fleets) {
            if (f.owner !== this.ownerId && f.owner !== 'neutral' && enemies[f.owner]) {
                enemies[f.owner].ships += f.shipCount;
            }
        }

        // Target the weakest enemy (fewest ships+production)
        let targetEnemy = null;
        let minStrength = Infinity;
        for (const [owner, info] of Object.entries(enemies)) {
            const strength = info.ships + info.production * 5;
            if (strength < minStrength) { minStrength = strength; targetEnemy = owner; }
        }

        // --- Phase 4: Coordinated strike on highest-value target ---
        const primaryTargets = targetEnemy
            ? allPlanets.filter(p => p.owner === targetEnemy)
            : [...enemyPlanets, ...neutralPlanets];

        if (primaryTargets.length === 0) {
            if (neutralPlanets.length > 0) {
                let bestSrc = myPlanets[0];
                for (let i = 1; i < myPlanets.length; i++) {
                    if (myPlanets[i].shipCount > bestSrc.shipCount) bestSrc = myPlanets[i];
                }
                let bestNeutral = neutralPlanets[0];
                for (let i = 1; i < neutralPlanets.length; i++) {
                    if (neutralPlanets[i].radius > bestNeutral.radius) bestNeutral = neutralPlanets[i];
                }
                if (bestSrc.shipCount > bestNeutral.shipCount + 10) sendFleet(bestSrc, bestNeutral, 0.6);
            }
            return;
        }

        // Score targets: heavily prioritize LARGE planets (high production value)
        let bestTarget = null;
        let bestScore = -Infinity;
        for (const tgt of primaryTargets) {
            let totalCanSend = 0;
            let closestDist = Infinity;
            for (const src of myPlanets) {
                const spare = src.shipCount - 6;
                if (spare > 0) {
                    totalCanSend += Math.floor(spare * 0.7);
                    const d = dist(src.x, src.y, tgt.x, tgt.y);
                    if (d < closestDist) closestDist = d;
                }
            }

            // Single-pass over pre-indexed fleets
            let enemyReinforce = 0;
            const targetFleets = fleetsByTarget.get(tgt) || [];
            for (const f of targetFleets) { if (f.owner === tgt.owner) enemyReinforce += f.shipCount; }
            let ourIncoming = 0;
            const myTargetFleets = myFleetsByTarget.get(tgt) || [];
            for (const f of myTargetFleets) ourIncoming += f.shipCount;

            const effectiveDefense = tgt.shipCount + enemyReinforce - ourIncoming;
            const surplus = totalCanSend - effectiveDefense;

            // Key insight: value = radius^2 (production compounds!)
            const productionValue = tgt.radius * tgt.radius * 0.1;
            const score = surplus * 2 + productionValue * 4 - closestDist * 0.03;

            if (score > bestScore) { bestScore = score; bestTarget = tgt; }
        }

        if (bestTarget && bestScore > 0) {
            // Launch coordinated attack — send 70% from multiple planets
            // Schwartzian transform to cache dist calls
            const attackCandidates = [];
            for (const p of myPlanets) {
                if (p.shipCount > 8) {
                    attackCandidates.push({ s: p, d: dist(p.x, p.y, bestTarget.x, bestTarget.y) });
                }
            }
            attackCandidates.sort((a, b) => a.d - b.d);

            const needed = bestTarget.shipCount + 20;
            let sent = 0;
            for (const { s: src } of attackCandidates) {
                if (sent >= needed * 1.3) break; // overshoot by 30% for safety
                const toSend = Math.floor(src.shipCount * 0.7);
                if (toSend > 3) { sendFleet(src, bestTarget, 0.7); sent += toSend; }
            }
        }

        // --- Phase 5: Continuous reinforcement of frontier + economy planets ---
        if (myPlanets.length >= 3) {
            // Identify frontier planets (close to enemies) — avoid Math.min(...map())
            const frontierPlanets = [];
            for (const p of myPlanets) {
                let nearestEnemy = 999;
                for (const e of enemyPlanets) {
                    const d = dist(p.x, p.y, e.x, e.y);
                    if (d < nearestEnemy) nearestEnemy = d;
                }
                if (nearestEnemy < 350) frontierPlanets.push(p);
            }
            frontierPlanets.sort((a, b) => a.shipCount - b.shipCount);

            // Also reinforce large planets (high production value) that are low on defense
            const valuablePlanets = myPlanets
                .filter(p => p.radius >= 30 && p.shipCount < 25)
                .sort((a, b) => b.radius - a.radius);

            const reinforceTarget = valuablePlanets[0] || (frontierPlanets.length > 0 ? frontierPlanets[0] : null);

            if (reinforceTarget) {
                const backPlanets = myPlanets
                    .filter(p => p !== reinforceTarget && p.shipCount > 35)
                    .sort((a, b) => b.shipCount - a.shipCount);
                if (backPlanets.length > 0) {
                    const strongBack = backPlanets[0];
                    if (strongBack.shipCount > reinforceTarget.shipCount * 1.3) {
                        sendFleet(strongBack, reinforceTarget, 0.3);
                    }
                }
            }
        }
    }

    _findThreatenedPlanets(myPlanets, fleets) {
        // Pre-compute incoming enemy ships per planet in a single pass
        const incomingMap = new Map();
        for (const f of fleets) {
            if (f.owner !== this.ownerId) {
                const cur = incomingMap.get(f.targetPlanet) || 0;
                incomingMap.set(f.targetPlanet, cur + f.shipCount);
            }
        }
        const results = [];
        for (const p of myPlanets) {
            const incoming = incomingMap.get(p) || 0;
            if (incoming > 0) {
                results.push({ planet: p, incomingShips: incoming });
            }
        }
        return results.sort((a, b) => b.incomingShips - a.incomingShips);
    }

    _reinforceWeakest(myPlanets, sources, sendFleet) {
        if (myPlanets.length < 2) return;
        const weakest = myPlanets.reduce((w, p) => p.shipCount < w.shipCount ? p : w, myPlanets[0]);
        const strongest = sources.filter(s => s !== weakest).sort((a, b) => b.shipCount - a.shipCount)[0];
        if (strongest && strongest.shipCount > 30 && weakest.shipCount < strongest.shipCount * 0.4) {
            sendFleet(strongest, weakest, 0.3);
        }
    }
}

// ---------------------------------------------------------------------------
// Game – main engine
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Spatial grid for O(1) point-to-planet lookups (mouse/touch hit detection)
// ---------------------------------------------------------------------------
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize || 100;
        this.cols = Math.ceil(width / this.cellSize);
        this.rows = Math.ceil(height / this.cellSize);
        this.cells = new Array(this.cols * this.rows);
        this.clear();
    }
    clear() {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = this.cells[i] || [];
            this.cells[i].length = 0;
        }
    }
    _cellIndex(x, y) {
        const col = Math.min(Math.max(Math.floor(x / this.cellSize), 0), this.cols - 1);
        const row = Math.min(Math.max(Math.floor(y / this.cellSize), 0), this.rows - 1);
        return row * this.cols + col;
    }
    insert(planet) {
        const r = planet.radius;
        const minCol = Math.max(0, Math.floor((planet.x - r) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((planet.x + r) / this.cellSize));
        const minRow = Math.max(0, Math.floor((planet.y - r) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((planet.y + r) / this.cellSize));
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                this.cells[row * this.cols + col].push(planet);
            }
        }
    }
    query(x, y) {
        const idx = this._cellIndex(x, y);
        return this.cells[idx];
    }
}

class Game {
    constructor(canvas, themeId) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.state = 'menu'; // 'menu', 'playing', 'won', 'lost', 'paused'
        this.planets = [];
        this.fleets = [];
        this.particlePool = new ParticlePool(200);
        this.ais = [];
        this.selectedPlanets = [];
        this.selectedFleets = [];
        this.theme = (typeof getTheme === 'function') ? getTheme(themeId || 'space') : (window.getTheme ? window.getTheme(themeId || 'space') : null);
        _activeThemeColors = this.theme ? this.theme.colors : null;
        window._activeTheme = this.theme;
        this.starfield = this.theme ? this.theme.createBackground(this.width, this.height) : { resize() {}, draw() {} };
        this.frameCount = 0;
        this.lastTime = 0;
        this.dt = 0;
        this.difficulty = 'medium';
        this.numAIs = 1;
        this.speed = 1;
        this.spectatorMode = false;

        // Campaign properties
        this.winCondition = 'capture-all';
        this.campaignTimeLimit = null;
        this.targetPlanetIndex = null;
        this.campaignTimer = 0;

        // Fleet line preview (from selected to mouse)
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredPlanet = null;

        // Drag box selection
        this._dragStart = null;  // {x, y}
        this._dragEnd = null;    // {x, y}
        this._isDragging = false;
        this._dragThreshold = 10; // px before a click becomes a drag

        // Spatial grid for hit detection
        this.spatialGrid = null;

        // Stats tracking
        this.stats = { planetsCaptured: 0, fleetsSent: 0, shipsSent: 0 };

        // Callbacks (set by main.js)
        this.onCapture = null;
        this.onFleetSend = null;
        this.onGameOver = null;
        this.onSelect = null;
        this.onCombatCapture = null;

        // Detect if external HTML UI is present
        this._hasExternalUI = !!document.getElementById('menu-screen');

        this._bindEvents();
        this._startLoop();
    }

    setTheme(themeId) {
        const getter = (typeof getTheme === 'function') ? getTheme : window.getTheme;
        if (!getter) return;
        this.theme = getter(themeId);
        _activeThemeColors = this.theme.colors;
        window._activeTheme = this.theme;
        this.starfield = this.theme.createBackground(this.width, this.height);
    }

    // --- Event binding (only when no external HTML UI) ---
    _bindEvents() {
        // If the HTML UI exists, main.js handles all events
        if (document.getElementById('menu-screen')) return;

        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._onRightClick(e); });
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('resize', () => this._onResize());
    }

    _onResize() {
        this.width = this.canvas.width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
        this.height = this.canvas.height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
        this.starfield.resize(this.width, this.height);
    }

    _onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.hoveredPlanet = this._findPlanetAt(this.mouseX, this.mouseY);
    }

    _onMouseDown(e) {
        if (e.button !== 0) return; // left click only
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.state === 'menu') {
            this._handleMenuClick(x, y);
            return;
        }
        if (this.state === 'won' || this.state === 'lost') {
            this.restart();
            return;
        }
        if (this.state !== 'playing') return;

        this.handleClick(x, y, e.shiftKey, e.ctrlKey || e.metaKey);
    }

    _onRightClick(e) {
        if (this.state === 'playing') {
            this.deselectAll();
        }
    }

    _onKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.state === 'playing') {
                if (this.selectedPlanets.length > 0) {
                    this.deselectAll();
                } else {
                    this.state = 'paused';
                }
            } else if (this.state === 'paused') {
                this.state = 'playing';
            }
        }
        if (e.key === 'r' || e.key === 'R') {
            if (this.state === 'won' || this.state === 'lost') {
                this.restart();
            }
        }
    }

    // --- Menu ---
    _handleMenuClick(x, y) {
        const cx = this.width / 2;
        const baseY = this.height / 2 - 30;

        // Difficulty buttons
        const btnW = 140, btnH = 40, gap = 20;
        const difficulties = ['easy', 'medium', 'hard'];
        const diffY = baseY;
        for (let i = 0; i < 3; i++) {
            const bx = cx - (3 * btnW + 2 * gap) / 2 + i * (btnW + gap);
            if (x >= bx && x <= bx + btnW && y >= diffY && y <= diffY + btnH) {
                this.difficulty = difficulties[i];
            }
        }

        // AI count buttons
        const aiY = diffY + 70;
        for (let i = 0; i < 3; i++) {
            const bx = cx - (3 * btnW + 2 * gap) / 2 + i * (btnW + gap);
            if (x >= bx && x <= bx + btnW && y >= aiY && y <= aiY + btnH) {
                this.numAIs = i + 1;
            }
        }

        // Start button
        const startW = 200, startH = 50;
        const startY = aiY + 80;
        const startX = cx - startW / 2;
        if (x >= startX && x <= startX + startW && y >= startY && y <= startY + startH) {
            this.startGame(this.numAIs, this.difficulty);
        }
    }

    // --- Game logic ---
    handleClick(x, y, shiftKey, ctrlKey) {
        const clickedPlanet = this._findPlanetAt(x, y);

        // If we have selected fleets, clicking a planet reroutes them
        if (this.selectedFleets.length > 0) {
            if (clickedPlanet) {
                for (const f of this.selectedFleets) {
                    f.retarget(clickedPlanet);
                    f.selected = false;
                }
                this.selectedFleets = [];
            }
            return;
        }

        // Check if clicking a fleet (only player's)
        if (!clickedPlanet) {
            const clickedFleet = this.fleets.find(f =>
                f.owner === 'player' && f.alive &&
                dist(x, y, f.x, f.y) < 20
            );
            if (clickedFleet) {
                if (ctrlKey) {
                    clickedFleet.selected = !clickedFleet.selected;
                    if (clickedFleet.selected) {
                        this.selectedFleets.push(clickedFleet);
                    } else {
                        this.selectedFleets = this.selectedFleets.filter(f => f !== clickedFleet);
                    }
                } else {
                    this.deselectAllFleets();
                    clickedFleet.selected = true;
                    this.selectedFleets = [clickedFleet];
                }
                this.deselectAll();
                return;
            }
            if (!ctrlKey) {
                this.deselectAll();
                this.deselectAllFleets();
            }
            return;
        }

        this.deselectAllFleets();

        // If we have selected planets and click a different planet -> send fleet
        if (this.selectedPlanets.length > 0 && !this.selectedPlanets.includes(clickedPlanet)) {
            const pct = shiftKey ? SEND_PERCENTAGE_SHIFT : SEND_PERCENTAGE_DEFAULT;
            for (const src of this.selectedPlanets) {
                if (src.shipCount >= 2) {
                    this.sendFleet(src, clickedPlanet, pct);
                }
            }
            if (!ctrlKey) this.deselectAll();
            return;
        }

        // If we have multiple selected planets and click one that's in the selection -> reinforce it
        if (this.selectedPlanets.length > 1 && this.selectedPlanets.includes(clickedPlanet) && clickedPlanet.owner === 'player') {
            const pct = shiftKey ? SEND_PERCENTAGE_SHIFT : SEND_PERCENTAGE_DEFAULT;
            for (const src of this.selectedPlanets) {
                if (src !== clickedPlanet && src.shipCount >= 2) {
                    this.sendFleet(src, clickedPlanet, pct);
                }
            }
            if (!ctrlKey) this.deselectAll();
            return;
        }

        // Clicking own planet: select/deselect
        if (clickedPlanet.owner === 'player') {
            if (ctrlKey) {
                // Toggle selection
                if (clickedPlanet.selected) {
                    clickedPlanet.selected = false;
                    this.selectedPlanets = this.selectedPlanets.filter(p => p !== clickedPlanet);
                } else {
                    clickedPlanet.selected = true;
                    this.selectedPlanets.push(clickedPlanet);
                }
            } else {
                // Single select
                this.deselectAll();
                clickedPlanet.selected = true;
                this.selectedPlanets = [clickedPlanet];
                if (this.onSelect) this.onSelect(clickedPlanet);
            }
        } else {
            // Clicked enemy/neutral with selection -> send
            if (this.selectedPlanets.length > 0) {
                const pct = shiftKey ? SEND_PERCENTAGE_SHIFT : SEND_PERCENTAGE_DEFAULT;
                for (const src of this.selectedPlanets) {
                    if (src.shipCount >= 2) {
                        this.sendFleet(src, clickedPlanet, pct);
                    }
                }
                if (!ctrlKey) this.deselectAll();
            }
        }
    }

    deselectAll() {
        for (const p of this.selectedPlanets) p.selected = false;
        this.selectedPlanets = [];
    }

    deselectAllFleets() {
        for (const f of this.selectedFleets) f.selected = false;
        this.selectedFleets = [];
    }

    selectAllPlayerPlanets() {
        this.deselectAll();
        this.deselectAllFleets();
        const myPlanets = this.planets.filter(p => p.owner === 'player');
        for (const p of myPlanets) p.selected = true;
        this.selectedPlanets = myPlanets;
        if (myPlanets.length > 0 && this.onSelect) this.onSelect(myPlanets[0]);
    }

    handleDoubleClick(x, y) {
        const clickedPlanet = this._findPlanetAt(x, y);
        if (clickedPlanet && clickedPlanet.owner === 'player') {
            this.selectAllPlayerPlanets();
        }
    }

    // --- Drag box selection ---
    startDrag(x, y) {
        this._dragStart = { x, y };
        this._dragEnd = { x, y };
        this._isDragging = false;
    }

    updateDrag(x, y) {
        if (!this._dragStart) return;
        this._dragEnd = { x, y };
        const dx = x - this._dragStart.x;
        const dy = y - this._dragStart.y;
        if (!this._isDragging && Math.sqrt(dx * dx + dy * dy) > this._dragThreshold) {
            this._isDragging = true;
        }
    }

    endDrag(x, y, ctrlKey) {
        if (!this._dragStart) return false;
        this._dragEnd = { x, y };
        const wasDragging = this._isDragging;

        if (wasDragging) {
            const minX = Math.min(this._dragStart.x, x);
            const maxX = Math.max(this._dragStart.x, x);
            const minY = Math.min(this._dragStart.y, y);
            const maxY = Math.max(this._dragStart.y, y);

            if (!ctrlKey) this.deselectAll();
            this.deselectAllFleets();

            for (const p of this.planets) {
                if (p.owner === 'player' &&
                    p.x >= minX && p.x <= maxX &&
                    p.y >= minY && p.y <= maxY) {
                    if (!p.selected) {
                        p.selected = true;
                        this.selectedPlanets.push(p);
                    }
                }
            }
            if (this.selectedPlanets.length > 0 && this.onSelect) {
                this.onSelect(this.selectedPlanets[0]);
            }
        }

        this._dragStart = null;
        this._dragEnd = null;
        this._isDragging = false;
        return wasDragging;
    }

    getDragRect() {
        if (!this._isDragging || !this._dragStart || !this._dragEnd) return null;
        return {
            x: Math.min(this._dragStart.x, this._dragEnd.x),
            y: Math.min(this._dragStart.y, this._dragEnd.y),
            w: Math.abs(this._dragEnd.x - this._dragStart.x),
            h: Math.abs(this._dragEnd.y - this._dragStart.y)
        };
    }

    sendFleet(fromPlanet, toPlanet, percentage) {
        if (fromPlanet === toPlanet) return;
        const ships = Math.floor(fromPlanet.shipCount * percentage);
        if (ships < 1) return;
        fromPlanet.shipCount -= ships;
        const fleet = new Fleet(fromPlanet, toPlanet, ships, fromPlanet.owner);
        this.fleets.push(fleet);
        if (fromPlanet.owner === 'player') {
            this.stats.fleetsSent++;
            this.stats.shipsSent += ships;
            if (this.onFleetSend) this.onFleetSend(fleet);
        }
    }

    spawnParticles(x, y, color, type, count) {
        const config = this.theme && this.theme.particleConfig ? this.theme.particleConfig(type) : null;
        for (let i = 0; i < count; i++) {
            this.particlePool.acquire(x, y, color, type, config);
        }
    }

    // --- Map generation ---
    generateMap(numPlanets, numAIs, difficulty, spectatorMode) {
        if (difficulty) this.difficulty = difficulty;
        this.spectatorMode = !!spectatorMode;
        this.numAIs = numAIs;
        this.planets = [];
        this.fleets = [];
        this.particlePool.clear();
        this.selectedPlanets = [];
        this.selectedFleets = [];
        this.ais = [];

        const aiIds = ['ai1', 'ai2', 'ai3'];
        const owners = spectatorMode ? [] : ['player'];
        for (let i = 0; i < numAIs; i++) owners.push(aiIds[i]);

        const margin = MAX_PLANET_RADIUS + 20;
        const w = this.width;
        const h = this.height;

        // Place starting planets for each player roughly equidistant
        const startRadius = Math.min(w, h) * 0.35;
        const cx = w / 2;
        const cy = h / 2;
        const angleStep = (Math.PI * 2) / owners.length;

        for (let i = 0; i < owners.length; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const px = cx + Math.cos(angle) * startRadius;
            const py = cy + Math.sin(angle) * startRadius;
            const r = rand(28, 35);
            const planet = new Planet(
                clamp(px, margin, w - margin),
                clamp(py, margin, h - margin),
                r, owners[i], 50
            );
            this.planets.push(planet);
        }

        // Fill with neutral planets
        const maxAttempts = Math.max(2000, numPlanets * 200);
        // Scale spacing based on screen area so planets always fit
        const screenArea = w * h;
        let spacingFactor, maxR;
        if (screenArea > 1500000) {
            spacingFactor = 0.45;
            maxR = MAX_PLANET_RADIUS;
        } else if (screenArea > 600000) {
            spacingFactor = 0.5;
            maxR = MAX_PLANET_RADIUS;
        } else {
            // Small/mobile screens: tighter spacing and smaller planets
            spacingFactor = 0.3;
            maxR = Math.min(MAX_PLANET_RADIUS, 32);
        }
        let attempts = 0;
        while (this.planets.length < numPlanets && attempts < maxAttempts) {
            attempts++;
            const r = rand(MIN_PLANET_RADIUS, maxR);
            const px = rand(margin, w - margin);
            const py = rand(margin, h - margin);

            // Check distance from all existing planets
            let tooClose = false;
            for (const p of this.planets) {
                if (dist(px, py, p.x, p.y) < p.radius + r + MIN_PLANET_DISTANCE * spacingFactor) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                const ships = randInt(5, Math.floor(r * 1.5));
                this.planets.push(new Planet(px, py, r, 'neutral', ships));
            }
        }

        // Create AI instances
        for (let i = 0; i < numAIs; i++) {
            this.ais.push(new AI(aiIds[i], this.difficulty));
        }
        this.buildSpatialGrid();
    }

    // --- Campaign map generation ---
    generateCampaignMap(levelData) {
        this.planets = [];
        this.fleets = [];
        this.particlePool.clear();
        this.selectedPlanets = [];
        this.selectedFleets = [];
        this.ais = [];
        if (levelData.difficulty) this.difficulty = levelData.difficulty;
        this.numAIs = levelData.numAIs || 1;

        // Campaign win condition properties
        this.winCondition = levelData.winCondition || 'capture-all';
        this.campaignTimeLimit = levelData.timeLimit || null;
        this.targetPlanetIndex = levelData.targetPlanetIndex != null ? levelData.targetPlanetIndex : null;
        this.campaignTimer = 0;

        // Place planets from levelData.planets array
        // x,y are 0-1 fractions, scale to canvas dimensions
        const w = this.width;
        const h = this.height;
        const margin = 30;
        for (const pd of (levelData.planets || [])) {
            const px = Math.max(margin, Math.min(w - margin, pd.x * w));
            const py = Math.max(margin, Math.min(h - margin, pd.y * h));
            const r = pd.r || pd.radius || 20;
            const owner = pd.owner || 'neutral';
            const ships = pd.ships != null ? pd.ships : (pd.shipCount != null ? pd.shipCount : 10);
            const planet = new Planet(px, py, r, owner, ships);
            if (pd.powerUp) planet.powerUp = pd.powerUp;
            this.planets.push(planet);
        }

        // Create AI instances
        const aiIds = ['ai1', 'ai2', 'ai3'];
        for (let i = 0; i < this.numAIs; i++) {
            this.ais.push(new AI(aiIds[i], this.difficulty));
        }
        this.buildSpatialGrid();
    }

    buildSpatialGrid() {
        this.spatialGrid = new SpatialGrid(this.width, this.height, 120);
        for (const p of this.planets) {
            this.spatialGrid.insert(p);
        }
    }

    _findPlanetAt(x, y) {
        if (!this.spatialGrid) return this.planets.find(p => p.containsPoint(x, y));
        const candidates = this.spatialGrid.query(x, y);
        for (const p of candidates) {
            if (p.containsPoint(x, y)) return p;
        }
        return null;
    }

    // --- Add random power-up planets to existing map (for freeplay large maps) ---
    addPowerUpPlanets(count) {
        const powerUpTypes = ['shield', 'speed', 'plague', 'fortress', 'spawner'];
        // Only assign power-ups to neutral planets that don't already have one
        const candidates = this.planets.filter(p => p.owner === 'neutral' && !p.powerUp);
        const toAssign = Math.min(count, candidates.length);

        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        for (let i = 0; i < toAssign; i++) {
            candidates[i].powerUp = powerUpTypes[i % powerUpTypes.length];
        }
    }

    startGame(numAIs, difficulty) {
        this.difficulty = difficulty;
        this.numAIs = numAIs;
        const basePlanets = 12 + numAIs * 3;
        const planetCount = Math.min(basePlanets, Math.floor((this.width * this.height) / 25000));
        this.generateMap(Math.max(8, planetCount), numAIs);
        this.state = 'playing';
    }

    restart() {
        this.state = 'menu';
    }

    // --- Win/Lose check ---
    checkWinLose() {
        if (this.spectatorMode) {
            // In spectator mode, game ends when one AI owns everything
            const activeOwners = new Set();
            for (const p of this.planets) {
                if (p.owner !== 'neutral') activeOwners.add(p.owner);
            }
            for (const f of this.fleets) {
                activeOwners.add(f.owner);
            }
            if (activeOwners.size === 1) {
                this.state = 'won';
                if (this.onGameOver) this.onGameOver(true);
            }
            return;
        }

        const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
        const playerFleets = this.fleets.filter(f => f.owner === 'player').length;

        // Player loses if they have 0 planets and 0 fleets (all modes)
        if (playerPlanets === 0 && playerFleets === 0) {
            this.state = 'lost';
            if (this.onGameOver) this.onGameOver(false);
            return;
        }

        // Win condition checks
        switch (this.winCondition) {
            case 'survive': {
                // Player wins when timer expires OR all enemies eliminated
                const nonNeutralS = this.planets.filter(p => p.owner !== 'neutral');
                const allPlayerS = nonNeutralS.every(p => p.owner === 'player');
                const noEnemyFleetsS = !this.fleets.some(f => f.owner !== 'player');
                if ((this.campaignTimeLimit && this.campaignTimer >= this.campaignTimeLimit && playerPlanets > 0) ||
                    (allPlayerS && noEnemyFleetsS && nonNeutralS.length > 0)) {
                    this.state = 'won';
                    if (this.onGameOver) this.onGameOver(true);
                }
                break;
            }

            case 'capture-target':
                // Player wins when the target planet is owned by player
                if (this.targetPlanetIndex != null && this.planets[this.targetPlanetIndex]) {
                    if (this.planets[this.targetPlanetIndex].owner === 'player') {
                        this.state = 'won';
                        if (this.onGameOver) this.onGameOver(true);
                    }
                }
                break;

            case 'time-trial': {
                // Win: capture all before time runs out
                const nonNeutralTT = this.planets.filter(p => p.owner !== 'neutral');
                const allPlayerTT = nonNeutralTT.every(p => p.owner === 'player');
                const noEnemyFleetsTT = !this.fleets.some(f => f.owner !== 'player');
                if (allPlayerTT && noEnemyFleetsTT && nonNeutralTT.length > 0) {
                    this.state = 'won';
                    if (this.onGameOver) this.onGameOver(true);
                }
                // Lose: time ran out
                else if (this.campaignTimeLimit && this.campaignTimer >= this.campaignTimeLimit) {
                    this.state = 'lost';
                    if (this.onGameOver) this.onGameOver(false);
                }
                break;
            }
            case 'capture-all':
            default: {
                // Check if all non-neutral planets belong to player
                const nonNeutral = this.planets.filter(p => p.owner !== 'neutral');
                const allPlayer = nonNeutral.every(p => p.owner === 'player');
                const noEnemyFleets = !this.fleets.some(f => f.owner !== 'player');
                if (allPlayer && noEnemyFleets && nonNeutral.length > 0) {
                    this.state = 'won';
                    if (this.onGameOver) this.onGameOver(true);
                }
                break;
            }
        }
    }

    // --- Main update ---
    update(dt) {
        if (this.state !== 'playing') return;

        // Frame-rate normalization: dtScale = 1.0 at 60fps
        const dtScale = dt / REFERENCE_DT;

        // Campaign timer (in seconds)
        this.campaignTimer += dt / 1000;

        // Update planets
        for (const p of this.planets) p.update(dtScale);

        // Spawner logic: every 8 seconds, generate 5 neutral ships attacking nearest non-neutral planet
        for (const p of this.planets) {
            if (p.powerUp !== 'spawner') continue;
            p._spawnerAccum += dt;
            if (p._spawnerAccum >= 8000) {
                p._spawnerAccum -= 8000;
                // Find nearest non-neutral planet
                let nearest = null;
                let nearDist = Infinity;
                for (const other of this.planets) {
                    if (other === p || other.owner === 'neutral') continue;
                    const d = dist(p.x, p.y, other.x, other.y);
                    if (d < nearDist) { nearDist = d; nearest = other; }
                }
                if (nearest) {
                    const spawnerFleet = new Fleet(p, nearest, 5, p.owner === 'neutral' ? 'neutral' : p.owner);
                    // Spawner fleets are always "neutral" attackers if planet is neutral
                    this.fleets.push(spawnerFleet);
                    // Emit particles
                    this.spawnParticles(p.x, p.y, 'rgba(255,150,0,0.8)', 'explosion', 6);
                }
            }
        }

        // Update fleets
        for (const f of this.fleets) {
            f.update(dtScale);
            if (!f.alive) {
                const prevOwner = f.targetPlanet.owner;
                const previousShipCount = Math.floor(f.targetPlanet.shipCount);
                const result = f.arrive();
                const colors = getOwnerColor(f.owner);
                if (result.type === 'capture') {
                    this.spawnParticles(result.planet.x, result.planet.y, colors.ships, 'capture', 35);
                    this.stats.planetsCaptured++;
                    if (this.onCapture) this.onCapture(f.owner, result.planet);
                    if (this.onCombatCapture) this.onCombatCapture(f, result.planet, previousShipCount);

                    // Plague effect: on capture, reduce nearest enemy planet population by 50%
                    if (result.planet.powerUp === 'plague') {
                        this._triggerPlague(result.planet);
                    }
                } else if (result.type === 'combat') {
                    this.spawnParticles(result.planet.x, result.planet.y, colors.ships, 'explosion', 15);
                } else {
                    this.spawnParticles(result.planet.x, result.planet.y, colors.ships, 'explosion', 8);
                }
            }
        }
        this.fleets = this.fleets.filter(f => f.alive);

        // Update particles
        for (const p of this.particlePool.active) p.update(dtScale);
        this.particlePool.releaseInactive();

        // AI updates
        const sendFleetBound = (from, to, pct) => this.sendFleet(from, to, pct);
        for (const ai of this.ais) {
            try {
                ai.update(dt, {
                    planets: this.planets,
                    fleets: this.fleets,
                    sendFleet: sendFleetBound
                });
            } catch (err) {
                console.error('AI error:', err);
            }
        }

        this.checkWinLose();
    }

    // --- Plague effect: reduce nearest enemy planet's population by 50% ---
    _triggerPlague(plaguePlanet) {
        const owner = plaguePlanet.owner;
        let nearest = null;
        let nearDist = Infinity;
        for (const p of this.planets) {
            if (p === plaguePlanet || p.owner === owner || p.owner === 'neutral') continue;
            const d = dist(plaguePlanet.x, plaguePlanet.y, p.x, p.y);
            if (d < nearDist) { nearDist = d; nearest = p; }
        }
        if (nearest) {
            nearest.shipCount = Math.floor(nearest.shipCount * 0.5);
            // Purple particle burst on target
            this.spawnParticles(nearest.x, nearest.y, 'rgba(180,0,255,0.8)', 'capture', 25);
            this.spawnParticles(plaguePlanet.x, plaguePlanet.y, 'rgba(180,0,255,0.6)', 'explosion', 10);
        }
        // One-time effect: remove plague power-up after activation
        plaguePlanet.powerUp = null;
    }

    // --- Rendering ---
    draw(time) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Background
        ctx.fillStyle = (this.theme && this.theme.bgColor) || '#0a0a2e';
        ctx.fillRect(0, 0, w, h);

        this.starfield.draw(ctx, time);

        if (this.state === 'menu') {
            if (!this._hasExternalUI) this._drawMenu(ctx, w, h, time);
            return;
        }

        // Fleet line preview
        if (this.state === 'playing' && this.selectedPlanets.length > 0) {
            for (const sp of this.selectedPlanets) {
                const ownerCol = getOwnerColor(sp.owner);
                ctx.strokeStyle = ownerCol.planet + '55';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 6]);
                ctx.beginPath();
                ctx.moveTo(sp.x, sp.y);
                ctx.lineTo(this.mouseX, this.mouseY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Fleet reroute line preview
        if (this.state === 'playing' && this.selectedFleets.length > 0) {
            for (const sf of this.selectedFleets) {
                const ownerCol = getOwnerColor(sf.owner);
                ctx.strokeStyle = ownerCol.planet + '55';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 6]);
                ctx.beginPath();
                ctx.moveTo(sf.x, sf.y);
                ctx.lineTo(this.mouseX, this.mouseY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw fleets (behind planets)
        for (const f of this.fleets) f.draw(ctx);

        // Draw planets
        for (const p of this.planets) p.draw(ctx, time);

        // Draw particles (on top)
        for (const p of this.particlePool.active) p.draw(ctx);

        // Draw drag selection box
        const dragRect = this.getDragRect();
        if (dragRect) {
            const dragColor = (this.theme && this.theme.dragBoxColor) || 'rgba(102, 187, 106, 0.7)';
            ctx.strokeStyle = dragColor;
            // Derive fill from stroke with low alpha
            ctx.fillStyle = dragColor.replace(/[\d.]+\)$/, '0.08)');
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.fillRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
            ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
            ctx.setLineDash([]);
        }

        // HUD (skip if external HTML UI handles it)
        if (!this._hasExternalUI) this._drawHUD(ctx, w, h);

        // Win/Lose overlay
        if (this.state === 'won' || this.state === 'lost') {
            if (!this._hasExternalUI) this._drawEndScreen(ctx, w, h);
        }

        // Pause overlay
        if (this.state === 'paused') {
            ctx.fillStyle = (this.theme && this.theme.pauseOverlay) || 'rgba(250,250,245,0.75)';
            ctx.fillRect(0, 0, w, h);
            if (!this._hasExternalUI) {
                const pauseTextColor = (this.theme && this.theme.textColor) || '#3E2723';
                const pauseFont = (this.theme && this.theme.textFont) ? this.theme.textFont.replace(/\d+px/, '48px') : 'bold 48px "Comic Sans MS", "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = pauseTextColor;
                ctx.font = 'bold ' + pauseFont;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('PAUSED', w / 2, h / 2 - 20);
                ctx.font = '18px Arial, sans-serif';
                ctx.fillStyle = '#8D6E63';
                ctx.fillText('Press ESC to resume', w / 2, h / 2 + 25);
            }
        }
    }

    _drawMenu(ctx, w, h, time) {
        const cx = w / 2;

        // Title
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 56px "Comic Sans MS", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const titleY = h / 2 - 140;
        const _menuPlayerColors = getOwnerColor('player');
        ctx.shadowColor = _menuPlayerColors.glow;
        ctx.shadowBlur = 15;
        ctx.fillText('BUG COLONY', cx, titleY);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#8D6E63';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Conquer the garden — one nest at a time', cx, titleY + 40);

        // Difficulty selection
        const btnW = 140, btnH = 40, gap = 20;
        const difficulties = ['easy', 'medium', 'hard'];
        const diffLabels = ['Easy', 'Medium', 'Hard'];
        const baseY = h / 2 - 30;

        ctx.fillStyle = '#8D6E63';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('DIFFICULTY', cx, baseY - 18);

        for (let i = 0; i < 3; i++) {
            const bx = cx - (3 * btnW + 2 * gap) / 2 + i * (btnW + gap);
            const selected = this.difficulty === difficulties[i];
            ctx.fillStyle = selected ? _menuPlayerColors.planet : '#F5F5F0';
            ctx.strokeStyle = selected ? _menuPlayerColors.ships : '#D7CCC8';
            ctx.lineWidth = selected ? 2 : 1;
            this._roundRect(ctx, bx, baseY, btnW, btnH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = selected ? '#ffffff' : '#6D4C41';
            ctx.font = `${selected ? 'bold ' : ''}14px Arial, sans-serif`;
            ctx.fillText(diffLabels[i], bx + btnW / 2, baseY + btnH / 2);
        }

        // AI count
        const aiY = baseY + 70;
        ctx.fillStyle = '#8D6E63';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('OPPONENTS', cx, aiY - 18);
        const aiLabels = ['1 AI', '2 AIs', '3 AIs'];
        const _menuAi1Colors = getOwnerColor('ai1');
        for (let i = 0; i < 3; i++) {
            const bx = cx - (3 * btnW + 2 * gap) / 2 + i * (btnW + gap);
            const selected = this.numAIs === i + 1;
            ctx.fillStyle = selected ? _menuAi1Colors.planet : '#F5F5F0';
            ctx.strokeStyle = selected ? _menuAi1Colors.ships : '#D7CCC8';
            ctx.lineWidth = selected ? 2 : 1;
            this._roundRect(ctx, bx, aiY, btnW, btnH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = selected ? '#ffffff' : '#6D4C41';
            ctx.font = `${selected ? 'bold ' : ''}14px Arial, sans-serif`;
            ctx.fillText(aiLabels[i], bx + btnW / 2, aiY + btnH / 2);
        }

        // Start button
        const startW = 200, startH = 50;
        const startY = aiY + 80;
        const startX = cx - startW / 2;
        const pulse = 0.9 + 0.1 * Math.sin(time * 0.004);
        ctx.fillStyle = `rgba(79,195,247,${0.85 * pulse})`;
        ctx.strokeStyle = _menuPlayerColors.ships;
        ctx.lineWidth = 2;
        this._roundRect(ctx, startX, startY, startW, startH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", Arial, sans-serif';
        ctx.fillText('START GAME', cx, startY + startH / 2);

        // Controls help
        const helpY = startY + startH + 50;
        ctx.fillStyle = '#8D6E63';
        ctx.font = '13px Arial, sans-serif';
        const helpLines = [
            'Click your nest to select • Click target to send 50% bugs',
            'Shift+Click: send 75% • Ctrl+Click: multi-select • Right-click: deselect',
            'ESC: pause'
        ];
        for (let i = 0; i < helpLines.length; i++) {
            ctx.fillText(helpLines[i], cx, helpY + i * 20);
        }
    }

    _drawHUD(ctx, w, h) {
        // Gather stats per owner
        const stats = {};
        for (const p of this.planets) {
            if (!stats[p.owner]) stats[p.owner] = { planets: 0, ships: 0 };
            stats[p.owner].planets++;
            stats[p.owner].ships += Math.floor(p.shipCount);
        }
        for (const f of this.fleets) {
            if (!stats[f.owner]) stats[f.owner] = { planets: 0, ships: 0 };
            stats[f.owner].ships += f.shipCount;
        }

        ctx.font = '13px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        let hudX = 12;
        const hudY = 10;

        const ownerOrder = ['player', 'ai1', 'ai2', 'ai3'];
        for (const own of ownerOrder) {
            if (!stats[own]) continue;
            const c = getOwnerColor(own);
            ctx.fillStyle = c.planet;
            ctx.beginPath();
            ctx.arc(hudX + 6, hudY + 7, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5D4037';
            const label = OWNER_LABELS[own] || own;
            ctx.fillText(`${label}: ${stats[own].planets}★ ${stats[own].ships}✦`, hudX + 16, hudY);
            hudX += ctx.measureText(`${label}: ${stats[own].planets}★ ${stats[own].ships}✦`).width + 36;
        }
    }

    _drawEndScreen(ctx, w, h) {
        ctx.fillStyle = (this.theme && this.theme.pauseOverlay) || 'rgba(250,250,245,0.75)';
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const _endPlayerColors = getOwnerColor('player');
        const _endAi1Colors = getOwnerColor('ai1');
        if (this.state === 'won') {
            ctx.fillStyle = _endPlayerColors.planet;
            ctx.font = 'bold 52px "Comic Sans MS", "Segoe UI", Arial, sans-serif';
            ctx.shadowColor = _endPlayerColors.glow;
            ctx.shadowBlur = 20;
            ctx.fillText('VICTORY!', w / 2, h / 2 - 30);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = _endAi1Colors.planet;
            ctx.font = 'bold 52px "Comic Sans MS", "Segoe UI", Arial, sans-serif';
            ctx.shadowColor = _endAi1Colors.glow;
            ctx.shadowBlur = 20;
            ctx.fillText('DEFEAT', w / 2, h / 2 - 30);
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#8D6E63';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('Click anywhere or press R to return to menu', w / 2, h / 2 + 25);
    }

    _roundRect(ctx, x, y, w, h, r) {
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

    // --- External API (used by main.js) ---
    start() {
        this.state = 'playing';
    }

    stop() {
        this.state = 'menu';
        this.planets = [];
        this.fleets = [];
        this.particlePool.clear();
        this.ais = [];
        this.selectedPlanets = [];
        this.selectedFleets = [];
        this.stats = { planetsCaptured: 0, fleetsSent: 0, shipsSent: 0 };
        this.winCondition = 'capture-all';
        this.campaignTimeLimit = null;
        this.targetPlanetIndex = null;
        this.campaignTimer = 0;
    }

    pause() {
        if (this.state === 'playing') this.state = 'paused';
    }

    resume() {
        if (this.state === 'paused') this.state = 'playing';
    }

    resize(w, h) {
        const oldW = this.width;
        const oldH = this.height;
        this.width = this.canvas.width = w;
        this.height = this.canvas.height = h;
        this.starfield.resize(w, h);

        // Rescale planet positions proportionally
        if (oldW > 0 && oldH > 0 && this.planets.length > 0) {
            const scaleX = w / oldW;
            const scaleY = h / oldH;
            for (const p of this.planets) {
                p.x = Math.max(p.radius + 5, Math.min(w - p.radius - 5, p.x * scaleX));
                p.y = Math.max(p.radius + 5, Math.min(h - p.radius - 5, p.y * scaleY));
            }
            // Rescale fleet positions and targets
            for (const f of this.fleets) {
                f.x *= scaleX;
                f.y *= scaleY;
                f.tx = f.targetPlanet.x;
                f.ty = f.targetPlanet.y;
                // Recalculate velocity direction
                const dx = f.tx - f.x;
                const dy = f.ty - f.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 1) {
                    f.angle = Math.atan2(dy, dx);
                    f.vx = (dx / d) * FLEET_SPEED;
                    f.vy = (dy / d) * FLEET_SPEED;
                    f.totalDist = d;
                    f.traveled = 0;
                }
            }
        }
        this.buildSpatialGrid();
    }

    handleRightClick() {
        if (this.state === 'playing') {
            this.deselectAll();
            this.deselectAllFleets();
        }
    }

    handleMouseMove(x, y) {
        this.mouseX = x;
        this.mouseY = y;
        this.hoveredPlanet = this._findPlanetAt(x, y);
    }

    getPlayerInfo() {
        const planets = this.planets.filter(p => p.owner === 'player').length;
        const ships = this.planets.filter(p => p.owner === 'player').reduce((s, p) => s + Math.floor(p.shipCount), 0)
            + this.fleets.filter(f => f.owner === 'player').reduce((s, f) => s + f.shipCount, 0);
        const fleets = this.fleets.filter(f => f.owner === 'player').length;
        return { planets, ships, fleets };
    }

    getAIInfo() {
        const aiIds = ['ai1', 'ai2', 'ai3'];
        const count = this.spectatorMode ? Math.max(this.numAIs, 2) : this.numAIs;
        return aiIds.slice(0, count).map(id => ({
            id,
            color: getOwnerColor(id).planet,
            planets: this.planets.filter(p => p.owner === id).length,
            ships: this.planets.filter(p => p.owner === id).reduce((s, p) => s + Math.floor(p.shipCount), 0)
                + this.fleets.filter(f => f.owner === id).reduce((s, f) => s + f.shipCount, 0)
        }));
    }

    getWinner() {
        const owners = new Set();
        for (const p of this.planets) {
            if (p.owner !== 'neutral') owners.add(p.owner);
        }
        if (owners.size === 1) return [...owners][0];
        return null;
    }

    // --- Main loop ---
    _startLoop() {
        const loop = (timestamp) => {
            try {
                this.dt = timestamp - this.lastTime;
                this.lastTime = timestamp;
                this.frameCount++;

                // Cap dt to avoid spiral-of-death after tab switch
                if (this.dt > 100) this.dt = 16;

                // Run update multiple times for speed multiplier
                const steps = Math.max(1, Math.round(this.speed));
                for (let i = 0; i < steps; i++) {
                    this.update(this.dt);
                }
                this.draw(timestamp);
            } catch (err) {
                console.error('Game loop error:', err);
                // If in playing state and error occurs, try to detect win/lose
                if (this.state === 'playing') {
                    try { this.checkWinLose(); } catch(e) { /* ignore */ }
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// ---------------------------------------------------------------------------
// Export / global exposure
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, Planet, Fleet, Particle, AI };
} else {
    window.Game = Game;
}
