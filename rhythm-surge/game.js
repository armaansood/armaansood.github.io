// ============================================================
// Rhythm Game Engine — Complete Core
// A 4-lane Guitar Hero-style rhythm game
// ============================================================

(function () {
    "use strict";

    // === CONSTANTS ===
    const LANE_COLORS = ['#ff3366', '#33ccff', '#66ff33', '#ffcc00'];
    const LANE_KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
    const LANE_LABELS = ['D', 'F', 'J', 'K'];
    const HIT_ZONE_Y_PERCENT = 0.85;
    const NOTE_SPEED_BASE = 4;
    const PERFECT_WINDOW = 30;
    const GREAT_WINDOW = 55;
    const GOOD_WINDOW = 85;
    const MISS_WINDOW = 110;
    const MOBILE_EXTRA = 15;

    const SCORE_PERFECT = 300;
    const SCORE_GREAT = 200;
    const SCORE_GOOD = 100;

    // Detect mobile
    function isMobile() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    // === Particle class (background / hit effects) ===
    class Particle {
        constructor(x, y, color, vx, vy, life, size) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.vx = vx;
            this.vy = vy;
            this.life = life;
            this.maxLife = life;
            this.size = size || 3;
            this.active = true;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.05;
            this.life--;
            if (this.life <= 0) this.active = false;
        }
        draw(ctx) {
            if (!this.active) return;
            var alpha = Math.max(0, this.life / this.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // === Note class ===
    class Note {
        constructor(lane, time, type, holdDuration) {
            this.lane = lane;
            this.targetTime = time;
            this.type = type || 'tap';
            this.holdDuration = holdDuration || 0;
            this.y = -50;
            this.holdEndY = -50;
            this.active = true;
            this.hit = false;
            this.held = false;
            this.holdComplete = false;
            this.missed = false;
        }
        update(songTime, speed, hitZoneY, canvasHeight) {
            if (!this.active) return;
            var timeDiff = this.targetTime - songTime;
            var pixelsPerMs = speed / 16.667;
            this.y = hitZoneY - (timeDiff * pixelsPerMs);
            if (this.type === 'hold') {
                var holdEndTime = this.targetTime + this.holdDuration;
                var holdTimeDiff = holdEndTime - songTime;
                this.holdEndY = hitZoneY - (holdTimeDiff * pixelsPerMs);
            }
            if (this.y > canvasHeight + MISS_WINDOW + 50 && !this.hit) {
                this.active = false;
                this.missed = true;
            }
        }
        draw(ctx, laneX, laneWidth, hitZoneY) {
            if (!this.active && !this.hit) return;
            if (this.hit && this.type !== 'hold') return;
            if (this.hit && this.type === 'hold' && this.holdComplete) return;
            var color = LANE_COLORS[this.lane];
            var noteW = laneWidth * 0.75;
            var noteH = 18;
            var nx = laneX + (laneWidth - noteW) / 2;

            if (this.type === 'hold') {
                var topY = Math.min(this.y, this.holdEndY);
                var botY = Math.max(this.y, this.holdEndY);
                var barW = noteW * 0.5;
                var barX = laneX + (laneWidth - barW) / 2;
                ctx.fillStyle = color;
                ctx.globalAlpha = this.held ? 0.7 : 0.35;
                roundRect(ctx, barX, topY, barW, botY - topY, 6);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            if (!this.hit || (this.type === 'hold' && !this.holdComplete)) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 14;
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.9;
                roundRect(ctx, nx, this.y - noteH / 2, noteW, noteH, 7);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        }
    }

    // === Song class ===
    class Song {
        constructor(name, bpm, difficulty, generateNotes, musicConfig) {
            this.name = name;
            this.bpm = bpm;
            this.difficulty = difficulty;
            this.generateNotes = generateNotes;
            this.musicConfig = musicConfig || {};
            this.notePattern = [];
            this.bestScore = 0;
            this.duration = 0; // seconds, computed after buildNotes
        }
        buildNotes() {
            this.notePattern = this.generateNotes(this.bpm);
            // Compute duration from last note
            var maxTime = 0;
            for (var i = 0; i < this.notePattern.length; i++) {
                var t = this.notePattern[i].time + (this.notePattern[i].holdDuration || 0);
                if (t > maxTime) maxTime = t;
            }
            this.duration = Math.ceil((maxTime + 2000) / 1000); // seconds
            return this.notePattern;
        }
    }

    // === HitEffect class ===
    class HitEffect {
        constructor(x, y, rating, color) {
            this.x = x;
            this.y = y;
            this.rating = rating;
            this.color = color;
            this.life = 60;
            this.maxLife = 60;
            this.active = true;
            this.scale = 1.5;
            this.particles = [];
            for (var i = 0; i < 8; i++) {
                var angle = (Math.PI * 2 * i) / 8;
                var speed = 2 + Math.random() * 3;
                this.particles.push(new Particle(
                    x, y, color,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed - 2,
                    30 + Math.random() * 20,
                    2 + Math.random() * 2
                ));
            }
        }
        update() {
            this.life--;
            this.y -= 1.2;
            this.scale = 1 + (this.life / this.maxLife) * 0.5;
            if (this.life <= 0) this.active = false;
            for (var i = 0; i < this.particles.length; i++) {
                this.particles[i].update();
            }
        }
        draw(ctx) {
            if (!this.active) return;
            var alpha = Math.max(0, this.life / this.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.font = 'bold ' + Math.floor(22 * this.scale) + 'px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillText(this.rating.toUpperCase(), this.x, this.y);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            for (var i = 0; i < this.particles.length; i++) {
                this.particles[i].draw(ctx);
            }
        }
    }

    // Utility: rounded rect path
    function roundRect(ctx, x, y, w, h, r) {
        if (w < 0) return;
        if (h < 0) { y += h; h = -h; }
        r = Math.min(r, w / 2, h / 2);
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

    // === SONG GENERATORS ===
    function generateNeonPulse(bpm) {
        var beatMs = 60000 / bpm;
        var notes = [];
        var t = 2000;
        var duration = 70000;
        var patterns = [
            [0], [1], [2], [3],
            [0], [1], [2], [3],
            [1], [2], [0], [3],
            [3], [2], [1], [0],
            [0], [2], [1], [3]
        ];
        var pi = 0;
        while (t < duration) {
            var pat = patterns[pi % patterns.length];
            for (var j = 0; j < pat.length; j++) {
                notes.push({ time: t, lane: pat[j], type: 'tap' });
            }
            t += beatMs;
            pi++;
            // Occasional half-beat
            if (pi % 8 === 0 && t < duration) {
                notes.push({ time: t - beatMs / 2, lane: (pi + 1) % 4, type: 'tap' });
            }
        }
        return notes;
    }

    function generateElectricDreams(bpm) {
        var beatMs = 60000 / bpm;
        var halfBeat = beatMs / 2;
        var notes = [];
        var t = 1500;
        var duration = 75000;
        var section = 0;
        while (t < duration) {
            section = Math.floor((t - 1500) / (beatMs * 8));
            var phase = section % 4;
            if (phase === 0) {
                // Single eighth notes ascending
                for (var i = 0; i < 8 && t < duration; i++) {
                    notes.push({ time: t, lane: i % 4, type: 'tap' });
                    t += halfBeat;
                }
            } else if (phase === 1) {
                // Two-lane chords on beats
                for (var i = 0; i < 4 && t < duration; i++) {
                    notes.push({ time: t, lane: 0, type: 'tap' });
                    notes.push({ time: t, lane: 3, type: 'tap' });
                    t += beatMs;
                }
            } else if (phase === 2) {
                // Eighth note runs descending
                for (var i = 0; i < 8 && t < duration; i++) {
                    notes.push({ time: t, lane: 3 - (i % 4), type: 'tap' });
                    t += halfBeat;
                }
            } else {
                // Mixed chords and singles
                for (var i = 0; i < 4 && t < duration; i++) {
                    if (i % 2 === 0) {
                        notes.push({ time: t, lane: 1, type: 'tap' });
                        notes.push({ time: t, lane: 2, type: 'tap' });
                    } else {
                        notes.push({ time: t, lane: i % 4, type: 'tap' });
                    }
                    t += beatMs;
                }
            }
        }
        return notes;
    }

    function generateCyberRush(bpm) {
        var beatMs = 60000 / bpm;
        var sixteenth = beatMs / 4;
        var eighth = beatMs / 2;
        var notes = [];
        var t = 1200;
        var duration = 80000;
        var section = 0;
        while (t < duration) {
            section = Math.floor((t - 1200) / (beatMs * 4));
            var phase = section % 5;
            if (phase === 0) {
                // Sixteenth note stream
                for (var i = 0; i < 16 && t < duration; i++) {
                    notes.push({ time: t, lane: i % 4, type: 'tap' });
                    t += sixteenth;
                }
            } else if (phase === 1) {
                // Hold notes
                for (var i = 0; i < 2 && t < duration; i++) {
                    var lane = i * 2 + 1;
                    notes.push({ time: t, lane: lane, type: 'hold', holdDuration: beatMs * 2 });
                    t += beatMs * 2;
                }
            } else if (phase === 2) {
                // Gallop pattern
                for (var i = 0; i < 4 && t < duration; i++) {
                    notes.push({ time: t, lane: i % 4, type: 'tap' });
                    notes.push({ time: t + sixteenth, lane: (i + 1) % 4, type: 'tap' });
                    t += beatMs;
                }
            } else if (phase === 3) {
                // Chords with eighth notes between
                for (var i = 0; i < 4 && t < duration; i++) {
                    notes.push({ time: t, lane: 0, type: 'tap' });
                    notes.push({ time: t, lane: 3, type: 'tap' });
                    notes.push({ time: t + eighth, lane: 1 + (i % 2), type: 'tap' });
                    t += beatMs;
                }
            } else {
                // Hold + taps
                notes.push({ time: t, lane: 0, type: 'hold', holdDuration: beatMs * 3 });
                for (var i = 0; i < 6 && t < duration; i++) {
                    notes.push({ time: t + eighth * i, lane: 2 + (i % 2), type: 'tap' });
                }
                t += beatMs * 4;
            }
        }
        return notes;
    }

    function generateDigitalStorm(bpm) {
        var beatMs = 60000 / bpm;
        var sixteenth = beatMs / 4;
        var eighth = beatMs / 2;
        var notes = [];
        var t = 1000;
        var duration = 80000;
        var section = 0;
        while (t < duration) {
            section = Math.floor((t - 1000) / (beatMs * 4));
            var phase = section % 6;
            if (phase === 0) {
                // Fast stream alternating
                for (var i = 0; i < 16 && t < duration; i++) {
                    notes.push({ time: t, lane: (i % 2 === 0) ? 0 : 3, type: 'tap' });
                    t += sixteenth;
                }
            } else if (phase === 1) {
                // Chord switches
                for (var i = 0; i < 8 && t < duration; i++) {
                    if (i % 2 === 0) {
                        notes.push({ time: t, lane: 0, type: 'tap' });
                        notes.push({ time: t, lane: 1, type: 'tap' });
                    } else {
                        notes.push({ time: t, lane: 2, type: 'tap' });
                        notes.push({ time: t, lane: 3, type: 'tap' });
                    }
                    t += eighth;
                }
            } else if (phase === 2) {
                // Syncopated hits
                for (var i = 0; i < 4 && t < duration; i++) {
                    notes.push({ time: t, lane: i, type: 'tap' });
                    notes.push({ time: t + sixteenth * 3, lane: 3 - i, type: 'tap' });
                    t += beatMs;
                }
            } else if (phase === 3) {
                // Triple chords
                for (var i = 0; i < 4 && t < duration; i++) {
                    var skip = i % 4;
                    for (var l = 0; l < 4; l++) {
                        if (l !== skip) notes.push({ time: t, lane: l, type: 'tap' });
                    }
                    t += beatMs;
                }
            } else if (phase === 4) {
                // Runs with holds
                notes.push({ time: t, lane: 0, type: 'hold', holdDuration: beatMs * 2 });
                for (var i = 0; i < 8 && t + eighth * i < duration; i++) {
                    notes.push({ time: t + eighth * i, lane: 1 + (i % 3), type: 'tap' });
                }
                t += beatMs * 4;
            } else {
                // Zigzag
                for (var i = 0; i < 16 && t < duration; i++) {
                    var lane = (i < 4) ? i : (i < 8) ? (7 - i) : (i < 12) ? (i - 8) : (15 - i);
                    notes.push({ time: t, lane: Math.abs(lane) % 4, type: 'tap' });
                    t += sixteenth;
                }
            }
        }
        return notes;
    }

    function generateInfinityBreak(bpm) {
        var beatMs = 60000 / bpm;
        var sixteenth = beatMs / 4;
        var eighth = beatMs / 2;
        var notes = [];
        var t = 800;
        var duration = 70000;
        var section = 0;
        while (t < duration) {
            section = Math.floor((t - 800) / (beatMs * 4));
            var phase = section % 7;
            if (phase === 0) {
                // Dense 16th stream across all lanes
                for (var i = 0; i < 16 && t < duration; i++) {
                    notes.push({ time: t, lane: i % 4, type: 'tap' });
                    if (i % 4 === 3) {
                        notes.push({ time: t, lane: 0, type: 'tap' });
                    }
                    t += sixteenth;
                }
            } else if (phase === 1) {
                // Rapid chord switches
                for (var i = 0; i < 8 && t < duration; i++) {
                    var c = i % 3;
                    if (c === 0) {
                        notes.push({ time: t, lane: 0, type: 'tap' });
                        notes.push({ time: t, lane: 1, type: 'tap' });
                    } else if (c === 1) {
                        notes.push({ time: t, lane: 2, type: 'tap' });
                        notes.push({ time: t, lane: 3, type: 'tap' });
                    } else {
                        notes.push({ time: t, lane: 1, type: 'tap' });
                        notes.push({ time: t, lane: 2, type: 'tap' });
                    }
                    t += sixteenth * 2;
                }
            } else if (phase === 2) {
                // Burst patterns
                for (var i = 0; i < 4 && t < duration; i++) {
                    for (var j = 0; j < 4; j++) {
                        notes.push({ time: t + sixteenth * j, lane: j, type: 'tap' });
                    }
                    t += beatMs;
                }
            } else if (phase === 3) {
                // Staircase double
                for (var i = 0; i < 12 && t < duration; i++) {
                    notes.push({ time: t, lane: i % 4, type: 'tap' });
                    notes.push({ time: t, lane: (i + 1) % 4, type: 'tap' });
                    t += sixteenth;
                }
                t += beatMs;
            } else if (phase === 4) {
                // Holds with dense taps
                notes.push({ time: t, lane: 3, type: 'hold', holdDuration: beatMs * 3 });
                for (var i = 0; i < 12 && t + sixteenth * i < duration; i++) {
                    notes.push({ time: t + sixteenth * i, lane: i % 3, type: 'tap' });
                }
                t += beatMs * 4;
            } else if (phase === 5) {
                // Jacks (same lane repeated fast)
                for (var i = 0; i < 4 && t < duration; i++) {
                    for (var j = 0; j < 4; j++) {
                        notes.push({ time: t, lane: i, type: 'tap' });
                        t += sixteenth;
                    }
                }
            } else {
                // Wall patterns
                for (var i = 0; i < 8 && t < duration; i++) {
                    for (var l = 0; l < 4; l++) {
                        if (!((i + l) % 3 === 0)) {
                            notes.push({ time: t, lane: l, type: 'tap' });
                        }
                    }
                    t += eighth;
                }
            }
        }
        return notes;
    }

    // === Built-in Songs ===
    function createBuiltInSongs() {
        return [
            new Song('Neon Pulse', 120, 'Easy', generateNeonPulse, { wave: 'sine', gain: 0.15 }),
            new Song('Electric Dreams', 135, 'Medium', generateElectricDreams, { wave: 'square', gain: 0.1 }),
            new Song('Cyber Rush', 150, 'Hard', generateCyberRush, { wave: 'sawtooth', gain: 0.08 }),
            new Song('Digital Storm', 160, 'Expert', generateDigitalStorm, { wave: 'triangle', gain: 0.12 }),
            new Song('Infinity Break', 180, 'Impossible', generateInfinityBreak, { wave: 'sawtooth', gain: 0.07 })
        ];
    }

    // === RhythmGame class ===
    class RhythmGame {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = canvas.width;
            this.height = canvas.height;

            // State
            this.state = 'menu';
            this.songs = createBuiltInSongs();
            this.currentSong = null;
            this.songIndex = -1;

            // Timing
            this.songTime = 0;
            this.startTime = 0;
            this.pauseTime = 0;
            this.lastFrameTime = 0;

            // Notes
            this.notes = [];
            this.noteSpeed = NOTE_SPEED_BASE;

            // Score
            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.perfects = 0;
            this.greats = 0;
            this.goods = 0;
            this.misses = 0;
            this.totalNotes = 0;

            // Lanes
            this.lanePressed = [false, false, false, false];
            this.laneFlash = [0, 0, 0, 0];

            // Effects
            this.hitEffects = [];
            this.bgParticles = [];
            this.backgroundPulse = 0;
            this.comboScale = 1;
            this.comboPop = 0;

            // Layout
            this.laneAreaX = 0;
            this.laneAreaW = 0;
            this.laneWidth = 0;
            this.hitZoneY = 0;

            // Mobile
            this.mobile = isMobile();
            this.activeTouches = {};

            // Callbacks
            this.onSongEnd = null;
            this.onHit = null;

            // External UI flag — when true, game.js won't run its own game loop
            this._hasExternalUI = false;

            // Animation frame id
            this._rafId = null;
            this._running = false;

            // Song end tracking
            this._songEndTime = 0;
            this._songEnded = false;

            this.recalcLayout();
            this._bindInput();
        }

        // === Layout ===
        recalcLayout() {
            var w = this.width;
            var h = this.height;
            var maxW = this.mobile ? w * 0.9 : Math.min(500, w * 0.65);
            this.laneAreaW = maxW;
            this.laneAreaX = (w - maxW) / 2;
            this.laneWidth = maxW / 4;
            this.hitZoneY = h * HIT_ZONE_Y_PERCENT;
        }

        resize(w, h) {
            this.width = w;
            this.height = h;
            this.canvas.width = w;
            this.canvas.height = h;
            this.recalcLayout();
        }

        // Render wrapper for external controllers
        render() {
            this.draw(this.ctx, performance.now());
        }

        // Accuracy getter
        get accuracy() {
            var total = this.perfects + this.greats + this.goods + this.misses;
            if (total === 0) return 100;
            var weighted = (this.perfects * 100 + this.greats * 75 + this.goods * 50) / total;
            return Math.round(weighted * 10) / 10;
        }

        // === Input Binding ===
        _bindInput() {
            // If external UI manages input, skip internal bindings
            if (this._hasExternalUI) return;
            var self = this;
            // Keyboard
            this._onKeyDown = function (e) {
                var idx = LANE_KEYS.indexOf(e.code);
                if (idx !== -1) {
                    e.preventDefault();
                    self.handleKeyDown(idx);
                }
                if (e.code === 'Escape') {
                    if (self.state === 'playing') self.pause();
                    else if (self.state === 'paused') self.resume();
                }
                if (e.code === 'Space' && self.state === 'paused') {
                    e.preventDefault();
                    self.resume();
                }
            };
            this._onKeyUp = function (e) {
                var idx = LANE_KEYS.indexOf(e.code);
                if (idx !== -1) {
                    e.preventDefault();
                    self.handleKeyUp(idx);
                }
            };
            document.addEventListener('keydown', this._onKeyDown);
            document.addEventListener('keyup', this._onKeyUp);

            // Touch
            this._onTouchStart = function (e) {
                e.preventDefault();
                for (var i = 0; i < e.changedTouches.length; i++) {
                    var touch = e.changedTouches[i];
                    var lane = self._touchToLane(touch);
                    if (lane !== -1) {
                        self.activeTouches[touch.identifier] = lane;
                        self.handleKeyDown(lane);
                    }
                }
            };
            this._onTouchEnd = function (e) {
                e.preventDefault();
                for (var i = 0; i < e.changedTouches.length; i++) {
                    var touch = e.changedTouches[i];
                    var lane = self.activeTouches[touch.identifier];
                    if (lane !== undefined) {
                        self.handleKeyUp(lane);
                        delete self.activeTouches[touch.identifier];
                    }
                }
            };
            this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
            this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
            this.canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
        }

        _touchToLane(touch) {
            var rect = this.canvas.getBoundingClientRect();
            var x = (touch.clientX - rect.left) * (this.width / rect.width);
            var y = (touch.clientY - rect.top) * (this.height / rect.height);
            // Only count touches in lower 40% of screen
            if (y < this.height * 0.6) return -1;
            for (var i = 0; i < 4; i++) {
                var lx = this.laneAreaX + i * this.laneWidth;
                if (x >= lx && x < lx + this.laneWidth) return i;
            }
            return -1;
        }

        // === Start Song ===
        startSong(songIndex) {
            this.songIndex = songIndex;
            this.currentSong = this.songs[songIndex];
            this.currentSong.buildNotes();

            this.notes = [];
            for (var i = 0; i < this.currentSong.notePattern.length; i++) {
                var np = this.currentSong.notePattern[i];
                this.notes.push(new Note(np.lane, np.time, np.type, np.holdDuration || 0));
            }
            this.notes.sort(function (a, b) { return a.targetTime - b.targetTime; });
            this.totalNotes = this.notes.length;

            // Compute song end time
            var lastTime = 0;
            for (var i = 0; i < this.notes.length; i++) {
                var endT = this.notes[i].targetTime + (this.notes[i].holdDuration || 0);
                if (endT > lastTime) lastTime = endT;
            }
            this._songEndTime = lastTime + 2000;
            this._songEnded = false;

            // Reset score
            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.perfects = 0;
            this.greats = 0;
            this.goods = 0;
            this.misses = 0;

            this.hitEffects = [];
            this.bgParticles = [];
            this.lanePressed = [false, false, false, false];
            this.laneFlash = [0, 0, 0, 0];
            this.comboScale = 1;
            this.comboPop = 0;
            this.backgroundPulse = 0;

            this.noteSpeed = NOTE_SPEED_BASE * (0.8 + this.currentSong.bpm / 400);

            this.state = 'playing';
            this.startTime = performance.now();
            this.songTime = -1500; // 1.5 sec lead-in
            this.lastFrameTime = this.startTime;

            if (!this._hasExternalUI && !this._running) {
                this._running = true;
                this._gameLoop();
            }
        }

        start(song) {
            var idx = this.songs.indexOf(song);
            if (idx === -1) {
                this.songs.push(song);
                idx = this.songs.length - 1;
            }
            this.startSong(idx);
        }

        pause() {
            if (this.state !== 'playing') return;
            this.state = 'paused';
            this.pauseTime = performance.now();
        }

        resume() {
            if (this.state !== 'paused') return;
            var elapsed = performance.now() - this.pauseTime;
            this.startTime += elapsed;
            this.lastFrameTime = performance.now();
            this.state = 'playing';
        }

        // === Key Handlers ===
        handleKeyDown(lane) {
            if (lane < 0 || lane > 3) return;
            if (this.lanePressed[lane]) return;
            this.lanePressed[lane] = true;
            this.laneFlash[lane] = 1;
            if (this.state === 'playing') {
                this.checkHit(lane);
            }
        }

        handleKeyUp(lane) {
            if (lane < 0 || lane > 3) return;
            this.lanePressed[lane] = false;
            // Check hold note release
            for (var i = 0; i < this.notes.length; i++) {
                var note = this.notes[i];
                if (note.lane === lane && note.type === 'hold' && note.held && !note.holdComplete) {
                    var holdEndTime = note.targetTime + note.holdDuration;
                    var diff = Math.abs(this.songTime - holdEndTime);
                    var win = this.mobile ? GOOD_WINDOW + MOBILE_EXTRA : GOOD_WINDOW;
                    var pixelsPerMs = this.noteSpeed / 16.667;
                    var dist = diff * pixelsPerMs;
                    if (dist < win * 1.5) {
                        note.holdComplete = true;
                        note.active = false;
                        this._registerHit('perfect', lane);
                    } else {
                        note.holdComplete = true;
                        note.held = false;
                        note.active = false;
                        this._registerMiss(lane);
                    }
                }
            }
        }

        // === Hit Detection ===
        checkHit(lane) {
            var closest = null;
            var closestDist = Infinity;

            for (var i = 0; i < this.notes.length; i++) {
                var note = this.notes[i];
                if (!note.active || note.hit || note.lane !== lane) continue;
                var dist = Math.abs(note.y - this.hitZoneY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = note;
                }
            }

            var extraWindow = this.mobile ? MOBILE_EXTRA : 0;
            if (closest && closestDist < MISS_WINDOW + extraWindow) {
                var rating = this.rateHit(closestDist, extraWindow);
                if (rating === 'miss') {
                    return;
                }
                closest.hit = true;
                if (closest.type === 'hold') {
                    closest.held = true;
                } else {
                    closest.active = false;
                }
                this._registerHit(rating, lane);
            }
        }

        rateHit(distance, extra) {
            extra = extra || 0;
            if (distance <= PERFECT_WINDOW + extra) return 'perfect';
            if (distance <= GREAT_WINDOW + extra) return 'great';
            if (distance <= GOOD_WINDOW + extra) return 'good';
            return 'miss';
        }

        _registerHit(rating, lane) {
            this.addScore(rating);
            var lx = this.laneAreaX + lane * this.laneWidth + this.laneWidth / 2;
            this.hitEffects.push(new HitEffect(lx, this.hitZoneY - 30, rating, LANE_COLORS[lane]));
            if (this.onHit) {
                this.onHit(rating, this.combo);
            }
        }

        _registerMiss(lane) {
            this.misses++;
            this.combo = 0;
            var lx = this.laneAreaX + lane * this.laneWidth + this.laneWidth / 2;
            this.hitEffects.push(new HitEffect(lx, this.hitZoneY - 30, 'miss', '#ff0000'));
            if (this.onHit) this.onHit('miss', 0);
        }

        addScore(rating) {
            var mult = this._getMultiplier();
            if (rating === 'perfect') {
                this.score += SCORE_PERFECT * mult;
                this.combo++;
                this.perfects++;
                this.comboPop = 1;
            } else if (rating === 'great') {
                this.score += SCORE_GREAT * mult;
                this.combo++;
                this.greats++;
                this.comboPop = 0.7;
            } else if (rating === 'good') {
                this.score += SCORE_GOOD * mult;
                this.combo++;
                this.goods++;
                this.comboPop = 0.4;
            } else {
                this.combo = 0;
                this.misses++;
            }
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        }

        _getMultiplier() {
            if (this.combo >= 50) return 4;
            if (this.combo >= 30) return 3;
            if (this.combo >= 10) return 2;
            return 1;
        }

        getResults() {
            var hit = this.perfects + this.greats + this.goods;
            var total = hit + this.misses;
            var percent = total > 0 ? (hit / total) * 100 : 0;
            var grade = 'D';
            if (percent >= 95) grade = 'S';
            else if (percent >= 90) grade = 'A';
            else if (percent >= 80) grade = 'B';
            else if (percent >= 70) grade = 'C';
            return {
                score: this.score,
                maxCombo: this.maxCombo,
                perfects: this.perfects,
                greats: this.greats,
                goods: this.goods,
                misses: this.misses,
                grade: grade,
                percent: Math.round(percent * 100) / 100
            };
        }

        // === Game Loop ===
        _gameLoop() {
            var self = this;
            function frame(timestamp) {
                if (!self._running) return;
                var dt = timestamp - self.lastFrameTime;
                self.lastFrameTime = timestamp;
                if (dt > 100) dt = 16.667;

                if (self.state === 'playing') {
                    self.update(dt);
                }
                self.draw(self.ctx, timestamp);
                self._rafId = requestAnimationFrame(frame);
            }
            this._rafId = requestAnimationFrame(frame);
        }

        stop() {
            this._running = false;
            if (this._rafId) cancelAnimationFrame(this._rafId);
        }

        // === Update ===
        update(dt) {
            this.songTime = performance.now() - this.startTime - 1500;

            // Beat pulse
            if (this.currentSong) {
                var beatMs = 60000 / this.currentSong.bpm;
                var beatPhase = (this.songTime % beatMs) / beatMs;
                this.backgroundPulse = Math.max(0, 1 - beatPhase * 3);
            }

            // Update notes
            for (var i = 0; i < this.notes.length; i++) {
                var note = this.notes[i];
                note.update(this.songTime, this.noteSpeed, this.hitZoneY, this.height);

                // Auto-miss notes that pass without being hit
                if (!note.hit && note.active) {
                    var dist = note.y - this.hitZoneY;
                    var extraWindow = this.mobile ? MOBILE_EXTRA : 0;
                    if (dist > MISS_WINDOW + extraWindow) {
                        note.active = false;
                        note.missed = true;
                        this._registerMiss(note.lane);
                    }
                }

                // Check hold notes that are being held
                if (note.type === 'hold' && note.held && !note.holdComplete) {
                    if (!this.lanePressed[note.lane]) {
                        // Released too early
                        note.holdComplete = true;
                        note.held = false;
                        note.active = false;
                        this._registerMiss(note.lane);
                    }
                    // Auto-complete if hold time has passed and still holding
                    var holdEndTime = note.targetTime + note.holdDuration;
                    if (this.songTime >= holdEndTime) {
                        note.holdComplete = true;
                        note.active = false;
                        this._registerHit('perfect', note.lane);
                    }
                }
            }

            // Update hit effects
            for (var i = this.hitEffects.length - 1; i >= 0; i--) {
                this.hitEffects[i].update();
                if (!this.hitEffects[i].active) {
                    this.hitEffects.splice(i, 1);
                }
            }

            // Lane flash decay
            for (var i = 0; i < 4; i++) {
                if (this.laneFlash[i] > 0) this.laneFlash[i] -= 0.06;
                if (this.laneFlash[i] < 0) this.laneFlash[i] = 0;
            }

            // Combo scale
            if (this.comboPop > 0) {
                this.comboScale = 1 + this.comboPop * 0.4;
                this.comboPop -= 0.04;
                if (this.comboPop < 0) this.comboPop = 0;
            } else {
                this.comboScale += (1 - this.comboScale) * 0.1;
            }

            // Background particles
            if (Math.random() < 0.15 + this.backgroundPulse * 0.3) {
                var px = this.laneAreaX + Math.random() * this.laneAreaW;
                var py = this.height;
                var color = LANE_COLORS[Math.floor(Math.random() * 4)];
                this.bgParticles.push(new Particle(
                    px, py, color,
                    (Math.random() - 0.5) * 1.5,
                    -(1 + Math.random() * 2 + this.backgroundPulse * 2),
                    80 + Math.random() * 60,
                    1 + Math.random() * 2
                ));
            }
            for (var i = this.bgParticles.length - 1; i >= 0; i--) {
                this.bgParticles[i].vy -= 0.03;
                this.bgParticles[i].update();
                if (!this.bgParticles[i].active) {
                    this.bgParticles.splice(i, 1);
                }
            }
            if (this.bgParticles.length > 200) {
                this.bgParticles.splice(0, this.bgParticles.length - 200);
            }

            // Song end check
            if (!this._songEnded && this.songTime > this._songEndTime) {
                this._songEnded = true;
                this.state = 'results';
                if (this.onSongEnd) this.onSongEnd(this.getResults());
            }
        }

        // === Draw ===
        draw(ctx, time) {
            ctx.clearRect(0, 0, this.width, this.height);
            this.drawBackground(ctx, time);

            if (this.state === 'playing' || this.state === 'paused') {
                this.drawLanes(ctx);
                this.drawNotes(ctx);
                this.drawHitZone(ctx);
                this.drawHUD(ctx);
                this.drawCombo(ctx);
                // Hit effects
                for (var i = 0; i < this.hitEffects.length; i++) {
                    this.hitEffects[i].draw(ctx);
                }
                // Touch indicators on mobile
                if (this.mobile) {
                    this._drawTouchZones(ctx);
                }
                if (this.state === 'paused') {
                    this._drawPauseOverlay(ctx);
                }
            } else if (this.state === 'menu') {
                this._drawMenu(ctx, time);
            } else if (this.state === 'songSelect') {
                this._drawSongSelect(ctx, time);
            } else if (this.state === 'results') {
                this._drawResults(ctx, time);
            }
        }

        drawBackground(ctx, time) {
            // Dark gradient bg
            var grad = ctx.createLinearGradient(0, 0, 0, this.height);
            var pulse = this.backgroundPulse * 0.15;
            grad.addColorStop(0, 'rgb(' + Math.floor(10 + pulse * 40) + ',' + Math.floor(10 + pulse * 10) + ',' + Math.floor(26 + pulse * 60) + ')');
            grad.addColorStop(1, '#0a0a1a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, this.width, this.height);

            // Background particles
            for (var i = 0; i < this.bgParticles.length; i++) {
                this.bgParticles[i].draw(ctx);
            }
        }

        drawLanes(ctx) {
            for (var i = 0; i < 4; i++) {
                var lx = this.laneAreaX + i * this.laneWidth;
                var color = LANE_COLORS[i];

                // Lane track
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                ctx.fillRect(lx, 0, this.laneWidth, this.height);

                // Lane press glow
                if (this.lanePressed[i] || this.laneFlash[i] > 0) {
                    var intensity = this.lanePressed[i] ? 0.15 : this.laneFlash[i] * 0.12;
                    ctx.fillStyle = color;
                    ctx.globalAlpha = intensity;
                    ctx.fillRect(lx, 0, this.laneWidth, this.height);
                    ctx.globalAlpha = 1;
                }

                // Lane separator
                if (i > 0) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(lx, 0);
                    ctx.lineTo(lx, this.height);
                    ctx.stroke();
                }

                // Lane label at bottom
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.font = '14px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(LANE_LABELS[i], lx + this.laneWidth / 2, this.hitZoneY + 40);
            }

            // Outer borders
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.laneAreaX, 0);
            ctx.lineTo(this.laneAreaX, this.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.laneAreaX + this.laneAreaW, 0);
            ctx.lineTo(this.laneAreaX + this.laneAreaW, this.height);
            ctx.stroke();
        }

        drawHitZone(ctx) {
            var pulse = 0.6 + this.backgroundPulse * 0.4;
            // Main line
            ctx.strokeStyle = 'rgba(255,255,255,' + pulse + ')';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10 + this.backgroundPulse * 10;
            ctx.beginPath();
            ctx.moveTo(this.laneAreaX, this.hitZoneY);
            ctx.lineTo(this.laneAreaX + this.laneAreaW, this.hitZoneY);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Hit zone markers per lane
            for (var i = 0; i < 4; i++) {
                var lx = this.laneAreaX + i * this.laneWidth;
                var cx = lx + this.laneWidth / 2;
                var color = LANE_COLORS[i];
                var pressed = this.lanePressed[i];
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = pressed ? 1 : 0.4;
                ctx.beginPath();
                var r = this.laneWidth * 0.3;
                ctx.arc(cx, this.hitZoneY, r, 0, Math.PI * 2);
                ctx.stroke();
                if (pressed) {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.3;
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        }

        drawNotes(ctx) {
            for (var i = 0; i < this.notes.length; i++) {
                var note = this.notes[i];
                if (note.y < -100 || note.y > this.height + 100) {
                    if (note.type !== 'hold') continue;
                    if (note.holdEndY < -100 && note.y < -100) continue;
                }
                var lx = this.laneAreaX + note.lane * this.laneWidth;
                note.draw(ctx, lx, this.laneWidth, this.hitZoneY);
            }
        }

        drawHUD(ctx) {
            // Score
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(String(this.score), 15, 15);

            // Multiplier
            var mult = this._getMultiplier();
            if (mult > 1) {
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 18px Arial, sans-serif';
                ctx.fillText(mult + 'x', 15, 45);
            }

            // Accuracy
            var hit = this.perfects + this.greats + this.goods;
            var total = hit + this.misses;
            var pct = total > 0 ? ((hit / total) * 100).toFixed(1) : '100.0';
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '16px Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(pct + '%', this.width - 15, 15);

            // Song name
            if (this.currentSong) {
                ctx.fillStyle = '#888888';
                ctx.font = '14px Arial, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(this.currentSong.name + ' [' + this.currentSong.difficulty + ']', this.width - 15, 38);
            }
        }

        drawCombo(ctx) {
            if (this.combo < 2) return;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var cx = this.width / 2;
            var cy = this.hitZoneY - this.height * 0.25;

            var size = Math.floor(48 * this.comboScale);
            ctx.font = 'bold ' + size + 'px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.85;
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 15;
            ctx.fillText(this.combo + 'x', cx, cy);
            ctx.shadowBlur = 0;

            ctx.font = '16px Arial, sans-serif';
            ctx.fillStyle = '#aaaaaa';
            ctx.globalAlpha = 0.6;
            ctx.fillText('COMBO', cx, cy + 30);

            ctx.restore();
        }

        _drawTouchZones(ctx) {
            for (var i = 0; i < 4; i++) {
                var lx = this.laneAreaX + i * this.laneWidth;
                var y = this.height - 70;
                var color = LANE_COLORS[i];
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = this.lanePressed[i] ? 0.7 : 0.25;
                roundRect(ctx, lx + 8, y, this.laneWidth - 16, 55, 10);
                ctx.stroke();
                if (this.lanePressed[i]) {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.15;
                    roundRect(ctx, lx + 8, y, this.laneWidth - 16, 55, 10);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                ctx.fillStyle = color;
                ctx.globalAlpha = this.lanePressed[i] ? 0.9 : 0.35;
                ctx.font = 'bold 18px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(LANE_LABELS[i], lx + this.laneWidth / 2, y + 27);
                ctx.globalAlpha = 1;
            }
        }

        _drawPauseOverlay(ctx) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 42px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 20);
            ctx.font = '20px Arial, sans-serif';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('Press ESC or SPACE to resume', this.width / 2, this.height / 2 + 25);
        }

        _drawMenu(ctx, time) {
            var cx = this.width / 2;
            var cy = this.height / 2;
            // Title
            var glow = Math.sin(time / 400) * 0.3 + 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = glow;
            ctx.font = 'bold 52px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ff3366';
            ctx.shadowBlur = 20;
            ctx.fillText('RHYTHM', cx, cy - 60);
            ctx.shadowColor = '#33ccff';
            ctx.fillText('GAME', cx, cy - 5);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '20px Arial, sans-serif';
            ctx.fillText('Use keys D  F  J  K', cx, cy + 50);
            ctx.font = '18px Arial, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText('Call game.startSong(index) or set state to songSelect', cx, cy + 85);
        }

        _drawSongSelect(ctx, time) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('SELECT SONG', this.width / 2, 30);

            for (var i = 0; i < this.songs.length; i++) {
                var song = this.songs[i];
                var y = 100 + i * 70;
                var bx = this.width / 2 - 180;
                var bw = 360;
                var bh = 55;

                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                roundRect(ctx, bx, y, bw, bh, 10);
                ctx.fill();
                ctx.strokeStyle = LANE_COLORS[i % 4];
                ctx.lineWidth = 1.5;
                roundRect(ctx, bx, y, bw, bh, 10);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Arial, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(song.name, bx + 15, y + 20);

                ctx.fillStyle = '#888888';
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText(song.difficulty + ' | ' + song.bpm + ' BPM', bx + 15, y + 42);

                ctx.fillStyle = LANE_COLORS[i % 4];
                ctx.font = 'bold 14px Arial, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText((i + 1) + '', bx + bw - 15, y + bh / 2);
            }
        }

        _drawResults(ctx, time) {
            var res = this.getResults();
            var cx = this.width / 2;

            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, this.width, this.height);

            // Grade
            var gradeColors = { S: '#ffcc00', A: '#66ff33', B: '#33ccff', C: '#ff9933', D: '#ff3366' };
            ctx.fillStyle = gradeColors[res.grade] || '#ffffff';
            ctx.font = 'bold 80px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = gradeColors[res.grade];
            ctx.shadowBlur = 25;
            ctx.fillText(res.grade, cx, 90);
            ctx.shadowBlur = 0;

            // Score
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial, sans-serif';
            ctx.fillText(String(res.score), cx, 160);

            // Percent
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '22px Arial, sans-serif';
            ctx.fillText(res.percent + '%', cx, 195);

            // Breakdown
            var y = 240;
            var labels = ['PERFECT', 'GREAT', 'GOOD', 'MISS'];
            var values = [res.perfects, res.greats, res.goods, res.misses];
            var colors = ['#ffcc00', '#66ff33', '#33ccff', '#ff3366'];
            for (var i = 0; i < labels.length; i++) {
                ctx.fillStyle = colors[i];
                ctx.font = 'bold 18px Arial, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(labels[i], cx - 10, y + i * 32);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'left';
                ctx.fillText(String(values[i]), cx + 10, y + i * 32);
            }

            // Max combo
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('MAX COMBO: ' + res.maxCombo, cx, y + 150);

            // Song name
            if (this.currentSong) {
                ctx.fillStyle = '#666666';
                ctx.font = '16px Arial, sans-serif';
                ctx.fillText(this.currentSong.name, cx, y + 185);
            }
        }

        // === Cleanup ===
        destroy() {
            this.stop();
            document.removeEventListener('keydown', this._onKeyDown);
            document.removeEventListener('keyup', this._onKeyUp);
            this.canvas.removeEventListener('touchstart', this._onTouchStart);
            this.canvas.removeEventListener('touchend', this._onTouchEnd);
            this.canvas.removeEventListener('touchcancel', this._onTouchEnd);
        }
    }

    // Expose globally
    window.RhythmGame = RhythmGame;
    window.Song = Song;
    window.Note = Note;
})();