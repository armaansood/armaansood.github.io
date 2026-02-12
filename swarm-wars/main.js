// main.js - Main controller connecting UI to game engine
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const menuScreen = document.getElementById('menu-screen');
    const hud = document.getElementById('hud');
    const gameoverScreen = document.getElementById('gameover-screen');
    const pauseScreen = document.getElementById('pause-screen');

    let game = null;
    let gameSpeed = 1;
    let gameTimer = 0;
    let timerInterval = null;
    let hudUpdateInterval = null;

    let settings = {
        difficulty: 'medium',
        opponents: 1,
        mapSize: 'medium',
        mode: 'play',
        theme: 'bee-swarm'
    };

    // ========================
    // CACHED DOM REFERENCES & PERF STATE
    // ========================
    const cachedEls = {
        playerPlanets: document.getElementById('player-planets'),
        playerShips: document.getElementById('player-ships'),
        aiInfo: document.getElementById('ai-info'),
        gameTimer: document.getElementById('game-timer'),
        speedBtn: document.getElementById('speed-btn'),
        hintEl: document.getElementById('tutorial-hint'),
        hintText: document.getElementById('hint-text'),
        gameoverTitle: document.getElementById('gameover-title'),
        gameoverSubtitle: document.getElementById('gameover-subtitle'),
        gameoverStats: document.getElementById('gameover-stats'),
        campaignObjective: document.getElementById('campaign-objective'),
    };
    let cachedTheme = null;           // cached getTheme() result
    let cachedThemeId = null;         // theme id the cache was built from
    let cachedHintsSeen = false;      // cached localStorage hints_seen flag
    let cachedCampaignProgress = null; // cached campaign progress from localStorage
    let aiPanelEls = [];              // reusable AI info DOM elements
    let lastAiUpdateTick = 0;         // throttle AI panel updates
    let hudTickCount = 0;             // tick counter for AI panel throttle

    // ========================
    // STORAGE ABSTRACTION (CrazyGames cloud save + localStorage fallback)
    // ========================
    const GameStorage = {
        _get(key) {
            try {
                const sdk = getCrazySDK();
                if (sdk && sdk.data) {
                    const val = sdk.data.getItem(key);
                    if (val != null) return val;
                }
            } catch (e) {}
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        _set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) {}
            try {
                const sdk = getCrazySDK();
                if (sdk && sdk.data) sdk.data.setItem(key, value);
            } catch (e) {}
        },
        _remove(key) {
            try { localStorage.removeItem(key); } catch (e) {}
            try {
                const sdk = getCrazySDK();
                if (sdk && sdk.data) sdk.data.removeItem(key);
            } catch (e) {}
        },
        getItem(key) { return this._get(key); },
        setItem(key, value) { this._set(key, value); },
        removeItem(key) { this._remove(key); }
    };

    // ========================
    // CAMPAIGN DATA
    // ========================
    let activeCampaignLevel = null; // set when playing a campaign level
    let shownHints = new Set();
    let hintDismissTimer = null;
    const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function showHint(text) {
        const hintEl = cachedEls.hintEl;
        const hintText = cachedEls.hintText;
        if (!hintEl || !hintText) return;
        hintText.textContent = text;
        hintEl.classList.remove('hidden', 'fading');
        if (hintDismissTimer) clearTimeout(hintDismissTimer);
        hintDismissTimer = setTimeout(() => {
            hintEl.classList.add('fading');
            setTimeout(() => { hintEl.classList.add('hidden'); hintEl.classList.remove('fading'); }, 500);
        }, 6000);
    }

    function dismissHint() {
        const hintEl = cachedEls.hintEl;
        if (!hintEl) return;
        if (hintDismissTimer) { clearTimeout(hintDismissTimer); hintDismissTimer = null; }
        hintEl.classList.add('hidden');
        hintEl.classList.remove('fading');
    }

    function clearHintState() {
        shownHints.clear();
        if (hintDismissTimer) { clearTimeout(hintDismissTimer); hintDismissTimer = null; }
        const hintEl = cachedEls.hintEl;
        if (hintEl) { hintEl.classList.add('hidden'); hintEl.classList.remove('fading'); }
    }

    function checkHints() {
        if (!activeCampaignLevel || !activeCampaignLevel.hints) return;
        if (cachedHintsSeen) return;
        const hints = activeCampaignLevel.hints;
        for (let i = 0; i < hints.length; i++) {
            const h = hints[i];
            if (gameTimer >= h.time && !shownHints.has(h.time)) {
                shownHints.add(h.time);
                showHint(isMobileDevice ? h.mobile : h.desktop);
                break;
            }
        }
        if (shownHints.size === hints.length) {
            cachedHintsSeen = true;
            GameStorage.setItem('swarmwars_hints_seen_' + activeCampaignLevel.id, '1');
        }
    }

    const CAMPAIGN_LEVELS = [
        // --- Levels 1-5: Tutorial (bee-swarm, easy) ---
        { id: 1, name: "First Flight", difficulty: "easy", numAIs: 1,
          planets: [
            {x:0.2,y:0.5,r:30,owner:'player',ships:50},
            {x:0.8,y:0.5,r:25,owner:'ai1',ships:30},
            {x:0.5,y:0.3,r:20,owner:'neutral',ships:10},
            {x:0.5,y:0.7,r:22,owner:'neutral',ships:15}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[180,120,60], theme:"bee-swarm",
          hints: [
            { time: 0, desktop: "Click a hive to select it, then click a target to send ships", mobile: "Tap a hive to select it, then tap an enemy or neutral hive to send ships" },
            { time: 8, desktop: "\u{1F3C6} Bigger hives produce ships faster \u2014 capture large ones first!", mobile: "\u{1F3C6} Bigger hives produce ships faster \u2014 capture large ones first!" },
            { time: 16, desktop: "Press A to select all your hives at once", mobile: "Double-tap a hive to select ALL your hives" },
            { time: 24, desktop: "Drag to box-select multiple hives", mobile: "Drag to box-select multiple hives" },
            { time: 32, desktop: "Click a fleet in transit, then click a new target to reroute it", mobile: "Tap a fleet in transit, then tap a new target to reroute it" },
            { time: 40, desktop: "Shift+Click a target to send 75% of your ships", mobile: "Send ships from multiple hives to overwhelm the enemy!" }
          ] },

        { id: 2, name: "Gathering Swarm", difficulty: "easy", numAIs: 1,
          planets: [
            {x:0.15,y:0.5,r:28,owner:'player',ships:40},
            {x:0.85,y:0.5,r:28,owner:'ai1',ships:40},
            {x:0.35,y:0.3,r:20,owner:'neutral',ships:12},
            {x:0.65,y:0.3,r:18,owner:'neutral',ships:8},
            {x:0.35,y:0.7,r:22,owner:'neutral',ships:15},
            {x:0.65,y:0.7,r:19,owner:'neutral',ships:10}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[180,120,60], theme:"bee-swarm" },

        { id: 3, name: "The Meadow", difficulty: "easy", numAIs: 1,
          planets: [
            {x:0.1,y:0.5,r:30,owner:'player',ships:50},
            {x:0.9,y:0.5,r:30,owner:'ai1',ships:50},
            {x:0.3,y:0.25,r:22,owner:'neutral',ships:10},
            {x:0.5,y:0.15,r:18,owner:'neutral',ships:8},
            {x:0.7,y:0.25,r:20,owner:'neutral',ships:12},
            {x:0.3,y:0.75,r:20,owner:'neutral',ships:12},
            {x:0.5,y:0.85,r:18,owner:'neutral',ships:8},
            {x:0.7,y:0.75,r:22,owner:'neutral',ships:10}
          ],
          winCondition:"time-trial", timeLimit:180, starThresholds:[180,120,60], theme:"bee-swarm" },

        { id: 4, name: "Hive Defense", difficulty: "easy", numAIs: 1,
          planets: [
            {x:0.5,y:0.5,r:35,owner:'player',ships:60},
            {x:0.15,y:0.2,r:22,owner:'ai1',ships:30},
            {x:0.85,y:0.2,r:22,owner:'ai1',ships:30},
            {x:0.15,y:0.8,r:20,owner:'ai1',ships:25},
            {x:0.85,y:0.8,r:20,owner:'ai1',ships:25},
            {x:0.35,y:0.35,r:18,owner:'neutral',ships:5},
            {x:0.65,y:0.35,r:18,owner:'neutral',ships:5},
            {x:0.35,y:0.65,r:18,owner:'neutral',ships:5},
            {x:0.65,y:0.65,r:18,owner:'neutral',ships:5}
          ],
          winCondition:"survive", timeLimit:90, starThresholds:[1,3,5], theme:"bee-swarm" },

        { id: 5, name: "Queen's Gambit", difficulty: "easy", numAIs: 1,
          planets: [
            {x:0.15,y:0.5,r:25,owner:'player',ships:45},
            {x:0.85,y:0.5,r:25,owner:'ai1',ships:45},
            {x:0.5,y:0.5,r:40,owner:'neutral',ships:60},
            {x:0.3,y:0.3,r:18,owner:'neutral',ships:10},
            {x:0.7,y:0.3,r:18,owner:'neutral',ships:10},
            {x:0.3,y:0.7,r:18,owner:'neutral',ships:10},
            {x:0.7,y:0.7,r:18,owner:'neutral',ships:10}
          ],
          winCondition:"capture-target", targetPlanetIndex:2, timeLimit:null, starThresholds:[150,90,45], theme:"bee-swarm" },

        // --- Levels 6-10: Medium (space unlocks at L5) ---
        { id: 6, name: "Asteroid Belt", difficulty: "medium", numAIs: 1,
          planets: [
            {x:0.5,y:0.5,r:35,owner:'neutral',ships:40},
            {x:0.15,y:0.5,r:28,owner:'player',ships:50},
            {x:0.85,y:0.5,r:28,owner:'ai1',ships:50},
            {x:0.35,y:0.2,r:20,owner:'neutral',ships:12},
            {x:0.65,y:0.2,r:20,owner:'neutral',ships:12},
            {x:0.35,y:0.8,r:20,owner:'neutral',ships:12},
            {x:0.65,y:0.8,r:20,owner:'neutral',ships:12},
            {x:0.5,y:0.15,r:18,owner:'neutral',ships:8},
            {x:0.5,y:0.85,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[240,150,90], theme:"space" },

        { id: 7, name: "Two Front War", difficulty: "medium", numAIs: 2,
          planets: [
            {x:0.5,y:0.85,r:28,owner:'player',ships:50},
            {x:0.15,y:0.15,r:28,owner:'ai1',ships:45},
            {x:0.85,y:0.15,r:28,owner:'ai2',ships:45},
            {x:0.3,y:0.5,r:22,owner:'neutral',ships:15},
            {x:0.7,y:0.5,r:22,owner:'neutral',ships:15},
            {x:0.5,y:0.5,r:25,owner:'neutral',ships:20},
            {x:0.15,y:0.55,r:18,owner:'neutral',ships:10},
            {x:0.85,y:0.55,r:18,owner:'neutral',ships:10},
            {x:0.5,y:0.3,r:20,owner:'neutral',ships:12},
            {x:0.35,y:0.15,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[300,200,120], theme:"space" },

        { id: 8, name: "Blitz", difficulty: "medium", numAIs: 1,
          planets: [
            {x:0.15,y:0.5,r:30,owner:'player',ships:80},
            {x:0.85,y:0.5,r:30,owner:'ai1',ships:60},
            {x:0.35,y:0.3,r:20,owner:'neutral',ships:5},
            {x:0.55,y:0.25,r:18,owner:'neutral',ships:5},
            {x:0.35,y:0.7,r:20,owner:'neutral',ships:5},
            {x:0.55,y:0.75,r:18,owner:'neutral',ships:5},
            {x:0.7,y:0.4,r:22,owner:'neutral',ships:8},
            {x:0.7,y:0.6,r:22,owner:'neutral',ships:8}
          ],
          winCondition:"time-trial", timeLimit:90, starThresholds:[90,60,35], theme:"space" },

        { id: 9, name: "The Gauntlet", difficulty: "medium", numAIs: 1,
          planets: [
            {x:0.08,y:0.5,r:28,owner:'player',ships:60},
            {x:0.92,y:0.5,r:30,owner:'ai1',ships:50},
            {x:0.22,y:0.4,r:18,owner:'neutral',ships:15},
            {x:0.22,y:0.6,r:18,owner:'neutral',ships:15},
            {x:0.36,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.5,y:0.35,r:18,owner:'neutral',ships:18},
            {x:0.5,y:0.65,r:18,owner:'neutral',ships:18},
            {x:0.64,y:0.5,r:20,owner:'neutral',ships:22},
            {x:0.78,y:0.4,r:18,owner:'neutral',ships:20},
            {x:0.78,y:0.6,r:18,owner:'neutral',ships:20}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[300,200,120], theme:"space" },

        { id: 10, name: "Dark Star", difficulty: "medium", numAIs: 1,
          planets: [
            {x:0.5,y:0.5,r:45,owner:'neutral',ships:80},
            {x:0.15,y:0.5,r:25,owner:'player',ships:55},
            {x:0.85,y:0.5,r:25,owner:'ai1',ships:55},
            {x:0.3,y:0.2,r:20,owner:'neutral',ships:10},
            {x:0.7,y:0.2,r:20,owner:'neutral',ships:10},
            {x:0.3,y:0.8,r:20,owner:'neutral',ships:10},
            {x:0.7,y:0.8,r:20,owner:'neutral',ships:10},
            {x:0.5,y:0.2,r:18,owner:'neutral',ships:8},
            {x:0.5,y:0.8,r:18,owner:'neutral',ships:8},
            {x:0.15,y:0.25,r:18,owner:'neutral',ships:8},
            {x:0.85,y:0.75,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-target", targetPlanetIndex:0, timeLimit:null, starThresholds:[240,150,90], theme:"space" },

        // --- Levels 11-15: Hard (medieval unlocks at L10) ---
        { id: 11, name: "Siege Lines", difficulty: "hard", numAIs: 2,
          planets: [
            {x:0.5,y:0.9,r:30,owner:'player',ships:60},
            {x:0.25,y:0.1,r:28,owner:'ai1',ships:55},
            {x:0.75,y:0.1,r:28,owner:'ai2',ships:55},
            {x:0.2,y:0.5,r:22,owner:'neutral',ships:20},
            {x:0.4,y:0.5,r:20,owner:'neutral',ships:18},
            {x:0.6,y:0.5,r:20,owner:'neutral',ships:18},
            {x:0.8,y:0.5,r:22,owner:'neutral',ships:20},
            {x:0.3,y:0.3,r:18,owner:'neutral',ships:12},
            {x:0.7,y:0.3,r:18,owner:'neutral',ships:12},
            {x:0.5,y:0.35,r:25,owner:'neutral',ships:25},
            {x:0.5,y:0.65,r:20,owner:'neutral',ships:15},
            {x:0.15,y:0.7,r:18,owner:'neutral',ships:10}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[360,240,150], theme:"medieval" },

        { id: 12, name: "Castle Storm", difficulty: "hard", numAIs: 2,
          planets: [
            {x:0.5,y:0.5,r:25,owner:'player',ships:55},
            {x:0.1,y:0.1,r:30,owner:'ai1',ships:60},
            {x:0.9,y:0.9,r:30,owner:'ai2',ships:60},
            {x:0.3,y:0.3,r:20,owner:'neutral',ships:15},
            {x:0.7,y:0.7,r:20,owner:'neutral',ships:15},
            {x:0.7,y:0.3,r:18,owner:'neutral',ships:12},
            {x:0.3,y:0.7,r:18,owner:'neutral',ships:12},
            {x:0.1,y:0.5,r:20,owner:'neutral',ships:18},
            {x:0.9,y:0.5,r:20,owner:'neutral',ships:18},
            {x:0.5,y:0.1,r:18,owner:'neutral',ships:10},
            {x:0.5,y:0.9,r:18,owner:'neutral',ships:10},
            {x:0.15,y:0.85,r:18,owner:'neutral',ships:10},
            {x:0.85,y:0.15,r:18,owner:'neutral',ships:10}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[360,240,150], theme:"medieval" },

        { id: 13, name: "King's Bastion", difficulty: "hard", numAIs: 2,
          planets: [
            {x:0.5,y:0.5,r:40,owner:'player',ships:70},
            {x:0.1,y:0.2,r:25,owner:'ai1',ships:50},
            {x:0.9,y:0.2,r:25,owner:'ai1',ships:50},
            {x:0.1,y:0.8,r:25,owner:'ai2',ships:50},
            {x:0.9,y:0.8,r:25,owner:'ai2',ships:50},
            {x:0.3,y:0.2,r:18,owner:'neutral',ships:15},
            {x:0.7,y:0.2,r:18,owner:'neutral',ships:15},
            {x:0.3,y:0.8,r:18,owner:'neutral',ships:15},
            {x:0.7,y:0.8,r:18,owner:'neutral',ships:15},
            {x:0.25,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.75,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.5,y:0.25,r:18,owner:'neutral',ships:12},
            {x:0.5,y:0.75,r:18,owner:'neutral',ships:12},
            {x:0.15,y:0.5,r:18,owner:'neutral',ships:10}
          ],
          winCondition:"survive", timeLimit:120, starThresholds:[2,5,8], theme:"medieval" },

        { id: 14, name: "War on All Fronts", difficulty: "hard", numAIs: 2,
          planets: [
            {x:0.5,y:0.5,r:28,owner:'player',ships:55},
            {x:0.1,y:0.1,r:26,owner:'ai1',ships:55},
            {x:0.9,y:0.1,r:26,owner:'ai2',ships:55},
            {x:0.3,y:0.2,r:20,owner:'neutral',ships:18},
            {x:0.7,y:0.2,r:20,owner:'neutral',ships:18},
            {x:0.2,y:0.4,r:18,owner:'neutral',ships:12},
            {x:0.8,y:0.4,r:18,owner:'neutral',ships:12},
            {x:0.35,y:0.65,r:20,owner:'neutral',ships:15},
            {x:0.65,y:0.65,r:20,owner:'neutral',ships:15},
            {x:0.5,y:0.85,r:22,owner:'neutral',ships:20},
            {x:0.15,y:0.7,r:18,owner:'neutral',ships:10},
            {x:0.85,y:0.7,r:18,owner:'neutral',ships:10},
            {x:0.5,y:0.3,r:18,owner:'neutral',ships:14},
            {x:0.1,y:0.9,r:18,owner:'neutral',ships:8},
            {x:0.9,y:0.9,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[360,240,150], theme:"medieval" },

        { id: 15, name: "The Iron Throne", difficulty: "hard", numAIs: 2,
          planets: [
            {x:0.5,y:0.5,r:42,owner:'neutral',ships:100},
            {x:0.1,y:0.5,r:26,owner:'player',ships:50},
            {x:0.9,y:0.3,r:26,owner:'ai1',ships:60},
            {x:0.9,y:0.7,r:26,owner:'ai2',ships:60},
            {x:0.25,y:0.25,r:20,owner:'neutral',ships:15},
            {x:0.25,y:0.75,r:20,owner:'neutral',ships:15},
            {x:0.75,y:0.15,r:18,owner:'neutral',ships:12},
            {x:0.75,y:0.85,r:18,owner:'neutral',ships:12},
            {x:0.4,y:0.2,r:18,owner:'neutral',ships:10},
            {x:0.4,y:0.8,r:18,owner:'neutral',ships:10},
            {x:0.6,y:0.35,r:18,owner:'neutral',ships:10},
            {x:0.6,y:0.65,r:18,owner:'neutral',ships:10},
            {x:0.15,y:0.15,r:18,owner:'neutral',ships:8},
            {x:0.15,y:0.85,r:18,owner:'neutral',ships:8},
            {x:0.5,y:0.15,r:20,owner:'neutral',ships:12},
            {x:0.5,y:0.85,r:20,owner:'neutral',ships:12}
          ],
          winCondition:"capture-target", targetPlanetIndex:0, timeLimit:null, starThresholds:[360,240,120], theme:"medieval" },

        // --- Levels 16-20: Impossible (ant-colony unlocks at L15, neon SECRET at L20) ---
        { id: 16, name: "Swarm Uprising", difficulty: "impossible", numAIs: 2,
          planets: [
            {x:0.5,y:0.9,r:26,owner:'player',ships:50},
            {x:0.2,y:0.1,r:28,owner:'ai1',ships:65},
            {x:0.8,y:0.1,r:28,owner:'ai2',ships:65},
            {x:0.35,y:0.3,r:22,owner:'neutral',ships:25},
            {x:0.65,y:0.3,r:22,owner:'neutral',ships:25},
            {x:0.2,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.8,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.5,y:0.5,r:25,owner:'neutral',ships:30},
            {x:0.35,y:0.7,r:18,owner:'neutral',ships:15},
            {x:0.65,y:0.7,r:18,owner:'neutral',ships:15},
            {x:0.1,y:0.3,r:18,owner:'neutral',ships:10},
            {x:0.9,y:0.3,r:18,owner:'neutral',ships:10},
            {x:0.5,y:0.15,r:20,owner:'neutral',ships:18},
            {x:0.1,y:0.7,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[420,300,180], theme:"ant-colony" },

        { id: 17, name: "Colony Collapse", difficulty: "impossible", numAIs: 2,
          planets: [
            {x:0.5,y:0.5,r:30,owner:'player',ships:60},
            {x:0.1,y:0.1,r:30,owner:'ai1',ships:70},
            {x:0.9,y:0.9,r:30,owner:'ai2',ships:70},
            {x:0.3,y:0.2,r:22,owner:'ai1',ships:25},
            {x:0.7,y:0.8,r:22,owner:'ai2',ships:25},
            {x:0.7,y:0.2,r:20,owner:'neutral',ships:20},
            {x:0.3,y:0.8,r:20,owner:'neutral',ships:20},
            {x:0.2,y:0.5,r:18,owner:'neutral',ships:15},
            {x:0.8,y:0.5,r:18,owner:'neutral',ships:15},
            {x:0.5,y:0.25,r:18,owner:'neutral',ships:12},
            {x:0.5,y:0.75,r:18,owner:'neutral',ships:12},
            {x:0.15,y:0.75,r:18,owner:'neutral',ships:10},
            {x:0.85,y:0.25,r:18,owner:'neutral',ships:10},
            {x:0.4,y:0.4,r:18,owner:'neutral',ships:8},
            {x:0.6,y:0.6,r:18,owner:'neutral',ships:8},
            {x:0.1,y:0.5,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[420,300,180], theme:"ant-colony" },

        { id: 18, name: "Pestilence", difficulty: "impossible", numAIs: 3,
          planets: [
            {x:0.5,y:0.5,r:28,owner:'player',ships:55},
            {x:0.1,y:0.15,r:26,owner:'ai1',ships:55},
            {x:0.9,y:0.15,r:26,owner:'ai2',ships:55},
            {x:0.5,y:0.1,r:26,owner:'ai3',ships:55},
            {x:0.25,y:0.35,r:20,owner:'neutral',ships:18},
            {x:0.75,y:0.35,r:20,owner:'neutral',ships:18},
            {x:0.3,y:0.65,r:18,owner:'neutral',ships:15},
            {x:0.7,y:0.65,r:18,owner:'neutral',ships:15},
            {x:0.5,y:0.8,r:22,owner:'neutral',ships:20},
            {x:0.15,y:0.55,r:18,owner:'neutral',ships:12},
            {x:0.85,y:0.55,r:18,owner:'neutral',ships:12},
            {x:0.1,y:0.85,r:18,owner:'neutral',ships:10},
            {x:0.9,y:0.85,r:18,owner:'neutral',ships:10},
            {x:0.35,y:0.9,r:18,owner:'neutral',ships:8},
            {x:0.65,y:0.9,r:18,owner:'neutral',ships:8},
            {x:0.5,y:0.35,r:18,owner:'neutral',ships:14}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[480,360,240], theme:"ant-colony" },

        { id: 19, name: "Extinction Event", difficulty: "impossible", numAIs: 3,
          planets: [
            {x:0.5,y:0.92,r:26,owner:'player',ships:50},
            {x:0.15,y:0.08,r:28,owner:'ai1',ships:65},
            {x:0.85,y:0.08,r:28,owner:'ai2',ships:65},
            {x:0.5,y:0.08,r:28,owner:'ai3',ships:65},
            {x:0.3,y:0.25,r:22,owner:'neutral',ships:25},
            {x:0.7,y:0.25,r:22,owner:'neutral',ships:25},
            {x:0.5,y:0.4,r:25,owner:'neutral',ships:30},
            {x:0.2,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.8,y:0.5,r:20,owner:'neutral',ships:20},
            {x:0.35,y:0.65,r:18,owner:'neutral',ships:15},
            {x:0.65,y:0.65,r:18,owner:'neutral',ships:15},
            {x:0.5,y:0.75,r:20,owner:'neutral',ships:18},
            {x:0.15,y:0.35,r:18,owner:'neutral',ships:12},
            {x:0.85,y:0.35,r:18,owner:'neutral',ships:12},
            {x:0.1,y:0.7,r:18,owner:'neutral',ships:10},
            {x:0.9,y:0.7,r:18,owner:'neutral',ships:10},
            {x:0.25,y:0.85,r:18,owner:'neutral',ships:8},
            {x:0.75,y:0.85,r:18,owner:'neutral',ships:8}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[540,420,300], theme:"ant-colony" },

        { id: 20, name: "The Hive Mind", difficulty: "impossible", numAIs: 3,
          planets: [
            {x:0.5,y:0.92,r:28,owner:'player',ships:55},
            {x:0.15,y:0.08,r:30,owner:'ai1',ships:70},
            {x:0.85,y:0.08,r:30,owner:'ai2',ships:70},
            {x:0.5,y:0.08,r:30,owner:'ai3',ships:70},
            {x:0.3,y:0.2,r:22,owner:'ai1',ships:30},
            {x:0.7,y:0.2,r:22,owner:'ai2',ships:30},
            {x:0.5,y:0.3,r:25,owner:'ai3',ships:35},
            {x:0.2,y:0.4,r:20,owner:'neutral',ships:25},
            {x:0.8,y:0.4,r:20,owner:'neutral',ships:25},
            {x:0.35,y:0.5,r:20,owner:'neutral',ships:22},
            {x:0.65,y:0.5,r:20,owner:'neutral',ships:22},
            {x:0.5,y:0.6,r:22,owner:'neutral',ships:20},
            {x:0.25,y:0.65,r:18,owner:'neutral',ships:18},
            {x:0.75,y:0.65,r:18,owner:'neutral',ships:18},
            {x:0.4,y:0.78,r:18,owner:'neutral',ships:15},
            {x:0.6,y:0.78,r:18,owner:'neutral',ships:15},
            {x:0.15,y:0.55,r:18,owner:'neutral',ships:12},
            {x:0.85,y:0.55,r:18,owner:'neutral',ships:12},
            {x:0.1,y:0.8,r:18,owner:'neutral',ships:10},
            {x:0.9,y:0.8,r:18,owner:'neutral',ships:10}
          ],
          winCondition:"capture-all", timeLimit:null, starThresholds:[600,480,300], theme:"ant-colony" }
    ];

    // Theme unlock map: levelId -> theme unlocked
    const THEME_UNLOCK_MAP = { 5: 'space', 10: 'medieval', 15: 'ant-colony', 20: 'neon' };

    // ========================
    // CAMPAIGN PROGRESS
    // ========================
    function getCampaignProgress() {
        try {
            const data = JSON.parse(GameStorage.getItem('swarmwars_campaign') || '{}');
            return data.levels || {};
        } catch (e) { return {}; }
    }

    function saveCampaignProgress(levelId, stars, time) {
        try {
            const data = JSON.parse(GameStorage.getItem('swarmwars_campaign') || '{}');
            if (!data.levels) data.levels = {};
            const prev = data.levels[levelId];
            data.levels[levelId] = {
                completed: true,
                stars: prev ? Math.max(prev.stars, stars) : stars,
                bestTime: prev ? Math.min(prev.bestTime, time) : time
            };
            GameStorage.setItem('swarmwars_campaign', JSON.stringify(data));
            cachedCampaignProgress = data; // keep cache in sync
            // Check theme unlocks
            checkThemeUnlocks();
        } catch (e) { console.warn('Failed to save campaign progress:', e); }
    }

    function getUnlockedThemes() {
        try {
            return JSON.parse(GameStorage.getItem('swarmwars_unlocked_themes') || '["bee-swarm"]');
        } catch (e) { return ['bee-swarm']; }
    }

    function saveUnlockedThemes(themes) {
        GameStorage.setItem('swarmwars_unlocked_themes', JSON.stringify(themes));
    }

    function checkThemeUnlocks() {
        const progress = getCampaignProgress();
        const unlocked = getUnlockedThemes();
        let changed = false;
        for (const [levelId, themeId] of Object.entries(THEME_UNLOCK_MAP)) {
            if (progress[levelId] && progress[levelId].completed && !unlocked.includes(themeId)) {
                unlocked.push(themeId);
                changed = true;
            }
        }
        if (changed) saveUnlockedThemes(unlocked);
        return unlocked;
    }

    function isLevelUnlocked(levelId) {
        if (levelId === 1) return true;
        const progress = getCampaignProgress();
        return progress[levelId - 1] && progress[levelId - 1].completed;
    }

    function calculateStars(levelData, won, timeTaken, playerPlanets) {
        if (!won) return 0;
        const t = levelData.starThresholds;
        if (levelData.winCondition === 'survive') {
            // Stars based on planets held at end
            if (playerPlanets >= t[2]) return 3;
            if (playerPlanets >= t[1]) return 2;
            return 1;
        }
        // Time-based: lower is better
        if (timeTaken <= t[2]) return 3;
        if (timeTaken <= t[1]) return 2;
        return 1;
    }

    // ========================
    // CAMPAIGN UI
    // ========================
    function updateThemeButtons() {
        const unlocked = getUnlockedThemes();
        const themeSelect = document.getElementById('theme-select');
        if (!themeSelect) return;
        themeSelect.querySelectorAll('button').forEach(btn => {
            const val = btn.dataset.value;
            if (unlocked.includes(val)) {
                btn.disabled = false;
                btn.classList.remove('theme-locked');
                btn.classList.remove('secret-theme');
                // Reveal neon theme name when unlocked
                if (val === 'neon') btn.textContent = '💠 Neon';
            } else {
                btn.disabled = true;
                btn.classList.add('theme-locked');
                // Keep secret theme hidden
                if (val === 'neon') btn.textContent = '❓ ???';
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    // Fall back to bee-swarm
                    const beeBtn = themeSelect.querySelector('[data-value="bee-swarm"]');
                    if (beeBtn) beeBtn.classList.add('selected');
                    settings.theme = 'bee-swarm';
                    applyTheme('bee-swarm');
                }
            }
        });
    }

    function showCampaignScreen() {
        const screen = document.getElementById('campaign-screen');
        if (!screen) return;
        menuScreen.classList.add('hidden');
        screen.classList.remove('hidden');
        renderCampaignGrid();
    }

    function hideCampaignScreen() {
        const screen = document.getElementById('campaign-screen');
        if (screen) screen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
    }

    function renderCampaignGrid() {
        const grid = document.getElementById('campaign-grid');
        if (!grid) return;
        grid.textContent = '';
        const progress = getCampaignProgress();
        const unlocked = getUnlockedThemes();

        // Theme unlock info
        const themeInfo = document.getElementById('campaign-theme-info');
        if (themeInfo) {
            themeInfo.textContent = '';
            const allThemes = [
                { id: 'bee-swarm', name: '🐝 Bees', level: 'Start' },
                { id: 'space', name: '🚀 Space', level: 'L5' },
                { id: 'medieval', name: '⚔️ Medieval', level: 'L10' },
                { id: 'ant-colony', name: '🐜 Bugs', level: 'L15' },
                { id: 'neon', name: '???', level: 'L20' }
            ];
            allThemes.forEach(t => {
                const span = document.createElement('span');
                const isUnlocked = unlocked.includes(t.id);
                span.className = 'campaign-theme-badge' + (isUnlocked ? ' unlocked' : ' locked');
                span.textContent = isUnlocked ? (t.id === 'neon' ? '💠 Neon' : t.name) : (t.id === 'neon' ? '🔒 ???' : '🔒 ' + t.name);
                themeInfo.appendChild(span);
            });
        }

        CAMPAIGN_LEVELS.forEach(level => {
            const btn = document.createElement('button');
            const isUnlck = isLevelUnlocked(level.id);
            const prog = progress[level.id];
            btn.className = 'campaign-level-btn';
            if (!isUnlck) btn.classList.add('locked');
            if (prog && prog.completed) btn.classList.add('completed');
            if (isUnlck && !prog) btn.classList.add('current');

            const num = document.createElement('div');
            num.className = 'level-num';
            num.textContent = isUnlck ? level.id : '🔒';

            const name = document.createElement('div');
            name.className = 'level-name';
            name.textContent = isUnlck ? level.name : '???';

            const stars = document.createElement('div');
            stars.className = 'level-stars';
            if (prog && prog.completed) {
                for (let i = 0; i < 3; i++) {
                    stars.textContent += i < prog.stars ? '⭐' : '☆';
                }
            }

            btn.appendChild(num);
            btn.appendChild(name);
            btn.appendChild(stars);

            if (isUnlck) {
                btn.addEventListener('click', () => {
                    SoundManager.init();
                    SoundManager.play('select');
                    startCampaignLevel(level);
                });
            }

            grid.appendChild(btn);
        });
    }

    function startCampaignLevel(levelData) {
        activeCampaignLevel = levelData;
        // Cache hints_seen flag once at level start
        cachedHintsSeen = !!GameStorage.getItem('swarmwars_hints_seen_' + levelData.id);
        const screen = document.getElementById('campaign-screen');
        if (screen) screen.classList.add('hidden');
        canvas.classList.remove('hidden');
        hud.classList.remove('hidden');

        // Apply level theme
        settings.theme = levelData.theme;
        applyTheme(levelData.theme);

        startCampaignGame(levelData);
    }

    function startCampaignGame(levelData) {
        if (game) game.stop();
        gameTimer = 0;
        // Don't reset gameSpeed — preserve speed between campaign levels
        gameOverShown = false;
        clearHintState();

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        game = new Game(canvas, levelData.theme);

        game.onCapture = (owner) => {
            SoundManager.play(owner === 'player' ? 'capture' : 'explode');
        };
        game.onFleetSend = () => SoundManager.play('send');
        game.onGameOver = (won) => {
            SoundManager.play(won ? 'victory' : 'defeat');
            showCampaignGameOver(won, levelData);
        };
        game.onSelect = () => SoundManager.play('select');

        game.generateCampaignMap(levelData);
        game.speed = gameSpeed;
        game.start();

        // Reset AI panel elements for fresh rebuild
        aiPanelEls = [];
        hudTickCount = 0;

        if (hudUpdateInterval) clearInterval(hudUpdateInterval);
        hudUpdateInterval = setInterval(updateHUD, 200);

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (game && game.state === 'playing') gameTimer++;
        }, 1000);

        if (cachedEls.speedBtn) cachedEls.speedBtn.textContent = '⏩ ' + gameSpeed + 'x';

        if (cachedEls.campaignObjective) {
            const obj = cachedEls.campaignObjective;
            if (levelData.winCondition === 'time-trial') {
                obj.textContent = '⏱ Capture all before time runs out!';
            } else if (levelData.winCondition === 'survive') {
                obj.textContent = '🛡️ Survive for ' + formatTime(levelData.timeLimit) + '!';
            } else if (levelData.winCondition === 'capture-target') {
                obj.textContent = '🎯 Capture the target!';
            } else {
                obj.textContent = '⚔️ Capture all enemy hives!';
            }
            obj.style.display = '';
        }

        gameoverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        updateHUD();

        try {
            const sdk = getCrazySDK();
            if (sdk && sdk.game && sdk.game.gameplayStart) sdk.game.gameplayStart();
        } catch (e) {}
    }

    function showCampaignGameOver(won, levelData) {
        if (gameOverShown) return;
        gameOverShown = true;

        if (hudUpdateInterval) { clearInterval(hudUpdateInterval); hudUpdateInterval = null; }
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

        gameoverScreen.classList.remove('hidden');

        try {
            const sdk = getCrazySDK();
            if (sdk && sdk.game) {
                if (sdk.game.gameplayStop) sdk.game.gameplayStop();
                if (won && sdk.game.happytime) sdk.game.happytime();
            }
        } catch (e) {}

        const titleEl = cachedEls.gameoverTitle;
        const subtitleEl = cachedEls.gameoverSubtitle;
        const statsEl = cachedEls.gameoverStats;

        const playerPlanets = game ? game.planets.filter(p => p.owner === 'player').length : 0;
        const stars = calculateStars(levelData, won, gameTimer, playerPlanets);

        if (won) {
            saveCampaignProgress(levelData.id, stars, gameTimer);
        }

        if (titleEl) {
            titleEl.textContent = won ? 'VICTORY' : 'DEFEAT';
            titleEl.className = won ? 'victory' : 'defeat';
        }
        if (subtitleEl) {
            subtitleEl.textContent = won ? 'Level ' + levelData.id + ': ' + levelData.name + ' complete!' : 'Try again, commander.';
        }

        gameoverScreen.setAttribute('data-result', won ? 'victory' : 'defeat');

        if (statsEl) {
            statsEl.textContent = '';
            // Star rating display
            const starRow = document.createElement('div');
            starRow.className = 'stat-row campaign-stars-display';
            const sl = document.createElement('span');
            sl.textContent = 'Rating';
            const sv = document.createElement('span');
            sv.className = 'star-rating';
            for (let i = 0; i < 3; i++) {
                const s = document.createElement('span');
                s.textContent = i < stars ? '⭐' : '☆';
                s.className = i < stars ? 'star-earned' : 'star-empty';
                if (i < stars) s.style.animationDelay = (i * 0.3) + 's';
                sv.appendChild(s);
            }
            starRow.appendChild(sl);
            starRow.appendChild(sv);
            statsEl.appendChild(starRow);

            const gameStats = game ? game.stats : { planetsCaptured: 0, fleetsSent: 0, shipsSent: 0 };
            [['Time', formatTime(gameTimer)], ['Planets Captured', gameStats.planetsCaptured || 0]].forEach(([label, value]) => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                const l = document.createElement('span');
                l.textContent = label;
                const v = document.createElement('span');
                v.textContent = value;
                row.appendChild(l);
                row.appendChild(v);
                statsEl.appendChild(row);
            });

            // Check if theme was unlocked
            if (won && THEME_UNLOCK_MAP[levelData.id]) {
                const unlockRow = document.createElement('div');
                unlockRow.className = 'stat-row theme-unlock-row';
                unlockRow.innerHTML = '<span>🔓 Theme Unlocked!</span><span>' + 
                    (THEME_UNLOCK_MAP[levelData.id] === 'neon' ? '💠 NEON' : THEME_UNLOCK_MAP[levelData.id].toUpperCase()) + '</span>';
                statsEl.appendChild(unlockRow);
            }
        }

        // Campaign-specific buttons
        const playAgainBtn = document.getElementById('playagain-btn');
        const menuBtn = document.getElementById('backtomenu-btn');
        let nextBtn = document.getElementById('campaign-next-btn');
        let campBtn = document.getElementById('campaign-back-btn');

        // Create next/campaign buttons if not exist
        if (!nextBtn) {
            nextBtn = document.createElement('button');
            nextBtn.id = 'campaign-next-btn';
            nextBtn.className = 'primary-btn';
            nextBtn.textContent = 'Next Level ▶';
            menuBtn.parentElement.insertBefore(nextBtn, menuBtn);
        }
        if (!campBtn) {
            campBtn = document.createElement('button');
            campBtn.id = 'campaign-back-btn';
            campBtn.className = 'secondary-btn';
            campBtn.textContent = '📜 Campaign Map';
            menuBtn.parentElement.appendChild(campBtn);
        }

        // Show/hide campaign buttons
        if (activeCampaignLevel) {
            if (playAgainBtn) playAgainBtn.textContent = '🔄 Retry';
            nextBtn.style.display = (won && levelData.id < 20) ? '' : 'none';
            campBtn.style.display = '';
            menuBtn.style.display = '';

            // Rebind next button
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', () => {
                SoundManager.play('select');
                gameoverScreen.classList.add('hidden');
                const nextLevel = CAMPAIGN_LEVELS.find(l => l.id === levelData.id + 1);
                if (nextLevel) startCampaignLevel(nextLevel);
            });

            // Rebind campaign back
            const newCamp = campBtn.cloneNode(true);
            campBtn.parentNode.replaceChild(newCamp, campBtn);
            newCamp.addEventListener('click', () => {
                SoundManager.play('select');
                goToMenu();
                showCampaignScreen();
            });
        } else {
            nextBtn.style.display = 'none';
            campBtn.style.display = 'none';
            if (playAgainBtn) playAgainBtn.textContent = 'Play Again';
        }
    }

    // ========================
    // SOUND MANAGER
    // ========================
    const SoundManager = {
        ctx: null,
        enabled: true,
        muted: false,

        init() {
            if (this.ctx) return;
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                // Restore mute state from localStorage
                if (GameStorage.getItem('swarmwars_muted') === 'true') {
                    this.muted = true;
                }
            } catch (e) {
                this.enabled = false;
            }
        },

        setMuted(val) {
            this.muted = val;
            GameStorage.setItem('swarmwars_muted', val ? 'true' : 'false');
            const btn = document.getElementById('mute-btn');
            if (btn) btn.textContent = val ? '🔇' : '🔊';
        },

        toggleMute() {
            this.setMuted(!this.muted);
        },

        play(name) {
            if (!this.enabled || !this.ctx || this.muted) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            switch (name) {
                case 'select': this._playSelect(); break;
                case 'send': this._playSend(); break;
                case 'capture': this._playCapture(); break;
                case 'explode': this._playExplode(); break;
                case 'victory': this._playVictory(); break;
                case 'defeat': this._playDefeat(); break;
            }
        },

        _createOsc(type, freq, duration, gainVal, detune) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            if (detune) osc.detune.value = detune;
            gain.gain.value = gainVal;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const now = this.ctx.currentTime;
            gain.gain.setValueAtTime(gainVal, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.start(now);
            osc.stop(now + duration);
            return { osc, gain, now };
        },

        _playSelect() {
            this._createOsc('sine', 800, 0.05, 0.15);
        },

        _playSend() {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        },

        _playCapture() {
            const now = this.ctx.currentTime;
            // Rising two-tone
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(400, now);
            osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.25);
            // Chime overtone
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1200, now + 0.05);
            gain2.gain.setValueAtTime(0.08, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(now + 0.05);
            osc2.stop(now + 0.3);
        },

        _playExplode() {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.1;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.1);
        },

        _playVictory() {
            const now = this.ctx.currentTime;
            // Major chord: C4 (261.63), E4 (329.63), G4 (392.00)
            const freqs = [261.63, 329.63, 392.00];
            freqs.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.05 + i * 0.08);
                gain.gain.setValueAtTime(0.1, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + 0.5);
            });
            // Octave highlight
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 523.25;
            gain.gain.setValueAtTime(0, now + 0.2);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + 0.2);
            osc.stop(now + 0.5);
        },

        _playDefeat() {
            const now = this.ctx.currentTime;
            // Minor chord descending: Eb4, C4, Ab3
            const freqs = [311.13, 261.63, 207.65];
            freqs.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq * 1.05, now + i * 0.1);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + 0.5);
                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.1);
                osc.stop(now + 0.55);
            });
        }
    };

    // Initialize audio on first interaction
    function ensureAudio() {
        SoundManager.init();
        // Try to lock landscape orientation on mobile
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } catch (e) {}
        document.removeEventListener('click', ensureAudio);
        document.removeEventListener('keydown', ensureAudio);
    }
    document.addEventListener('click', ensureAudio);
    document.addEventListener('keydown', ensureAudio);

    // ========================
    // ACHIEVEMENT MANAGER
    // ========================
    const AchievementManager = {
        achievements: [
            { id: 'first-blood', name: 'First Blood', desc: 'Win your first game.', icon: '⚔️' },
            { id: 'untouchable', name: 'Untouchable', desc: 'Win without losing a single hive.', icon: '🛡️' },
            { id: 'speed-demon', name: 'Speed Demon', desc: 'Defeat Impossible AI in under 2 minutes.', icon: '⚡' },
            { id: 'conqueror', name: 'Conqueror', desc: 'Capture 1,000 hives total.', icon: '👑' },
            { id: 'swarm-lord', name: 'Swarm Lord', desc: 'Complete all 20 campaign levels.', icon: '🏆' },
            { id: 'perfectionist', name: 'Perfectionist', desc: 'Get 3 stars on all campaign levels.', icon: '⭐' },
            { id: 'overwhelming-force', name: 'Overwhelming Force', desc: 'Send 50 fleets in a single game.', icon: '🌊' },
            { id: 'david-goliath', name: 'David vs Goliath', desc: 'Capture a planet with 100+ defenders using 10 or fewer ships.', icon: '🪨' },
            { id: 'plague-master', name: 'Plague Master', desc: 'Use plague power-up 10 times.', icon: '☠️' },
            { id: 'secret-keeper', name: 'Secret Keeper', desc: 'Unlock the secret Neon theme.', icon: '🌈' }
        ],
        unlocked: new Set(),
        stats: { totalCaptures: 0, plagueUses: 0 },
        lostAHive: false,
        fleetsThisGame: 0,

        init() {
            try {
                const saved = GameStorage.getItem('swarmwars_achievements');
                if (saved) this.unlocked = new Set(JSON.parse(saved));
            } catch (e) {}
            try {
                const savedStats = GameStorage.getItem('swarmwars_stats');
                if (savedStats) Object.assign(this.stats, JSON.parse(savedStats));
            } catch (e) {}
        },

        resetGameState() {
            this.lostAHive = false;
            this.fleetsThisGame = 0;
        },

        saveStats() {
            try { GameStorage.setItem('swarmwars_stats', JSON.stringify(this.stats)); } catch (e) {}
        },

        unlock(id) {
            if (this.unlocked.has(id)) return;
            this.unlocked.add(id);
            try {
                const data = {};
                this.unlocked.forEach(uid => { data[uid] = data[uid] || Date.now(); });
                // Merge with existing dates
                try {
                    const existing = JSON.parse(GameStorage.getItem('swarmwars_achievement_dates') || '{}');
                    Object.assign(data, existing);
                    data[id] = Date.now();
                    GameStorage.setItem('swarmwars_achievement_dates', JSON.stringify(data));
                } catch (e) {}
                GameStorage.setItem('swarmwars_achievements', JSON.stringify([...this.unlocked]));
            } catch (e) {}
            const ach = this.achievements.find(a => a.id === id);
            if (ach) this.showToast(ach);
        },

        showToast(achievement) {
            const toast = document.getElementById('achievement-toast');
            if (!toast) return;
            toast.innerHTML = '<span class="toast-icon">' + achievement.icon + '</span>' +
                '<span class="toast-text"><span class="toast-label">Achievement Unlocked</span>' +
                '<span class="toast-name">' + achievement.name + '</span></span>';
            toast.classList.remove('hidden');
            // Force reflow for animation
            toast.offsetHeight;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.classList.add('hidden'), 400);
            }, 3000);
        },

        check(won) {
            if (game && game.spectatorMode) return;

            // first-blood
            if (won) this.unlock('first-blood');

            // untouchable
            if (won && !this.lostAHive) this.unlock('untouchable');

            // speed-demon
            if (won && settings.difficulty === 'impossible' && gameTimer < 120) {
                this.unlock('speed-demon');
            }

            // conqueror
            if (this.stats.totalCaptures >= 1000) this.unlock('conqueror');

            // overwhelming-force
            if (this.fleetsThisGame >= 50) this.unlock('overwhelming-force');

            // plague-master
            if (this.stats.plagueUses >= 10) this.unlock('plague-master');

            // campaign-based achievements (use cached progress)
            try {
                const campaign = cachedCampaignProgress || JSON.parse(GameStorage.getItem('swarmwars_campaign') || '{}');
                const levels = campaign.levels || campaign;
                // swarm-lord: all 20 levels completed
                let allComplete = true;
                let allThreeStars = true;
                for (let i = 1; i <= 20; i++) {
                    const lvl = levels[i] || levels[String(i)];
                    if (!lvl || !lvl.completed) { allComplete = false; allThreeStars = false; break; }
                    if (!lvl.stars || lvl.stars < 3) allThreeStars = false;
                }
                if (allComplete) this.unlock('swarm-lord');
                if (allThreeStars) this.unlock('perfectionist');
                // secret-keeper: level 20 completed
                const lvl20 = levels[20] || levels['20'];
                if (lvl20 && lvl20.completed) this.unlock('secret-keeper');
            } catch (e) {}
        },

        onCapture(owner, planet) {
            if (owner === 'player') {
                this.stats.totalCaptures++;
                this.saveStats();
                if (this.stats.totalCaptures >= 1000) this.unlock('conqueror');
            } else {
                // Player lost a planet
                this.lostAHive = true;
            }
        },

        onFleetSend() {
            this.fleetsThisGame++;
        },

        onCombatCapture(fleet, planet, previousShipCount) {
            if (fleet.owner === 'player' && fleet.shipCount <= 10 && previousShipCount >= 100) {
                this.unlock('david-goliath');
            }
        },

        renderPanel() {
            const grid = document.getElementById('achievements-grid');
            if (!grid) return;
            grid.textContent = '';
            let dates = {};
            try { dates = JSON.parse(GameStorage.getItem('swarmwars_achievement_dates') || '{}'); } catch (e) {}

            this.achievements.forEach(ach => {
                const isUnlocked = this.unlocked.has(ach.id);
                const card = document.createElement('div');
                card.className = 'achievement-card ' + (isUnlocked ? 'unlocked' : 'locked');

                const icon = document.createElement('div');
                icon.className = 'ach-icon';
                icon.textContent = isUnlocked ? ach.icon : '🔒';

                const name = document.createElement('div');
                name.className = 'ach-name';
                name.textContent = isUnlocked ? ach.name : '???';

                const tooltip = document.createElement('div');
                tooltip.className = 'ach-tooltip';

                const tipName = document.createElement('div');
                tipName.className = 'ach-tip-name';
                tipName.textContent = isUnlocked ? ach.name : '???';

                const tipDesc = document.createElement('div');
                tipDesc.className = 'ach-tip-desc';
                tipDesc.textContent = isUnlocked ? ach.desc : 'Keep playing to unlock!';

                tooltip.appendChild(tipName);
                tooltip.appendChild(tipDesc);

                if (isUnlocked && dates[ach.id]) {
                    const tipDate = document.createElement('div');
                    tipDate.className = 'ach-tip-date';
                    tipDate.textContent = 'Unlocked ' + new Date(dates[ach.id]).toLocaleDateString();
                    tooltip.appendChild(tipDate);
                }

                card.appendChild(tooltip);
                card.appendChild(icon);
                card.appendChild(name);
                grid.appendChild(card);
            });
        }
    };

    AchievementManager.init();

    // Achievements button
    const achievementsBtn = document.getElementById('achievements-btn');
    const achievementsScreen = document.getElementById('achievements-screen');
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', () => {
            SoundManager.play('select');
            AchievementManager.renderPanel();
            achievementsScreen.classList.remove('hidden');
        });
    }
    const achievementsBackBtn = document.getElementById('achievements-back-btn');
    if (achievementsBackBtn) {
        achievementsBackBtn.addEventListener('click', () => {
            SoundManager.play('select');
            achievementsScreen.classList.add('hidden');
        });
    }

    // ========================
    // THEME SYSTEM
    // ========================
    function applyTheme(themeId) {
        const theme = typeof getTheme === 'function' ? getTheme(themeId) : (window.getTheme ? window.getTheme(themeId) : null);
        if (!theme) return;

        // Cache theme for HUD use
        cachedTheme = theme;
        cachedThemeId = themeId;

        // Apply CSS vars
        const root = document.documentElement;
        if (theme.cssVars) {
            for (const [prop, val] of Object.entries(theme.cssVars)) {
                root.style.setProperty(prop, val);
            }
        }

        // Update menu background gradients based on theme
        const menuEl = document.getElementById('menu-screen');
        if (menuEl) {
            if (themeId === 'space') {
                menuEl.style.backgroundImage = [
                    'radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    'radial-gradient(1.5px 1.5px at 25% 65%, rgba(79,195,247,0.3) 50%, transparent 100%)',
                    'radial-gradient(1px 1px at 42% 28%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 58% 82%, rgba(179,157,219,0.25) 50%, transparent 100%)',
                    'radial-gradient(1px 1px at 73% 12%, rgba(255,107,138,0.3) 50%, transparent 100%)',
                    'radial-gradient(1.5px 1.5px at 85% 45%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                    'radial-gradient(1px 1px at 92% 70%, rgba(79,195,247,0.25) 50%, transparent 100%)',
                    'radial-gradient(1px 1px at 15% 90%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 50% 50%, rgba(255,179,71,0.2) 50%, transparent 100%)',
                    'radial-gradient(1px 1px at 35% 42%, rgba(255,255,255,0.3) 50%, transparent 100%)'
                ].join(',');
            } else if (themeId === 'ant-colony') {
                menuEl.style.backgroundImage = [
                    'radial-gradient(3px 3px at 10% 15%, rgba(124,179,66,0.5) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 25% 65%, rgba(255,179,71,0.45) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 42% 28%, rgba(124,179,66,0.4) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 58% 82%, rgba(139,115,85,0.3) 50%, transparent 100%)',
                    'radial-gradient(4px 4px at 73% 12%, rgba(255,179,71,0.5) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 85% 45%, rgba(124,179,66,0.35) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 92% 70%, rgba(255,179,71,0.4) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 15% 90%, rgba(124,179,66,0.3) 50%, transparent 100%)'
                ].join(',');
            } else if (themeId === 'bee-swarm') {
                menuEl.style.backgroundImage = [
                    'radial-gradient(3px 3px at 10% 15%, rgba(255,160,0,0.4) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 25% 65%, rgba(255,224,130,0.5) 50%, transparent 100%)',
                    'radial-gradient(4px 4px at 42% 28%, rgba(255,160,0,0.35) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 58% 82%, rgba(255,245,157,0.4) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 73% 12%, rgba(255,160,0,0.45) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 85% 45%, rgba(255,224,130,0.3) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 92% 70%, rgba(255,160,0,0.35) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 15% 90%, rgba(255,245,157,0.3) 50%, transparent 100%)'
                ].join(',');
            } else if (themeId === 'medieval') {
                menuEl.style.backgroundImage = [
                    'radial-gradient(2px 2px at 10% 15%, rgba(198,40,40,0.3) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 25% 65%, rgba(141,110,99,0.25) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 42% 28%, rgba(198,40,40,0.25) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 58% 82%, rgba(161,136,127,0.2) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 73% 12%, rgba(198,40,40,0.3) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 85% 45%, rgba(141,110,99,0.2) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 92% 70%, rgba(198,40,40,0.2) 50%, transparent 100%)',
                    'radial-gradient(3px 3px at 15% 90%, rgba(161,136,127,0.25) 50%, transparent 100%)'
                ].join(',');
            } else if (themeId === 'neon') {
                menuEl.style.backgroundImage = [
                    'radial-gradient(2px 2px at 10% 15%, rgba(0,255,136,0.3) 50%, transparent 100%)',
                    'radial-gradient(1.5px 1.5px at 25% 65%, rgba(255,0,102,0.25) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 42% 28%, rgba(0,204,255,0.25) 50%, transparent 100%)',
                    'radial-gradient(1.5px 1.5px at 58% 82%, rgba(0,255,136,0.2) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 73% 12%, rgba(255,0,102,0.3) 50%, transparent 100%)',
                    'radial-gradient(1.5px 1.5px at 85% 45%, rgba(0,204,255,0.2) 50%, transparent 100%)',
                    'radial-gradient(2px 2px at 92% 70%, rgba(0,255,136,0.25) 50%, transparent 100%)',
                    'radial-gradient(1.5px 1.5px at 15% 90%, rgba(255,102,0,0.2) 50%, transparent 100%)'
                ].join(',');
            }
        }

        // Update labels
        const titleEl = document.getElementById('game-title');
        const accentEl = document.getElementById('game-title-accent');
        const taglineEl = document.getElementById('game-tagline');
        const startBtnEl = document.getElementById('start-btn');
        if (titleEl && theme.labels) {
            titleEl.childNodes[0].textContent = theme.labels.title;
            if (accentEl) accentEl.textContent = theme.labels.titleAccent;
        }
        if (taglineEl && theme.labels) taglineEl.textContent = theme.labels.tagline;
        if (startBtnEl && theme.labels) startBtnEl.textContent = theme.labels.startBtn;

        // Update HUD labels
        const labelPlanets = document.getElementById('label-planets');
        const labelShips = document.getElementById('label-ships');
        if (labelPlanets && theme.labels) labelPlanets.textContent = theme.labels.planet;
        if (labelShips && theme.labels) labelShips.textContent = theme.labels.ship;

        // Update game instance if already exists
        if (game && game.setTheme) game.setTheme(themeId);
    }

    // Apply default theme on load
    applyTheme(settings.theme);
    // Update theme buttons with lock state
    updateThemeButtons();
    // Check for theme unlocks on load
    checkThemeUnlocks();

    // ========================
    // MENU HANDLING
    // ========================
    document.querySelectorAll('.button-group').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                const value = btn.dataset.value;
                const groupId = group.id;
                if (groupId === 'difficulty-select') {
                    settings.difficulty = value;
                } else if (groupId === 'opponents-select') {
                    settings.opponents = parseInt(value, 10);
                } else if (groupId === 'mapsize-select') {
                    settings.mapSize = value;
                } else if (groupId === 'mode-select') {
                    settings.mode = value;
                    // In spectate mode, need at least 2 opponents
                    if (value === 'spectate' && settings.opponents < 2) {
                        settings.opponents = 2;
                        const opGroup = document.getElementById('opponents-select');
                        opGroup.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                        opGroup.querySelector('[data-value="2"]').classList.add('selected');
                    }
                } else if (groupId === 'theme-select') {
                    settings.theme = value;
                    applyTheme(value);
                }
            });
        });
    });

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            SoundManager.init();
            SoundManager.play('select');
            activeCampaignLevel = null;
            menuScreen.classList.add('hidden');
            canvas.classList.remove('hidden');
            hud.classList.remove('hidden');
            startGame();
        });
    }

    // Campaign button
    const campaignBtn = document.getElementById('campaign-btn');
    if (campaignBtn) {
        campaignBtn.addEventListener('click', () => {
            SoundManager.init();
            SoundManager.play('select');
            showCampaignScreen();
        });
    }

    // Campaign back button
    const campaignBackBtn = document.getElementById('campaign-back-to-menu');
    if (campaignBackBtn) {
        campaignBackBtn.addEventListener('click', () => {
            SoundManager.play('select');
            hideCampaignScreen();
        });
    }

    // ========================
    // GAME INITIALIZATION
    // ========================
    function getNumPlanets() {
        const area = window.innerWidth * window.innerHeight;
        const isDesktop = window.innerWidth >= 1024;
        const aiBonusPlanets = settings.opponents * 3;
        let result;

        if (isDesktop) {
            switch (settings.mapSize) {
                case 'small':  result = Math.max(15, Math.floor(area / 120000) + aiBonusPlanets); break;
                case 'large':  result = Math.max(30, Math.floor(area / 45000) + aiBonusPlanets); break;
                default:       result = Math.max(20, Math.floor(area / 65000) + aiBonusPlanets); break;
            }
        } else {
            switch (settings.mapSize) {
                case 'small':  result = 8 + aiBonusPlanets; break;
                case 'large':  result = 22 + aiBonusPlanets; break;
                default:       result = 14 + aiBonusPlanets; break;
            }
        }
        return result;
    }

    function startGame() {
        if (game) {
            game.stop();
        }
        gameTimer = 0;
        gameSpeed = 1;
        gameOverShown = false;
        AchievementManager.resetGameState();

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        game = new Game(canvas, settings.theme);

        // Wire up callbacks
        game.onCapture = (owner, planet) => {
            if (owner === 'player') {
                SoundManager.play('capture');
            } else {
                SoundManager.play('explode');
            }
            AchievementManager.onCapture(owner, planet);
        };

        game.onFleetSend = (fleet) => {
            SoundManager.play('send');
            AchievementManager.onFleetSend();
        };

        game.onGameOver = (won) => {
            if (game.spectatorMode) {
                SoundManager.play('victory');
            } else if (won) {
                SoundManager.play('victory');
            } else {
                SoundManager.play('defeat');
            }
            AchievementManager.check(won);
            showGameOver(won);
        };

        game.onSelect = (planet) => {
            SoundManager.play('select');
        };

        game.onCombatCapture = (fleet, planet, previousShipCount) => {
            AchievementManager.onCombatCapture(fleet, planet, previousShipCount);
        };

        const isSpectate = settings.mode === 'spectate';
        const numAIs = isSpectate ? Math.max(2, settings.opponents) : settings.opponents;
        const numPlanets = getNumPlanets();
        game.spectatorMode = isSpectate;
        game.generateMap(numPlanets, numAIs, settings.difficulty, isSpectate);

        // Add power-up planets on large freeplay maps
        if (settings.mapSize === 'large') {
            game.addPowerUpPlanets(5);
        }

        game.start();

        // Reset AI panel elements and cache campaign progress
        aiPanelEls = [];
        hudTickCount = 0;
        try { cachedCampaignProgress = JSON.parse(GameStorage.getItem('swarmwars_campaign') || '{}'); } catch (e) { cachedCampaignProgress = null; }

        // Ensure theme cache is warm
        if (cachedThemeId !== settings.theme) {
            cachedTheme = window.getTheme ? window.getTheme(settings.theme) : null;
            cachedThemeId = settings.theme;
        }

        // HUD update interval
        if (hudUpdateInterval) clearInterval(hudUpdateInterval);
        hudUpdateInterval = setInterval(updateHUD, 200);

        // Game timer
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (game && game.state === 'playing') {
                gameTimer++;
            }
        }, 1000);

        // Update speed button text
        if (cachedEls.speedBtn) cachedEls.speedBtn.textContent = '⏩ 1x';

        // Hide campaign objective in freeplay
        if (cachedEls.campaignObjective) cachedEls.campaignObjective.style.display = 'none';

        // Hide overlays
        gameoverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');

        updateHUD();

        // CrazyGames SDK: signal gameplay start
        try {
            const sdk = getCrazySDK();
            if (sdk && sdk.game && sdk.game.gameplayStart) sdk.game.gameplayStart();
        } catch (e) { console.warn('CrazyGames SDK error:', e); }
    }

    // ========================
    // HUD UPDATES
    // ========================
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateHUD() {
        if (!game) return;

        const playerInfo = game.getPlayerInfo();

        // Player info updates every tick (cheap textContent updates)
        if (cachedEls.playerPlanets) cachedEls.playerPlanets.textContent = playerInfo.planets;
        if (cachedEls.playerShips) cachedEls.playerShips.textContent = playerInfo.ships;
        if (cachedEls.gameTimer) {
            if (activeCampaignLevel && activeCampaignLevel.timeLimit &&
                (activeCampaignLevel.winCondition === 'time-trial' || activeCampaignLevel.winCondition === 'survive')) {
                const remaining = Math.max(0, Math.ceil(activeCampaignLevel.timeLimit - (game ? game.campaignTimer : 0)));
                cachedEls.gameTimer.textContent = '⏱ ' + formatTime(remaining);
                if (remaining <= 10) {
                    cachedEls.gameTimer.classList.add('timer-urgent', 'timer-critical');
                } else if (remaining <= 30) {
                    cachedEls.gameTimer.classList.add('timer-urgent');
                    cachedEls.gameTimer.classList.remove('timer-critical');
                } else {
                    cachedEls.gameTimer.classList.remove('timer-urgent', 'timer-critical');
                }
            } else {
                cachedEls.gameTimer.textContent = formatTime(gameTimer);
                cachedEls.gameTimer.classList.remove('timer-urgent', 'timer-critical');
            }
        }

        // AI info panel: throttle to every ~500ms (every 2-3 ticks at 200ms interval)
        hudTickCount++;
        const aiInfoEl = cachedEls.aiInfo;
        if (aiInfoEl && (hudTickCount - lastAiUpdateTick >= 2)) {
            lastAiUpdateTick = hudTickCount;
            const aiInfo = game.getAIInfo();
            const theme = cachedTheme;
            const pIcon = (theme && theme.labels && theme.labels.planetIcon) || '☾';
            const sIcon = (theme && theme.labels && theme.labels.shipIcon) || '✈';

            // Build AI panel elements once, then reuse
            if (aiPanelEls.length !== aiInfo.length) {
                aiInfoEl.textContent = '';
                aiPanelEls = [];
                aiInfo.forEach(ai => {
                    const div = document.createElement('div');
                    div.className = 'ai-status';

                    const dot = document.createElement('span');
                    dot.className = 'ai-dot';
                    dot.style.background = ai.color;

                    const planets = document.createElement('span');
                    planets.className = 'ai-planets';
                    planets.textContent = ai.planets + ' ' + pIcon;

                    const ships = document.createElement('span');
                    ships.className = 'ai-ships';
                    ships.textContent = ' ' + ai.ships + ' ' + sIcon;

                    div.appendChild(dot);
                    div.appendChild(planets);
                    div.appendChild(ships);
                    aiInfoEl.appendChild(div);

                    aiPanelEls.push({ dot, planets, ships });
                });
            } else {
                // Reuse existing elements — only update textContent
                aiInfo.forEach((ai, i) => {
                    const els = aiPanelEls[i];
                    els.dot.style.background = ai.color;
                    els.planets.textContent = ai.planets + ' ' + pIcon;
                    els.ships.textContent = ' ' + ai.ships + ' ' + sIcon;
                });
            }
        }

        // Check tutorial hints
        checkHints();

        // Check game state
        if (game.spectatorMode) {
            if (game.state === 'won' || game.state === 'lost') {
                showGameOver(true);
            }
        } else {
            if (game.state === 'won') {
                showGameOver(true);
            } else if (game.state === 'lost') {
                showGameOver(false);
            }
        }
    }

    // ========================
    // GAME OVER
    // ========================
    let gameOverShown = false;

    function showGameOver(won) {
        if (gameOverShown) return;
        gameOverShown = true;

        if (hudUpdateInterval) {
            clearInterval(hudUpdateInterval);
            hudUpdateInterval = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Show overlay FIRST before any SDK calls
        gameoverScreen.classList.remove('hidden');

        // CrazyGames SDK: signal gameplay stop + happytime on victory
        try {
            const sdk = getCrazySDK();
            if (sdk && sdk.game) {
                if (sdk.game.gameplayStop) sdk.game.gameplayStop();
                if (won && sdk.game.happytime) sdk.game.happytime();
            }
        } catch (e) {
            console.warn('CrazyGames SDK error:', e);
        }

        const titleEl = cachedEls.gameoverTitle;
        const subtitleEl = cachedEls.gameoverSubtitle;
        const statsEl = cachedEls.gameoverStats;

        if (game && game.spectatorMode) {
            // Find the winner — the AI that owns all non-neutral planets
            const winner = game.getWinner();
            if (titleEl) {
                titleEl.textContent = 'GAME OVER';
                titleEl.className = 'victory';
            }
            if (subtitleEl) {
                subtitleEl.textContent = winner
                    ? winner.replace('ai', 'AI ') + ' won the war!'
                    : 'The battle has ended!';
            }
        } else {
            if (titleEl) {
                titleEl.textContent = won ? 'VICTORY' : 'DEFEAT';
                titleEl.className = won ? 'victory' : 'defeat';
            }
            if (subtitleEl) {
                subtitleEl.textContent = won
                    ? 'You won the war!'
                    : 'Your swarm has fallen.';
            }
        }

        const stats = game ? game.stats : { planetsCaptured: 0, fleetsSent: 0, shipsSent: 0 };
        if (statsEl) {
            statsEl.textContent = '';
            const rows = [
                ['Time', formatTime(gameTimer)],
                ['Planets Captured', stats.planetsCaptured || 0],
                ['Fleets Sent', stats.fleetsSent || 0],
                ['Ships Sent', stats.shipsSent || 0]
            ];
            rows.forEach(([label, value]) => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                const l = document.createElement('span');
                l.textContent = label;
                const v = document.createElement('span');
                v.textContent = value;
                row.appendChild(l);
                row.appendChild(v);
                statsEl.appendChild(row);
            });
        }

        // (Leaderboard removed)

        // Hide campaign buttons in freeplay
        const nextBtn = document.getElementById('campaign-next-btn');
        const campBtn = document.getElementById('campaign-back-btn');
        if (nextBtn) nextBtn.style.display = 'none';
        if (campBtn) campBtn.style.display = 'none';
        const playAgain = document.getElementById('playagain-btn');
        if (playAgain) playAgain.textContent = 'Play Again';
    }

    const playAgainBtn = document.getElementById('playagain-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            SoundManager.play('select');
            gameoverScreen.classList.add('hidden');
            if (activeCampaignLevel) {
                startCampaignGame(activeCampaignLevel);
            } else {
                startGame();
            }
        });
    }

    const mainMenuBtn = document.getElementById('backtomenu-btn');
    if (mainMenuBtn) {
        mainMenuBtn.addEventListener('click', () => {
            SoundManager.play('select');
            goToMenu();
        });
    }

    function goToMenu() {
        if (game) {
            game.stop();
            game = null;
        }
        if (hudUpdateInterval) { clearInterval(hudUpdateInterval); hudUpdateInterval = null; }
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        clearHintState();
        activeCampaignLevel = null;

        gameoverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        hud.classList.add('hidden');
        canvas.classList.add('hidden');
        const campaignScreen = document.getElementById('campaign-screen');
        if (campaignScreen) campaignScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
        updateThemeButtons();
    }

    // ========================
    // PAUSE
    // ========================
    function togglePause() {
        if (!game || game.state === 'won' || game.state === 'lost') return;

        if (game.state === 'paused') {
            resumeGame();
        } else if (game.state === 'playing') {
            pauseGame();
        }
    }

    function pauseGame() {
        if (!game || game.state !== 'playing') return;
        game.pause();
        pauseScreen.classList.remove('hidden');
        try {
            const sdk = getCrazySDK();
            if (sdk && sdk.game && sdk.game.gameplayStop) sdk.game.gameplayStop();
        } catch (e) { console.warn('CrazyGames SDK error:', e); }
    }

    function resumeGame() {
        if (!game || game.state !== 'paused') return;
        game.resume();
        pauseScreen.classList.add('hidden');
        try {
            const sdk = getCrazySDK();
            if (sdk && sdk.game && sdk.game.gameplayStart) sdk.game.gameplayStart();
        } catch (e) { console.warn('CrazyGames SDK error:', e); }
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            SoundManager.play('select');
            togglePause();
        });
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            SoundManager.play('select');
            resumeGame();
        });
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            SoundManager.play('select');
            pauseScreen.classList.add('hidden');
            startGame();
        });
    }

    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            SoundManager.play('select');
            goToMenu();
        });
    }

    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            SoundManager.play('select');
            pauseGame();
        });
    }

    // ========================
    // SPEED CONTROL
    // ========================
    const speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            SoundManager.play('select');
            if (gameSpeed === 1) {
                gameSpeed = 2;
            } else if (gameSpeed === 2) {
                gameSpeed = 3;
            } else {
                gameSpeed = 1;
            }
            if (game) game.speed = gameSpeed;
            speedBtn.textContent = '⏩ ' + gameSpeed + 'x';
        });
    }

    // ========================
    // MUTE BUTTON
    // ========================
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        // Set initial state
        if (GameStorage.getItem('swarmwars_muted') === 'true') {
            muteBtn.textContent = '🔇';
        }
        muteBtn.addEventListener('click', () => {
            SoundManager.toggleMute();
        });
    }

    // Hint close button
    const hintCloseBtn = document.getElementById('hint-close');
    if (hintCloseBtn) {
        hintCloseBtn.addEventListener('click', () => { dismissHint(); });
    }

    // ========================
    // CRAZYGAMES SDK INTEGRATION
    // ========================
    let crazySDKReady = false;

    function getCrazySDK() {
        return crazySDKReady && window.CrazyGames && window.CrazyGames.SDK ? window.CrazyGames.SDK : null;
    }

    // Properly initialize SDK v3 with await init()
    async function initCrazyGamesSDK() {
        try {
            if (!window.CrazyGames || !window.CrazyGames.SDK) return;
            await window.CrazyGames.SDK.init();
            crazySDKReady = true;

            // Sync localStorage data with cloud storage
            try {
                const sdk = window.CrazyGames.SDK;
                if (sdk.data) {
                    const keys = ['swarmwars_campaign', 'swarmwars_unlocked_themes', 'swarmwars_achievements',
                                   'swarmwars_stats', 'swarmwars_achievement_dates', 'swarmwars_muted'];
                    for (const key of keys) {
                        const cloudVal = sdk.data.getItem(key);
                        const localVal = localStorage.getItem(key);
                        if (cloudVal && !localVal) {
                            localStorage.setItem(key, cloudVal);
                        } else if (localVal && !cloudVal) {
                            sdk.data.setItem(key, localVal);
                        }
                        if (cloudVal && localVal && key === 'swarmwars_campaign') {
                            try {
                                const cloud = JSON.parse(cloudVal);
                                const local = JSON.parse(localVal);
                                const merged = { levels: { ...(cloud.levels || {}), ...(local.levels || {}) } };
                                for (const [id, data] of Object.entries(merged.levels)) {
                                    const cl = (cloud.levels || {})[id];
                                    const ll = (local.levels || {})[id];
                                    if (cl && ll) {
                                        merged.levels[id] = {
                                            completed: cl.completed || ll.completed,
                                            stars: Math.max(cl.stars || 0, ll.stars || 0),
                                            bestTime: Math.min(cl.bestTime || 9999, ll.bestTime || 9999)
                                        };
                                    }
                                }
                                const mergedStr = JSON.stringify(merged);
                                sdk.data.setItem(key, mergedStr);
                                localStorage.setItem(key, mergedStr);
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) {
                console.warn('Cloud sync error:', e);
            }

            // Check mute setting
            const sdk = window.CrazyGames.SDK;
            if (sdk.game && sdk.game.settings && sdk.game.settings.muteAudio) {
                SoundManager.setMuted(true);
            }

            // Register settings change listener
            if (sdk.game && sdk.game.addSettingsChangeListener) {
                sdk.game.addSettingsChangeListener((newSettings) => {
                    if (newSettings.muteAudio !== undefined) {
                        SoundManager.setMuted(newSettings.muteAudio);
                    }
                });
            }

            // Signal loading complete
            if (sdk.game && sdk.game.loadingStop) sdk.game.loadingStop();
        } catch (e) {
            // Not on CrazyGames domain — harmless
            console.log('CrazyGames SDK init skipped:', e.message || e);
        }
    }

    // Wait for SDK script to load, then initialize
    function waitForSDKAndInit() {
        if (window.CrazyGames && window.CrazyGames.SDK) {
            initCrazyGamesSDK();
        } else {
            // SDK script loaded async, retry briefly
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (window.CrazyGames && window.CrazyGames.SDK) {
                    clearInterval(interval);
                    initCrazyGamesSDK();
                } else if (attempts > 20) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }
    waitForSDKAndInit();

    // ========================
    // KEYBOARD SHORTCUTS
    // ========================
    document.addEventListener('keydown', (e) => {
        if (!game) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePause();
                break;
            case 'Escape':
                if (game.state === 'paused') {
                    resumeGame();
                }
                // Deselect is handled in game.js
                break;
            case 'KeyR':
                if (e.ctrlKey || e.metaKey) return; // Don't capture browser refresh
                e.preventDefault();
                if (game.state === 'paused') {
                    pauseScreen.classList.add('hidden');
                }
                startGame();
                break;
            case 'KeyA':
                if (e.ctrlKey || e.metaKey) return; // Don't capture browser select-all
                if (game.state === 'playing') {
                    e.preventDefault();
                    game.selectAllPlayerPlanets();
                }
                break;
        }
    });

    // ========================
    // CANVAS EVENTS
    // ========================
    canvas.addEventListener('mousedown', (e) => {
        if (!game || game.state !== 'playing') return;
        if (e.button === 0) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            game.startDrag(x, y);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!game || game.state !== 'playing') return;
        if (e.button === 0) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const wasDrag = game.endDrag(x, y, e.ctrlKey || e.metaKey);
            if (!wasDrag) {
                // Normal click
                game.handleClick(x, y, e.shiftKey, e.ctrlKey || e.metaKey);
            }
        }
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!game || game.state !== 'playing') return;
        game.handleRightClick();
    });

    canvas.addEventListener('dblclick', (e) => {
        if (!game || game.state !== 'playing') return;
        if (e.button === 0) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            game.handleDoubleClick(x, y);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!game || game.state !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        game.handleMouseMove(x, y);
        game.updateDrag(x, y);
    });

    // ========================
    // WINDOW RESIZE
    // ========================
    let resizeTimer = null;
    function handleResize() {
        if (!canvas.classList.contains('hidden')) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (game) {
                game.resize(canvas.width, canvas.height);
            }
        }
    }
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 100);
    });

    // ========================
});
