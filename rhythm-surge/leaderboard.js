// ============================================================================
// Leaderboard System — localStorage + optional Firebase Firestore
// Shared module for Galaxy Conquest & Rhythm Surge
// ============================================================================

const Leaderboard = (function () {
    'use strict';

    const MAX_ENTRIES = 50;
    let db = null; // Firestore reference
    let firebaseReady = false;

    // --- Firebase init (optional) ---
    function initFirebase() {
        if (firebaseReady) return true;
        try {
            if (typeof firebase !== 'undefined' &&
                typeof FIREBASE_CONFIG !== 'undefined' &&
                FIREBASE_CONFIG.projectId &&
                FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
                firebase.initializeApp(FIREBASE_CONFIG);
                db = firebase.firestore();
                firebaseReady = true;
                return true;
            }
        } catch (e) {
            console.warn('Firebase init failed, using local leaderboard:', e);
        }
        return false;
    }

    // --- localStorage helpers ---
    function getLocal(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) { return []; }
    }

    function setLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { /* quota exceeded — silently fail */ }
    }

    // --- Saved player name ---
    function getSavedName() {
        try { return localStorage.getItem('lb_player_name') || ''; }
        catch (e) { return ''; }
    }

    function saveName(name) {
        try { localStorage.setItem('lb_player_name', name); }
        catch (e) { /* ignore */ }
    }

    // --- Core API ---

    /**
     * Submit a score entry.
     * @param {string} collection  e.g. 'gc_scores' or 'rs_scores_neon_pulse'
     * @param {object} entry       { name, ... } — varies per game
     * @param {string} sortField   field to sort by
     * @param {string} sortDir     'asc' (lower is better) or 'desc' (higher is better)
     */
    function submit(collection, entry, sortField, sortDir) {
        entry.date = new Date().toISOString();

        // Always save locally
        var local = getLocal(collection);
        local.push(entry);
        local.sort(function (a, b) {
            return sortDir === 'asc' ? a[sortField] - b[sortField] : b[sortField] - a[sortField];
        });
        if (local.length > MAX_ENTRIES) local.length = MAX_ENTRIES;
        setLocal(collection, local);

        // Also push to Firebase if available
        if (initFirebase() && db) {
            db.collection(collection).add(entry).catch(function () {});
        }
    }

    /**
     * Get top scores.
     * @param {string}   collection
     * @param {string}   sortField
     * @param {string}   sortDir
     * @param {number}   limit
     * @param {function} callback  (entries) => void
     */
    function getTop(collection, sortField, sortDir, limit, callback) {
        limit = limit || 10;

        // Try Firebase first
        if (initFirebase() && db) {
            db.collection(collection)
                .orderBy(sortField, sortDir)
                .limit(limit)
                .get()
                .then(function (snap) {
                    var entries = [];
                    snap.forEach(function (doc) { entries.push(doc.data()); });
                    callback(entries);
                })
                .catch(function () {
                    // Fallback to local
                    callback(getLocalTop(collection, sortField, sortDir, limit));
                });
        } else {
            callback(getLocalTop(collection, sortField, sortDir, limit));
        }
    }

    function getLocalTop(collection, sortField, sortDir, limit) {
        var local = getLocal(collection);
        local.sort(function (a, b) {
            return sortDir === 'asc' ? a[sortField] - b[sortField] : b[sortField] - a[sortField];
        });
        return local.slice(0, limit);
    }

    /**
     * Get personal best for a player.
     */
    function getPersonalBest(collection, playerName, sortField, sortDir) {
        var local = getLocal(collection);
        var mine = local.filter(function (e) { return e.name === playerName; });
        if (mine.length === 0) return null;
        mine.sort(function (a, b) {
            return sortDir === 'asc' ? a[sortField] - b[sortField] : b[sortField] - a[sortField];
        });
        return mine[0];
    }

    /**
     * Check if a score qualifies for the leaderboard.
     */
    function qualifies(collection, value, sortField, sortDir) {
        var local = getLocal(collection);
        if (local.length < MAX_ENTRIES) return true;
        var worst = local[local.length - 1];
        if (!worst) return true;
        return sortDir === 'asc' ? value < worst[sortField] : value > worst[sortField];
    }

    // --- Name prompt UI ---
    function promptName(callback) {
        var saved = getSavedName();

        var overlay = document.createElement('div');
        overlay.className = 'lb-name-overlay';

        var box = document.createElement('div');
        box.className = 'lb-name-box';

        var title = document.createElement('h3');
        title.textContent = 'Enter Your Name';
        box.appendChild(title);

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'lb-name-input';
        input.maxLength = 16;
        input.value = saved;
        input.placeholder = 'Your name...';
        box.appendChild(input);

        var btnRow = document.createElement('div');
        btnRow.className = 'lb-name-btns';

        var submitBtn = document.createElement('button');
        submitBtn.className = 'lb-btn lb-btn-primary';
        submitBtn.textContent = 'Submit';
        submitBtn.addEventListener('click', function () {
            var name = input.value.trim().substring(0, 16);
            if (name) {
                saveName(name);
                overlay.remove();
                callback(name);
            } else {
                input.focus();
            }
        });
        btnRow.appendChild(submitBtn);

        var skipBtn = document.createElement('button');
        skipBtn.className = 'lb-btn lb-btn-secondary';
        skipBtn.textContent = 'Skip';
        skipBtn.addEventListener('click', function () {
            overlay.remove();
            callback(null);
        });
        btnRow.appendChild(skipBtn);

        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        setTimeout(function () { input.focus(); input.select(); }, 50);

        // Enter key submits
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitBtn.click();
        });
    }

    // --- Leaderboard table UI ---
    function renderTable(entries, columns, container) {
        container.textContent = '';

        if (entries.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'lb-empty';
            empty.textContent = 'No scores yet. Be the first!';
            container.appendChild(empty);
            return;
        }

        var table = document.createElement('table');
        table.className = 'lb-table';

        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        var rankTh = document.createElement('th');
        rankTh.textContent = '#';
        headerRow.appendChild(rankTh);
        columns.forEach(function (col) {
            var th = document.createElement('th');
            th.textContent = col.label;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        entries.forEach(function (entry, i) {
            var tr = document.createElement('tr');
            var rankTd = document.createElement('td');
            rankTd.className = 'lb-rank';
            rankTd.textContent = i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1);
            tr.appendChild(rankTd);

            columns.forEach(function (col) {
                var td = document.createElement('td');
                td.textContent = col.format ? col.format(entry[col.key], entry) : entry[col.key];
                if (col.cls) td.className = col.cls;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    return {
        submit: submit,
        getTop: getTop,
        getPersonalBest: getPersonalBest,
        qualifies: qualifies,
        promptName: promptName,
        renderTable: renderTable,
        getSavedName: getSavedName
    };
})();
