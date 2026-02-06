document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const menuScreen = document.getElementById('menu-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const resultsScreen = document.getElementById('results-screen');
    const hud = document.getElementById('hud');
    const touchZones = document.getElementById('touch-zones');
    const songListEl = document.getElementById('song-list');
    const scoreDisplay = document.getElementById('score-display');
    const accuracyDisplay = document.getElementById('accuracy-display');
    const songNameHud = document.getElementById('song-name');
    const gradeDisplay = document.getElementById('grade-display');
    const resultsSongName = document.getElementById('results-song-name');
    const resultsStats = document.getElementById('results-stats');

    let game = null;
    let music = null;
    let currentSongIndex = -1;
    let isMobile = 'ontouchstart' in window;
    let isPaused = false;
    let isPlaying = false;
    let animFrameId = null;
    let displayedScore = 0;
    let musicInitialized = false;

    const KEY_MAP = { 'd': 0, 'f': 1, 'j': 2, 'k': 3 };
    const DIFF_COLORS = {
        'Easy': '#66ff33',
        'Medium': '#33ccff',
        'Hard': '#ff3366',
        'Expert': '#ffcc00',
        'Impossible': '#ff2222'
    };

    // ==================== Initialize ====================
    function init() {
        if (typeof RhythmGame === 'function') {
            game = new RhythmGame(canvas);
        }
        if (typeof MusicEngine === 'function') {
            music = new MusicEngine();
        }

        if (game) {
            game._hasExternalUI = true;
            game.onHit = onNoteHit;
            game.onSongEnd = onSongEnd;
        }

        // Pre-build note patterns so duration is available for song list
        if (game) {
            game.songs.forEach(function(s) { s.buildNotes(); });
        }

        populateSongList();
        setupKeyboardInput();
        setupTouchInput();
        setupButtons();
        handleResize();
        window.addEventListener('resize', handleResize);
    }

    // ==================== Song List ====================
    function populateSongList() {
        songListEl.textContent = '';
        const songs = game ? game.songs : [];

        if (songs.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'No songs available.';
            empty.style.color = 'rgba(255,255,255,0.4)';
            empty.style.padding = '20px';
            songListEl.appendChild(empty);
            return;
        }

        songs.forEach((song, i) => {
            const card = document.createElement('div');
            card.className = 'song-card';
            card.dataset.index = String(i);
            card.dataset.diff = song.difficulty || 'Medium';
            card.style.animationDelay = (0.05 + i * 0.05) + 's';

            // Difficulty badge
            const diffBadge = document.createElement('div');
            diffBadge.className = 'song-difficulty';
            diffBadge.textContent = (song.difficulty || 'Medium').toUpperCase();
            diffBadge.style.background = DIFF_COLORS[song.difficulty] || DIFF_COLORS['Medium'];
            card.appendChild(diffBadge);

            // Song info
            const info = document.createElement('div');
            info.className = 'song-info';

            const title = document.createElement('div');
            title.className = 'song-title';
            title.textContent = song.name || 'Unknown Track';
            info.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'song-meta';
            const bpm = song.bpm || '?';
            const dur = song.duration ? formatTime(song.duration) : '?:??';
            meta.textContent = bpm + ' BPM \u00B7 ' + dur;
            info.appendChild(meta);

            card.appendChild(info);

            // Best score
            if (song.bestScore != null && song.bestScore > 0) {
                const best = document.createElement('div');
                best.className = 'song-best';
                best.textContent = 'Best: ' + song.bestScore.toLocaleString();
                card.appendChild(best);
            }

            card.addEventListener('click', () => startSong(i));
            songListEl.appendChild(card);
        });
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Map song names to SONG_CONFIGS keys in music.js
    const MUSIC_CONFIG_MAP = {
        'Neon Pulse': 'neonPulse',
        'Electric Dreams': 'electricDreams',
        'Cyber Rush': 'cyberRush',
        'Digital Storm': 'digitalStorm',
        'Infinity Break': 'infinityBreak'
    };

    // ==================== Start Song ====================
    function startSong(index) {
        currentSongIndex = index;
        const songs = game ? game.songs : [];
        if (!songs[index]) return;

        // Initialize music on first user gesture
        if (music && !musicInitialized) {
            music.init();
            musicInitialized = true;
        }

        // Switch screens
        menuScreen.classList.add('hidden');
        resultsScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        canvas.classList.remove('hidden');
        hud.classList.remove('hidden');
        if (isMobile) {
            touchZones.classList.remove('hidden');
        }

        // HUD
        songNameHud.textContent = songs[index].name || '';
        scoreDisplay.textContent = '0';
        accuracyDisplay.textContent = '100%';
        displayedScore = 0;

        isPaused = false;
        isPlaying = true;

        handleResize();

        // Start game and music
        if (game) game.startSong(index);

        // Resolve music config: use SONG_CONFIGS from music.js if available
        if (music) {
            var configKey = MUSIC_CONFIG_MAP[songs[index].name];
            var musicConfig = (typeof SONG_CONFIGS !== 'undefined' && configKey) ? SONG_CONFIGS[configKey] : null;
            if (musicConfig) {
                music.playSong(musicConfig);
            }
        }

        // Begin frame loop
        if (animFrameId) cancelAnimationFrame(animFrameId);
        gameLoop();
    }

    // ==================== Game Loop ====================
    function gameLoop() {
        if (!isPlaying) return;

        if (!isPaused && game) {
            game.update(16.667); // game manages its own timing internally
            game.render();
            updateHUD();
        }

        animFrameId = requestAnimationFrame(gameLoop);
    }

    // ==================== HUD Updates ====================
    function updateHUD() {
        if (!game) return;
        const targetScore = game.score || 0;

        // Smooth score counting
        if (displayedScore < targetScore) {
            const diff = targetScore - displayedScore;
            const step = Math.max(1, Math.ceil(diff * 0.15));
            displayedScore = Math.min(displayedScore + step, targetScore);
        }
        scoreDisplay.textContent = displayedScore.toLocaleString();

        // Accuracy
        const acc = game.accuracy != null ? game.accuracy : 100;
        accuracyDisplay.textContent = acc.toFixed(1) + '%';

        // Accuracy color
        if (acc >= 95) {
            accuracyDisplay.style.color = '#66ff33';
        } else if (acc >= 80) {
            accuracyDisplay.style.color = '#33ccff';
        } else if (acc >= 60) {
            accuracyDisplay.style.color = '#ffcc00';
        } else {
            accuracyDisplay.style.color = '#ff3366';
        }
    }

    // ==================== Callbacks ====================
    function onNoteHit(rating, combo) {
        if (music) {
            music.playSFX(rating);
        }
    }

    function onSongEnd() {
        isPlaying = false;
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        if (music) music.stop();
        showResults();
    }

    // ==================== Results ====================
    function showResults() {
        canvas.classList.add('hidden');
        hud.classList.add('hidden');
        touchZones.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');

        const results = game ? game.getResults() : {};
        const songs = game ? game.songs : [];
        const songName = songs[currentSongIndex] ? songs[currentSongIndex].name : '';

        resultsSongName.textContent = songName;

        // Grade
        const grade = results.grade || 'D';
        gradeDisplay.textContent = grade;
        gradeDisplay.className = 'grade grade-' + grade.toLowerCase();

        // Stats
        resultsStats.textContent = '';
        const stats = [
            { label: 'Perfect', value: results.perfects || 0, cls: 'perfect' },
            { label: 'Great', value: results.greats || 0, cls: 'great' },
            { label: 'Good', value: results.goods || 0, cls: 'good' },
            { label: 'Miss', value: results.misses || 0, cls: 'miss' },
            { label: 'Max Combo', value: results.maxCombo || 0, cls: 'combo' },
            { label: 'Score', value: results.score || 0, cls: 'score' }
        ];

        stats.forEach((stat) => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const label = document.createElement('span');
            label.className = 'stat-label';
            label.textContent = stat.label;
            row.appendChild(label);

            const value = document.createElement('span');
            value.className = 'stat-value ' + stat.cls;
            value.textContent = '0';
            value.dataset.target = String(stat.value);
            row.appendChild(value);

            resultsStats.appendChild(row);
        });

        // Animate score counters
        animateResultCounters();

        // Save best score
        if (game && songs[currentSongIndex]) {
            const score = results.score || 0;
            if (!songs[currentSongIndex].bestScore || score > songs[currentSongIndex].bestScore) {
                songs[currentSongIndex].bestScore = score;
            }
        }
    }

    function animateResultCounters() {
        const valueEls = resultsStats.querySelectorAll('.stat-value');
        valueEls.forEach((el) => {
            const target = parseInt(el.dataset.target, 10) || 0;
            if (target === 0) {
                el.textContent = '0';
                return;
            }
            let current = 0;
            const duration = 800;
            const startTime = performance.now();

            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // ease-out quad
                const eased = 1 - (1 - progress) * (1 - progress);
                current = Math.round(eased * target);
                el.textContent = current.toLocaleString();
                if (progress < 1) {
                    requestAnimationFrame(tick);
                }
            }
            requestAnimationFrame(tick);
        });
    }

    // ==================== Pause ====================
    function togglePause() {
        if (!isPlaying) return;

        isPaused = !isPaused;
        if (isPaused) {
            pauseScreen.classList.remove('hidden');
            if (game) game.pause();
            if (music) music.pause();
        } else {
            pauseScreen.classList.add('hidden');
            if (game) game.resume();
            if (music) music.resume();
        }
    }

    function quitToMenu() {
        isPlaying = false;
        isPaused = false;
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        if (game) game.stop();
        if (music) music.stop();

        canvas.classList.add('hidden');
        hud.classList.add('hidden');
        touchZones.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        resultsScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');

        populateSongList();
    }

    // ==================== Buttons ====================
    function setupButtons() {
        document.getElementById('resume-btn').addEventListener('click', () => {
            if (isPaused) togglePause();
        });
        document.getElementById('restart-btn').addEventListener('click', () => {
            pauseScreen.classList.add('hidden');
            isPaused = false;
            isPlaying = false;
            if (animFrameId) cancelAnimationFrame(animFrameId);
            if (music) music.stop();
            startSong(currentSongIndex);
        });
        document.getElementById('quit-btn').addEventListener('click', quitToMenu);
        document.getElementById('retry-btn').addEventListener('click', () => {
            resultsScreen.classList.add('hidden');
            startSong(currentSongIndex);
        });
        document.getElementById('back-btn').addEventListener('click', quitToMenu);
    }

    // ==================== Keyboard Input ====================
    function setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const key = e.key.toLowerCase();

            if (key === ' ' || key === 'spacebar') {
                e.preventDefault();
                if (isPlaying) togglePause();
                return;
            }

            if (key === 'escape') {
                if (isPlaying) {
                    if (isPaused) {
                        quitToMenu();
                    } else {
                        togglePause();
                    }
                }
                return;
            }

            if (!isPlaying || isPaused) return;

            const lane = KEY_MAP[key];
            if (lane != null) {
                e.preventDefault();
                if (game) game.handleKeyDown(lane);
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const lane = KEY_MAP[key];
            if (lane != null && isPlaying) {
                if (game) game.handleKeyUp(lane);
            }
        });
    }

    // ==================== Touch Input ====================
    function setupTouchInput() {
        const zones = touchZones.querySelectorAll('.touch-zone');
        const activeTouches = new Map(); // touchId -> lane

        touchZones.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!isPlaying || isPaused) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const lane = getTouchLane(touch);
                if (lane != null) {
                    activeTouches.set(touch.identifier, lane);
                    zones[lane].classList.add('active');
                    if (game) game.handleKeyDown(lane);
                }
            }
        }, { passive: false });

        touchZones.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!isPlaying) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const lane = activeTouches.get(touch.identifier);
                if (lane != null) {
                    activeTouches.delete(touch.identifier);
                    zones[lane].classList.remove('active');
                    if (game) game.handleKeyUp(lane);
                }
            }
        }, { passive: false });

        touchZones.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const lane = activeTouches.get(touch.identifier);
                if (lane != null) {
                    activeTouches.delete(touch.identifier);
                    zones[lane].classList.remove('active');
                    if (game) game.handleKeyUp(lane);
                }
            }
        }, { passive: false });

        // Also allow tapping anywhere on canvas for mobile (full screen touch)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!isPlaying || isPaused) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const lane = getCanvasTouchLane(touch);
                if (lane != null) {
                    activeTouches.set(touch.identifier, lane);
                    zones[lane].classList.add('active');
                    if (game) game.handleKeyDown(lane);
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!isPlaying) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const lane = activeTouches.get(touch.identifier);
                if (lane != null) {
                    activeTouches.delete(touch.identifier);
                    zones[lane].classList.remove('active');
                    if (game) game.handleKeyUp(lane);
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const lane = activeTouches.get(touch.identifier);
                if (lane != null) {
                    activeTouches.delete(touch.identifier);
                    zones[lane].classList.remove('active');
                    if (game) game.handleKeyUp(lane);
                }
            }
        }, { passive: false });
    }

    function getTouchLane(touch) {
        const rect = touchZones.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const zoneWidth = rect.width / 4;
        const lane = Math.floor(x / zoneWidth);
        return (lane >= 0 && lane <= 3) ? lane : null;
    }

    function getCanvasTouchLane(touch) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const laneWidth = rect.width / 4;
        const lane = Math.floor(x / laneWidth);
        return (lane >= 0 && lane <= 3) ? lane : null;
    }

    // ==================== Resize ====================
    function handleResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);

        if (game) game.resize(w, h);

        // Reposition touch zones
        const zones = touchZones.querySelectorAll('.touch-zone');
        const zoneWidth = w / 4;
        zones.forEach((zone, i) => {
            zone.style.width = zoneWidth + 'px';
        });
    }

    // ==================== Start ====================
    init();
});
