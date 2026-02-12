// ============================================================
// themes.js — Complete theme system for Swarm Wars RTS game
// Exposes: window.THEMES, window.getTheme(id), window.lightenColor(hex, amt)
// ============================================================

(function () {
  "use strict";

  // ----------------------------------------------------------
  //  Utility helpers
  // ----------------------------------------------------------

  function lightenColor(hex, amount) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ----------------------------------------------------------
  //  SPACE BACKGROUND
  // ----------------------------------------------------------

  function SpaceBackground(w, h) {
    this.w = w;
    this.h = h;
    this.stars = [];
    this.shootingStar = null;
    this.shootingTimer = 0;
    this._initStars();
  }

  SpaceBackground.prototype._initStars = function () {
    this.stars = [];
    var count = Math.floor((this.w * this.h) / 3000);
    for (var i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: Math.random() * 1.5 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: Math.random() * 0.5 + 0.5
      });
    }
  };

  SpaceBackground.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this._initStars();
  };

  SpaceBackground.prototype.draw = function (ctx, time) {
    // Stars
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var alpha = s.brightness * (0.6 + 0.4 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Shooting star
    this.shootingTimer -= 0.016;
    if (this.shootingTimer <= 0) {
      this.shootingStar = {
        x: Math.random() * this.w * 0.8,
        y: Math.random() * this.h * 0.4,
        vx: 4 + Math.random() * 4,
        vy: 2 + Math.random() * 2,
        life: 1,
        len: 40 + Math.random() * 40
      };
      this.shootingTimer = 5 + Math.random() * 10;
    }

    if (this.shootingStar && this.shootingStar.life > 0) {
      var ss = this.shootingStar;
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= 0.02;
      var grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * (ss.len / 5), ss.y - ss.vy * (ss.len / 5));
      grad.addColorStop(0, 'rgba(255,255,255,' + (ss.life * 0.8) + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * (ss.len / 5), ss.y - ss.vy * (ss.len / 5));
      ctx.stroke();
    }

    // Subtle nebula glow
    var nebGrad = ctx.createRadialGradient(this.w * 0.7, this.h * 0.3, 0, this.w * 0.7, this.h * 0.3, this.w * 0.4);
    nebGrad.addColorStop(0, 'rgba(60,20,80,0.06)');
    nebGrad.addColorStop(1, 'rgba(60,20,80,0)');
    ctx.fillStyle = nebGrad;
    ctx.fillRect(0, 0, this.w, this.h);
  };

  // ----------------------------------------------------------
  //  ANT COLONY BACKGROUND
  // ----------------------------------------------------------

  function AntColonyBackground(w, h) {
    this.w = w;
    this.h = h;
    this.pollen = [];
    this.flowers = [];
    this.grassBlades = [];
    this._init();
  }

  AntColonyBackground.prototype._init = function () {
    this.pollen = [];
    for (var i = 0; i < 25; i++) {
      this.pollen.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.2 - 0.05,
        drift: Math.random() * Math.PI * 2
      });
    }

    this.flowers = [];
    var flowerCount = Math.floor(this.w / 120);
    for (var i = 0; i < flowerCount; i++) {
      this.flowers.push({
        x: Math.random() * this.w,
        y: this.h - 10 - Math.random() * 30,
        size: 3 + Math.random() * 4,
        petalCount: Math.random() > 0.5 ? 5 : 4,
        color: ['#FFFFFF', '#FFEB3B', '#E8F5E9', '#FFF9C4'][Math.floor(Math.random() * 4)],
        phase: Math.random() * Math.PI * 2
      });
    }

    this.grassBlades = [];
    var grassCount = Math.floor(this.w / 15);
    for (var i = 0; i < grassCount; i++) {
      this.grassBlades.push({
        x: Math.random() * this.w,
        h: 8 + Math.random() * 18,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.8
      });
    }
  };

  AntColonyBackground.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this._init();
  };

  AntColonyBackground.prototype.draw = function (ctx, time) {
    // Ground strip
    ctx.fillStyle = '#E8E0D0';
    ctx.fillRect(0, this.h - 35, this.w, 35);
    ctx.fillStyle = '#D7CFC0';
    ctx.fillRect(0, this.h - 35, this.w, 3);

    // Grass blades
    ctx.strokeStyle = '#8BC34A';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (var i = 0; i < this.grassBlades.length; i++) {
      var g = this.grassBlades[i];
      var swayX = Math.sin(time * g.swaySpeed + g.sway) * 4;
      ctx.beginPath();
      ctx.moveTo(g.x, this.h - 35);
      ctx.quadraticCurveTo(g.x + swayX * 0.5, this.h - 35 - g.h * 0.5, g.x + swayX, this.h - 35 - g.h);
      ctx.stroke();
    }

    // Flowers
    for (var i = 0; i < this.flowers.length; i++) {
      var f = this.flowers[i];
      var bob = Math.sin(time * 0.8 + f.phase) * 1.5;
      // Stem
      ctx.strokeStyle = '#689F38';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x, f.y - f.size * 3 + bob);
      ctx.stroke();
      // Petals
      ctx.fillStyle = f.color;
      var cy = f.y - f.size * 3 + bob;
      for (var p = 0; p < f.petalCount; p++) {
        var angle = (p / f.petalCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + Math.cos(angle) * f.size * 0.7, cy + Math.sin(angle) * f.size * 0.7, f.size * 0.5, f.size * 0.3, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(f.x, cy, f.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating pollen
    for (var i = 0; i < this.pollen.length; i++) {
      var p = this.pollen[i];
      p.x += p.vx + Math.sin(time + p.drift) * 0.15;
      p.y += p.vy;
      if (p.y < -10) { p.y = this.h + 10; p.x = Math.random() * this.w; }
      if (p.x < -10) p.x = this.w + 10;
      if (p.x > this.w + 10) p.x = -10;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#FFF9C4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ----------------------------------------------------------
  //  BEE SWARM BACKGROUND
  // ----------------------------------------------------------

  function BeeSwarmBackground(w, h) {
    this.w = w;
    this.h = h;
    this.dandelions = [];
    this.wildflowers = [];
    this.clouds = [];
    this._init();
  }

  BeeSwarmBackground.prototype._init = function () {
    this.dandelions = [];
    for (var i = 0; i < 18; i++) {
      this.dandelions.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 1 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -Math.random() * 0.15 - 0.03,
        drift: Math.random() * Math.PI * 2,
        stemLen: 3 + Math.random() * 4
      });
    }

    this.wildflowers = [];
    var fCount = Math.floor(this.w / 80);
    for (var i = 0; i < fCount; i++) {
      this.wildflowers.push({
        x: Math.random() * this.w,
        y: this.h - 5 - Math.random() * 25,
        size: 3 + Math.random() * 3,
        color: ['#FF8F00', '#F57F17', '#FFD54F', '#FFF176', '#E65100'][Math.floor(Math.random() * 5)],
        phase: Math.random() * Math.PI * 2
      });
    }

    this.clouds = [];
    for (var i = 0; i < 4; i++) {
      this.clouds.push({
        x: Math.random() * this.w,
        y: 20 + Math.random() * this.h * 0.25,
        w: 60 + Math.random() * 80,
        h: 20 + Math.random() * 15,
        speed: 0.08 + Math.random() * 0.12
      });
    }
  };

  BeeSwarmBackground.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this._init();
  };

  BeeSwarmBackground.prototype.draw = function (ctx, time) {
    // Soft clouds
    for (var i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      c.x += c.speed;
      if (c.x > this.w + c.w) c.x = -c.w;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + c.w * 0.25, c.y - c.h * 0.15, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x - c.w * 0.2, c.y + c.h * 0.1, c.w * 0.3, c.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground meadow
    var grd = ctx.createLinearGradient(0, this.h - 40, 0, this.h);
    grd.addColorStop(0, '#C5E1A5');
    grd.addColorStop(1, '#AED581');
    ctx.fillStyle = grd;
    ctx.fillRect(0, this.h - 40, this.w, 40);

    // Wildflowers
    for (var i = 0; i < this.wildflowers.length; i++) {
      var f = this.wildflowers[i];
      var bob = Math.sin(time * 0.6 + f.phase) * 1;
      ctx.strokeStyle = '#689F38';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y + 5);
      ctx.lineTo(f.x, f.y - f.size * 2 + bob);
      ctx.stroke();
      ctx.fillStyle = f.color;
      for (var p = 0; p < 5; p++) {
        var ang = (p / 5) * Math.PI * 2 + time * 0.1;
        ctx.beginPath();
        ctx.ellipse(
          f.x + Math.cos(ang) * f.size * 0.5,
          f.y - f.size * 2 + bob + Math.sin(ang) * f.size * 0.5,
          f.size * 0.4, f.size * 0.2, ang, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.arc(f.x, f.y - f.size * 2 + bob, f.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dandelion seeds
    for (var i = 0; i < this.dandelions.length; i++) {
      var d = this.dandelions[i];
      d.x += d.vx + Math.sin(time * 0.7 + d.drift) * 0.1;
      d.y += d.vy;
      if (d.y < -15) { d.y = this.h + 15; d.x = Math.random() * this.w; }
      if (d.x < -15) d.x = this.w + 15;
      if (d.x > this.w + 15) d.x = -15;
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#BCAAA4';
      ctx.lineWidth = 0.5;
      // Tiny stem
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.stemLen);
      ctx.stroke();
      // Seed puff
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      // Wisp lines
      for (var j = 0; j < 5; j++) {
        var a = (j / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + Math.cos(a) * d.r * 2.5, d.y + Math.sin(a) * d.r * 2.5);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  // ----------------------------------------------------------
  //  MEDIEVAL BACKGROUND
  // ----------------------------------------------------------

  function MedievalBackground(w, h) {
    this.w = w;
    this.h = h;
    this.hills = [];
    this.pennants = [];
    this.birds = [];
    this._init();
  }

  MedievalBackground.prototype._init = function () {
    // Rolling hills
    this.hills = [];
    var hillCount = 5;
    for (var i = 0; i < hillCount; i++) {
      this.hills.push({
        cx: (i / (hillCount - 1)) * this.w,
        r: 100 + Math.random() * 120,
        shade: i % 2 === 0 ? '#D7CCC8' : '#CBBEAB'
      });
    }

    // Pennants
    this.pennants = [];
    for (var i = 0; i < 8; i++) {
      this.pennants.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * 0.4 + 10,
        color: ['#C62828', '#1565C0', '#2E7D32', '#F9A825'][Math.floor(Math.random() * 4)],
        size: 6 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.15,
        vx: (Math.random() - 0.5) * 0.2
      });
    }

    // Birds
    this.birds = [];
    for (var i = 0; i < 5; i++) {
      this.birds.push({
        x: Math.random() * this.w,
        y: 20 + Math.random() * this.h * 0.3,
        speed: 0.3 + Math.random() * 0.4,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 3 + Math.random() * 2
      });
    }
  };

  MedievalBackground.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this._init();
  };

  MedievalBackground.prototype.draw = function (ctx, time) {
    // Rolling hills silhouette at bottom
    for (var i = 0; i < this.hills.length; i++) {
      var h = this.hills[i];
      ctx.fillStyle = h.shade;
      ctx.beginPath();
      ctx.arc(h.cx, this.h + 30, h.r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Pennant flags floating
    for (var i = 0; i < this.pennants.length; i++) {
      var p = this.pennants[i];
      p.x += p.vx;
      if (p.x < -20) p.x = this.w + 20;
      if (p.x > this.w + 20) p.x = -20;
      var waveX = Math.sin(time * 2 + p.phase) * 3;
      ctx.globalAlpha = 0.3;
      // Pole
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.size * 2);
      ctx.stroke();
      // Flag triangle
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.size + waveX, p.y + p.size * 0.5);
      ctx.lineTo(p.x, p.y + p.size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Birds (simple V shapes)
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (var i = 0; i < this.birds.length; i++) {
      var b = this.birds[i];
      b.x += b.speed;
      if (b.x > this.w + 30) b.x = -30;
      var wing = Math.sin(time * b.wingSpeed + b.wingPhase) * 3;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(b.x - 5, b.y + wing);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x + 5, b.y + wing);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // ----------------------------------------------------------
  //  THEME 1: SPACE
  // ----------------------------------------------------------

  var THEME_SPACE = {
    id: 'space',
    name: 'Space Wars',
    emoji: '🚀',

    colors: {
      neutral: { planet: '#666666', ships: '#888888', glow: 'rgba(102,102,102,0.3)' },
      player:  { planet: '#4fc3f7', ships: '#81d4fa', glow: 'rgba(79,195,247,0.35)' },
      ai1:     { planet: '#ff6b8a', ships: '#ff8fa3', glow: 'rgba(255,107,138,0.35)' },
      ai2:     { planet: '#ffb347', ships: '#ffcc80', glow: 'rgba(255,179,71,0.35)' },
      ai3:     { planet: '#b39ddb', ships: '#ce93d8', glow: 'rgba(179,157,219,0.35)' }
    },

    bgColor: '#0a0a1a',
    selectionColor: '#4fc3f7',
    dragBoxColor: 'rgba(79, 195, 247, 0.7)',
    textColor: '#ffffff',
    textFont: 'bold Xpx Arial, sans-serif',
    pauseOverlay: 'rgba(0,0,0,0.75)',

    cssVars: {
      '--bg-deep': '#0a0a1a',
      '--bg-surface': '#1a1a2e',
      '--bg-card': 'rgba(26,26,46,0.85)',
      '--text': '#e0e0e0',
      '--text-dim': '#888',
      '--border': 'rgba(255,255,255,0.1)',
      '--accent': '#4fc3f7',
      '--accent-glow': 'rgba(79,195,247,0.4)',
      '--btn-bg': '#1a1a2e',
      '--btn-selected': '#4fc3f7',
      '--btn-hover': 'rgba(79,195,247,0.1)'
    },

    labels: {
      title: 'GALAXY',
      titleAccent: 'CONQUEST',
      tagline: 'Conquer the stars. Crush your enemies.',
      planet: 'planets',
      ship: 'ships',
      planetIcon: '🪐',
      shipIcon: '🚀',
      startBtn: '▶ START GAME'
    },

    createBackground: function (w, h) {
      return new SpaceBackground(w, h);
    },

    drawPlanet: function (ctx, p, time, colors) {
      var r = p.radius;
      var cacheSize = (r + 20) * 2;
      var cx = cacheSize / 2, cy = cacheSize / 2;

      // Build offscreen cache if missing or stale
      if (!p.renderCache || p.renderCache.owner !== p.owner || p.renderCache.radius !== r) {
        var off = document.createElement('canvas');
        off.width = cacheSize;
        off.height = cacheSize;
        var oc = off.getContext('2d');

        // Planet sphere with radial gradient
        var grad = oc.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        grad.addColorStop(0, lightenColor(colors.planet, 0.4));
        grad.addColorStop(0.5, colors.planet);
        grad.addColorStop(1, lightenColor(colors.planet, -0.3));
        oc.fillStyle = grad;
        oc.beginPath();
        oc.arc(cx, cy, r, 0, Math.PI * 2);
        oc.fill();

        // Atmosphere glow
        oc.globalAlpha = 0.2;
        var atmo = oc.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.3);
        atmo.addColorStop(0, 'rgba(255,255,255,0)');
        atmo.addColorStop(0.7, colors.glow);
        atmo.addColorStop(1, 'rgba(0,0,0,0)');
        oc.fillStyle = atmo;
        oc.beginPath();
        oc.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 1;

        // Crater dots
        var seed = (p.x * 100 + p.y) | 0;
        var craterCount = Math.max(2, Math.floor(r / 5));
        for (var i = 0; i < craterCount; i++) {
          seed = (seed * 16807 + 7) % 2147483647;
          var crx = cx + (((seed % 200) - 100) / 100) * r * 0.65;
          seed = (seed * 16807 + 7) % 2147483647;
          var cry = cy + (((seed % 200) - 100) / 100) * r * 0.65;
          var dx = crx - cx, dy = cry - cy;
          if (Math.sqrt(dx*dx + dy*dy) > r * 0.75) continue;
          seed = (seed * 16807 + 7) % 2147483647;
          var cr = 1 + (seed % 100) / 100 * r * 0.12;
          oc.globalAlpha = 0.15;
          oc.fillStyle = '#000000';
          oc.beginPath();
          oc.arc(crx, cry, cr, 0, Math.PI * 2);
          oc.fill();
        }
        oc.globalAlpha = 1;

        // Specular highlight
        oc.globalAlpha = 0.25;
        var specGrad = oc.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.3, cy - r * 0.35, r * 0.5);
        specGrad.addColorStop(0, '#ffffff');
        specGrad.addColorStop(1, 'rgba(255,255,255,0)');
        oc.fillStyle = specGrad;
        oc.beginPath();
        oc.arc(cx, cy, r, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 1;

        p.renderCache = { canvas: off, owner: p.owner, radius: r };
      }

      // Animated: orbital glow ring
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(0.3);
      ctx.globalAlpha = 0.15 + 0.05 * Math.sin(time * 1.5 + p.pulsePhase);
      ctx.strokeStyle = colors.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.6, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;

      // Capture flash
      if (p.captureFlashTimer > 0) {
        ctx.globalAlpha = p.captureFlashTimer;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Blit cached planet
      ctx.drawImage(p.renderCache.canvas, p.x - cacheSize / 2, p.y - cacheSize / 2);

      // Selection ring
      if (p.selected) {
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#4fc3f7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Ship count text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(10, r * 0.7) + 'px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.shipCount, p.x, p.y);
    },

    drawShip: function (ctx, s, owner, colors) {
      ctx.save();
      ctx.translate(s.ox, s.oy);
      ctx.fillStyle = colors.ships;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-3, -2.5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-3, 2.5);
      ctx.closePath();
      ctx.fill();
      // Engine glow
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = colors.glow;
      ctx.beginPath();
      ctx.arc(-3, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    },

    particleConfig: function (type) {
      if (type === 'explosion') return { colors: ['#ff6b6b', '#ffa726', '#ffee58', '#ffffff'], shapes: ['spark', 'triangle'] };
      if (type === 'capture') return { colors: ['#4fc3f7', '#81d4fa', '#b3e5fc', '#ffffff'], shapes: ['star', 'dot'] };
      return { colors: ['#ffffff', '#b3e5fc', '#e1f5fe'], shapes: ['dot'] };
    }
  };

  // ----------------------------------------------------------
  //  THEME 2: ANT COLONY
  // ----------------------------------------------------------

  var THEME_ANT_COLONY = {
    id: 'ant-colony',
    name: 'Bug Colony',
    emoji: '🐜',

    colors: {
      neutral: { planet: '#8D6E63', ships: '#A1887F', glow: 'rgba(141,110,99,0.3)' },
      player:  { planet: '#7CB342', ships: '#9CCC65', glow: 'rgba(124,179,66,0.3)' },
      ai1:     { planet: '#EF5350', ships: '#E57373', glow: 'rgba(239,83,80,0.3)' },
      ai2:     { planet: '#FFA726', ships: '#FFB74D', glow: 'rgba(255,167,38,0.3)' },
      ai3:     { planet: '#AB47BC', ships: '#CE93D8', glow: 'rgba(171,71,188,0.3)' }
    },

    bgColor: '#FAFAF5',
    selectionColor: '#7CB342',
    dragBoxColor: 'rgba(124, 179, 66, 0.7)',
    textColor: '#4A3728',
    textFont: 'bold Xpx "Trebuchet MS", Arial, sans-serif',
    pauseOverlay: 'rgba(250,250,245,0.82)',

    cssVars: {
      '--bg-deep': '#FAFAF5',
      '--bg-surface': '#F5F0E8',
      '--bg-card': 'rgba(245,240,232,0.92)',
      '--text': '#4A3728',
      '--text-dim': '#8D6E63',
      '--border': 'rgba(74,55,40,0.15)',
      '--accent': '#7CB342',
      '--accent-glow': 'rgba(124,179,66,0.3)',
      '--btn-bg': '#F5F0E8',
      '--btn-selected': '#7CB342',
      '--btn-hover': 'rgba(124,179,66,0.12)'
    },

    labels: {
      title: 'BUG',
      titleAccent: 'COLONY',
      tagline: 'Build your colony. Rule the garden.',
      planet: 'nests',
      ship: 'bugs',
      planetIcon: '🐜',
      shipIcon: '🪲',
      startBtn: '🐜 START GAME'
    },

    createBackground: function (w, h) {
      return new AntColonyBackground(w, h);
    },

    drawPlanet: function (ctx, p, time, colors) {
      var r = p.radius;
      var cacheSize = (r + 20) * 2;
      var cx = cacheSize / 2, cy = cacheSize / 2;

      // Build offscreen cache if missing or stale
      if (!p.renderCache || p.renderCache.owner !== p.owner || p.renderCache.radius !== r) {
        var off = document.createElement('canvas');
        off.width = cacheSize;
        off.height = cacheSize;
        var oc = off.getContext('2d');

        // Shadow under mound
        oc.globalAlpha = 0.12;
        oc.fillStyle = '#000000';
        oc.beginPath();
        oc.ellipse(cx, cy + r * 0.65, r * 1.1, r * 0.25, 0, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 1;

        // Anthill mound (elliptical dome)
        var moundGrad = oc.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
        moundGrad.addColorStop(0, lightenColor(colors.planet, 0.3));
        moundGrad.addColorStop(0.6, colors.planet);
        moundGrad.addColorStop(1, lightenColor(colors.planet, -0.2));
        oc.fillStyle = moundGrad;
        oc.beginPath();
        oc.ellipse(cx, cy + r * 0.15, r, r * 0.85, 0, 0, Math.PI * 2);
        oc.fill();

        // Dirt texture dots (use seeded random, not Math.random for cache consistency)
        var seed = (p.x * 73 + p.y * 37) | 0;
        for (var i = 0; i < Math.floor(r * 1.2); i++) {
          seed = (seed * 16807 + 13) % 2147483647;
          var dx = (((seed % 200) - 100) / 100) * r * 0.75;
          seed = (seed * 16807 + 13) % 2147483647;
          var dy = (((seed % 200) - 100) / 100) * r * 0.6;
          seed = (seed * 16807 + 13) % 2147483647;
          var dotR = 0.8 + (seed % 100) / 100 * 0.6;
          oc.globalAlpha = 0.15;
          oc.fillStyle = lightenColor(colors.planet, -0.35);
          oc.beginPath();
          oc.arc(cx + dx, cy + r * 0.15 + dy, dotR, 0, Math.PI * 2);
          oc.fill();
        }
        oc.globalAlpha = 1;

        // Entrance hole at base
        oc.fillStyle = '#3E2723';
        oc.beginPath();
        oc.ellipse(cx, cy + r * 0.55, r * 0.25, r * 0.15, 0, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 0.3;
        oc.fillStyle = '#000000';
        oc.beginPath();
        oc.ellipse(cx, cy + r * 0.55, r * 0.18, r * 0.1, 0, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 1;

        p.renderCache = { canvas: off, owner: p.owner, radius: r };
      }

      // Capture flash (animated)
      if (p.captureFlashTimer > 0) {
        ctx.globalAlpha = p.captureFlashTimer * 0.6;
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + r * 0.15, r * 1.6, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Blit cached planet
      ctx.drawImage(p.renderCache.canvas, p.x - cacheSize / 2, p.y - cacheSize / 2);

      // Grass tufts on top (animated sway)
      ctx.strokeStyle = '#689F38';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (var i = -2; i <= 2; i++) {
        var gx = p.x + i * r * 0.18;
        var gy = p.y - r * 0.65;
        var sway = Math.sin(time * 1.5 + i * 0.7 + p.pulsePhase) * 2;
        ctx.beginPath();
        ctx.moveTo(gx, gy + r * 0.15);
        ctx.quadraticCurveTo(gx + sway, gy - r * 0.1, gx + sway * 1.5, gy - r * 0.2);
        ctx.stroke();
      }

      // Selection ring
      if (p.selected) {
        ctx.strokeStyle = '#7CB342';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#7CB342';
        ctx.shadowBlur = 8;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + r * 0.1, r * 1.25, r * 1.0, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }

      // Ship count text
      ctx.fillStyle = '#4A3728';
      ctx.font = 'bold ' + Math.max(10, r * 0.65) + 'px "Trebuchet MS", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.shipCount, p.x, p.y);
    },

    drawShip: function (ctx, s, owner, colors) {
      ctx.save();
      ctx.translate(s.ox, s.oy);
      var ownerType = owner || 'neutral';

      if (ownerType === 'player' || ownerType === 'neutral') {
        // Ant: 3 segments + legs + antennae
        ctx.fillStyle = colors.ships;
        // Body segments
        ctx.beginPath(); ctx.arc(2.5, 0, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-2.5, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        // Legs
        ctx.strokeStyle = colors.ships;
        ctx.lineWidth = 0.5;
        for (var i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(i * 1.5, -1.5); ctx.lineTo(i * 1.5 - 1, -3.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(i * 1.5, 1.5); ctx.lineTo(i * 1.5 - 1, 3.5); ctx.stroke();
        }
        // Antennae
        ctx.beginPath(); ctx.moveTo(3.5, -0.5); ctx.quadraticCurveTo(5, -2, 5.5, -3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3.5, 0.5); ctx.quadraticCurveTo(5, 2, 5.5, 3); ctx.stroke();
      } else if (ownerType === 'ai1') {
        // Ladybug: round, spots
        ctx.fillStyle = colors.ships;
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        // Head
        ctx.fillStyle = lightenColor(colors.ships, -0.4);
        ctx.beginPath(); ctx.arc(3, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        // Shell line
        ctx.strokeStyle = lightenColor(colors.ships, -0.3);
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.stroke();
        // Spots
        ctx.fillStyle = lightenColor(colors.ships, -0.35);
        ctx.beginPath(); ctx.arc(-1, -1.2, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-1, 1.2, 0.7, 0, Math.PI * 2); ctx.fill();
      } else if (ownerType === 'ai2') {
        // Beetle: oval, shell line
        ctx.fillStyle = colors.ships;
        ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = lightenColor(colors.ships, -0.25);
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(-1, -2.2); ctx.lineTo(-1, 2.2); ctx.stroke();
        // Head
        ctx.fillStyle = lightenColor(colors.ships, -0.3);
        ctx.beginPath(); ctx.arc(3, 0, 1.3, 0, Math.PI * 2); ctx.fill();
      } else {
        // Butterfly: wings
        ctx.fillStyle = hexToRgba(colors.ships, 0.7);
        // Wings
        ctx.beginPath(); ctx.ellipse(-1, -2.5, 2.5, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-1, 2.5, 2.5, 1.5, 0.3, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = lightenColor(colors.ships, -0.4);
        ctx.fillRect(-0.5, -3, 1, 6);
        // Antennae
        ctx.strokeStyle = lightenColor(colors.ships, -0.3);
        ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(0.5, -0.5); ctx.quadraticCurveTo(2, -2, 3, -3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.5, 0.5); ctx.quadraticCurveTo(2, 2, 3, 3); ctx.stroke();
      }
      ctx.restore();
    },

    particleConfig: function (type) {
      if (type === 'explosion') return { colors: ['#8BC34A', '#CDDC39', '#FFF9C4', '#A1887F'], shapes: ['leaf', 'petal'] };
      if (type === 'capture') return { colors: ['#FFD54F', '#FFF176', '#F48FB1', '#CE93D8'], shapes: ['star', 'heart'] };
      return { colors: ['#FFF9C4', '#DCEDC8', '#F1F8E9'], shapes: ['dot', 'petal'] };
    }
  };

  // ----------------------------------------------------------
  //  THEME 3: BEE SWARM
  // ----------------------------------------------------------

  var THEME_BEE_SWARM = {
    id: 'bee-swarm',
    name: 'Bee Swarm',
    emoji: '🐝',

    colors: {
      neutral: { planet: '#A1887F', ships: '#BCAAA4', glow: 'rgba(161,136,127,0.3)' },
      player:  { planet: '#FFA000', ships: '#FFB300', glow: 'rgba(255,160,0,0.3)' },
      ai1:     { planet: '#EF5350', ships: '#E57373', glow: 'rgba(239,83,80,0.3)' },
      ai2:     { planet: '#66BB6A', ships: '#81C784', glow: 'rgba(102,187,106,0.3)' },
      ai3:     { planet: '#7E57C2', ships: '#9575CD', glow: 'rgba(126,87,194,0.3)' }
    },

    bgColor: '#FFF8E1',
    selectionColor: '#FFA000',
    dragBoxColor: 'rgba(255, 160, 0, 0.7)',
    textColor: '#4E342E',
    textFont: 'bold Xpx "Trebuchet MS", Arial, sans-serif',
    pauseOverlay: 'rgba(255,248,225,0.82)',

    cssVars: {
      '--bg-deep': '#FFF8E1',
      '--bg-surface': '#FFF3D0',
      '--bg-card': 'rgba(255,243,208,0.92)',
      '--text': '#4E342E',
      '--text-dim': '#8D6E63',
      '--border': 'rgba(78,52,46,0.12)',
      '--accent': '#FFA000',
      '--accent-glow': 'rgba(255,160,0,0.35)',
      '--btn-bg': '#FFF3D0',
      '--btn-selected': '#FFA000',
      '--btn-hover': 'rgba(255,160,0,0.12)'
    },

    labels: {
      title: 'SWARM',
      titleAccent: 'WARS',
      tagline: 'Gather nectar. Defend the hive.',
      planet: 'hives',
      ship: 'bees',
      planetIcon: '🍯',
      shipIcon: '🐝',
      startBtn: '🐝 START GAME'
    },

    createBackground: function (w, h) {
      return new BeeSwarmBackground(w, h);
    },

    drawPlanet: function (ctx, p, time, colors) {
      var r = p.radius;
      var cacheSize = (r + 20) * 2;
      var cx = cacheSize / 2, cy = cacheSize / 2;

      // Build offscreen cache if missing or stale
      if (!p.renderCache || p.renderCache.owner !== p.owner || p.renderCache.radius !== r) {
        var off = document.createElement('canvas');
        off.width = cacheSize;
        off.height = cacheSize;
        var oc = off.getContext('2d');

        // Shadow
        oc.globalAlpha = 0.1;
        oc.fillStyle = '#000000';
        oc.beginPath();
        oc.ellipse(cx, cy + r * 0.7, r * 1.1, r * 0.22, 0, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 1;

        // Hive body (rounded teardrop shape)
        var hiveGrad = oc.createRadialGradient(cx - r * 0.15, cy - r * 0.2, 0, cx, cy, r);
        hiveGrad.addColorStop(0, lightenColor(colors.planet, 0.35));
        hiveGrad.addColorStop(0.5, colors.planet);
        hiveGrad.addColorStop(1, lightenColor(colors.planet, -0.15));
        oc.fillStyle = hiveGrad;
        oc.beginPath();
        oc.moveTo(cx, cy - r * 0.9);
        oc.bezierCurveTo(cx + r * 1.1, cy - r * 0.6, cx + r * 1.05, cy + r * 0.5, cx + r * 0.3, cy + r * 0.85);
        oc.lineTo(cx - r * 0.3, cy + r * 0.85);
        oc.bezierCurveTo(cx - r * 1.05, cy + r * 0.5, cx - r * 1.1, cy - r * 0.6, cx, cy - r * 0.9);
        oc.closePath();
        oc.fill();

        // Honeycomb pattern
        var hexSize = Math.max(3, r * 0.22);
        oc.strokeStyle = lightenColor(colors.planet, -0.15);
        oc.lineWidth = 0.6;
        oc.globalAlpha = 0.35;
        var rows = Math.floor(r * 1.2 / hexSize);
        var cols = Math.floor(r * 1.6 / (hexSize * 1.5));
        for (var row = -rows; row <= rows; row++) {
          for (var col = -cols; col <= cols; col++) {
            var hx = cx + col * hexSize * 1.5;
            var hy = cy + row * hexSize * 0.87 + (col % 2 === 0 ? 0 : hexSize * 0.43);
            var dx = hx - cx, dy = hy - cy;
            if (Math.sqrt(dx * dx + dy * dy) > r * 0.8) continue;
            oc.beginPath();
            for (var k = 0; k < 6; k++) {
              var angle = (k / 6) * Math.PI * 2 - Math.PI / 6;
              var px = hx + Math.cos(angle) * hexSize * 0.45;
              var py = hy + Math.sin(angle) * hexSize * 0.45;
              if (k === 0) oc.moveTo(px, py); else oc.lineTo(px, py);
            }
            oc.closePath();
            oc.stroke();
            // Fill some cells with honey
            var cellSeed = ((hx * 31 + hy * 17) | 0) % 5;
            if (cellSeed < 2) {
              oc.globalAlpha = 0.15;
              oc.fillStyle = '#FFD54F';
              oc.fill();
              oc.globalAlpha = 0.35;
            }
          }
        }
        oc.globalAlpha = 1;

        // Entrance hole
        oc.fillStyle = '#3E2723';
        oc.beginPath();
        oc.arc(cx, cy + r * 0.5, r * 0.15, 0, Math.PI * 2);
        oc.fill();

        p.renderCache = { canvas: off, owner: p.owner, radius: r };
      }

      // Capture flash (animated)
      if (p.captureFlashTimer > 0) {
        ctx.globalAlpha = p.captureFlashTimer * 0.5;
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Blit cached planet
      ctx.drawImage(p.renderCache.canvas, p.x - cacheSize / 2, p.y - cacheSize / 2);

      // Honey drips at bottom (animated)
      ctx.fillStyle = '#FFB300';
      ctx.globalAlpha = 0.6;
      for (var d = 0; d < 3; d++) {
        var dripX = p.x + (d - 1) * r * 0.3;
        var dripLen = r * 0.15 + Math.sin(time * 0.8 + d * 1.5) * r * 0.08;
        ctx.beginPath();
        ctx.ellipse(dripX, p.y + r * 0.85 + dripLen * 0.5, r * 0.06, dripLen, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Small orbiting bees (animated)
      var beeCount = Math.min(3, Math.max(1, Math.floor(r / 12)));
      for (var b = 0; b < beeCount; b++) {
        var bAngle = time * (1.2 + b * 0.3) + b * Math.PI * 2 / beeCount;
        var bDist = r * 1.2 + Math.sin(time * 2 + b) * r * 0.15;
        var bx = p.x + Math.cos(bAngle) * bDist;
        var by = p.y + Math.sin(bAngle) * bDist * 0.6;
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.ellipse(bx, by, 2, 1.3, bAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(bx - 0.5, by - 1.3, 1, 2.6);
        // Tiny wings
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#FFFFFF';
        var wingSize = 1 + Math.sin(time * 15 + b) * 0.4;
        ctx.beginPath();
        ctx.ellipse(bx - 1, by - 1.2, wingSize, 0.6, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Selection ring
      if (p.selected) {
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#FFA000';
        ctx.shadowBlur = 8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }

      // Ship count text
      ctx.fillStyle = '#4E342E';
      ctx.font = 'bold ' + Math.max(10, r * 0.65) + 'px "Trebuchet MS", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.shipCount, p.x, p.y - r * 0.1);
    },

    drawShip: function (ctx, s, owner, colors) {
      ctx.save();
      ctx.translate(s.ox, s.oy);

      // Bee body (oval, striped)
      ctx.fillStyle = colors.ships;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stripes
      ctx.fillStyle = lightenColor(colors.ships, -0.35);
      ctx.fillRect(-1.5, -2, 1, 4);
      ctx.fillRect(0.5, -2, 1, 4);

      // Head
      ctx.fillStyle = lightenColor(colors.ships, -0.2);
      ctx.beginPath();
      ctx.arc(3, 0, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Stinger
      ctx.fillStyle = lightenColor(colors.ships, -0.4);
      ctx.beginPath();
      ctx.moveTo(-3.5, 0);
      ctx.lineTo(-5, -0.5);
      ctx.lineTo(-5, 0.5);
      ctx.closePath();
      ctx.fill();

      // Wings (translucent, slight oscillation built into offset)
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0.5, -2.5, 2.2, 1, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0.5, 2.5, 2.2, 1, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    },

    particleConfig: function (type) {
      if (type === 'explosion') return { colors: ['#FFB300', '#FFD54F', '#FFF176', '#FF8F00'], shapes: ['dot', 'star'] };
      if (type === 'capture') return { colors: ['#FFF9C4', '#FFD54F', '#FFC107', '#FFFFFF'], shapes: ['star', 'petal'] };
      return { colors: ['#FFFFFF', '#FFF9C4', '#FFF3E0'], shapes: ['dot', 'petal'] };
    }
  };

  // ----------------------------------------------------------
  //  THEME 4: MEDIEVAL
  // ----------------------------------------------------------

  var THEME_MEDIEVAL = {
    id: 'medieval',
    name: 'Kingdom Wars',
    emoji: '🏰',

    colors: {
      neutral: { planet: '#9E9E9E', ships: '#BDBDBD', glow: 'rgba(158,158,158,0.3)' },
      player:  { planet: '#1565C0', ships: '#42A5F5', glow: 'rgba(21,101,192,0.3)' },
      ai1:     { planet: '#C62828', ships: '#EF5350', glow: 'rgba(198,40,40,0.3)' },
      ai2:     { planet: '#2E7D32', ships: '#66BB6A', glow: 'rgba(46,125,50,0.3)' },
      ai3:     { planet: '#F9A825', ships: '#FFCA28', glow: 'rgba(249,168,37,0.3)' }
    },

    bgColor: '#F5E6C8',
    selectionColor: '#C62828',
    dragBoxColor: 'rgba(198, 40, 40, 0.7)',
    textColor: '#3E2723',
    textFont: 'bold Xpx "Georgia", "Times New Roman", serif',
    pauseOverlay: 'rgba(245,230,200,0.82)',

    cssVars: {
      '--bg-deep': '#F5E6C8',
      '--bg-surface': '#EDE0CC',
      '--bg-card': 'rgba(237,224,204,0.92)',
      '--text': '#3E2723',
      '--text-dim': '#795548',
      '--border': 'rgba(62,39,35,0.15)',
      '--accent': '#C62828',
      '--accent-glow': 'rgba(198,40,40,0.3)',
      '--btn-bg': '#EDE0CC',
      '--btn-selected': '#C62828',
      '--btn-hover': 'rgba(198,40,40,0.1)'
    },

    labels: {
      title: 'KINGDOM',
      titleAccent: 'WARS',
      tagline: 'Raise your banners. Conquer the realm.',
      planet: 'castles',
      ship: 'troops',
      planetIcon: '🏰',
      shipIcon: '⚔️',
      startBtn: '⚔ START GAME'
    },

    createBackground: function (w, h) {
      return new MedievalBackground(w, h);
    },

    drawPlanet: function (ctx, p, time, colors) {
      var r = p.radius;
      var cacheSize = (r + 20) * 2;
      var cx = cacheSize / 2, cy = cacheSize / 2;

      // Per-owner tinted stone colors
      var stoneColors = {
        '#9E9E9E': { light: '#BDBDBD', mid: '#9E9E9E', dark: '#757575', cren: '#616161', roof: '#8E8E8E', roofSh: '#6E6E6E' },
        '#1565C0': { light: '#8FA8C6', mid: '#7A8FA8', dark: '#5A7088', cren: '#0D47A1', roof: '#1565C0', roofSh: '#0D47A1' },
        '#C62828': { light: '#C49A9A', mid: '#A88080', dark: '#886060', cren: '#8E0000', roof: '#C62828', roofSh: '#8E0000' },
        '#2E7D32': { light: '#8FB0A0', mid: '#7A9A85', dark: '#5A7A65', cren: '#1B5E20', roof: '#2E7D32', roofSh: '#1B5E20' },
        '#F9A825': { light: '#C6B88F', mid: '#A89A70', dark: '#887A55', cren: '#C17900', roof: '#F9A825', roofSh: '#C17900' }
      };
      var sc = stoneColors[colors.planet] || stoneColors['#9E9E9E'];

      // Build offscreen cache if missing or stale
      if (!p.renderCache || p.renderCache.owner !== p.owner || p.renderCache.radius !== r) {
        var off = document.createElement('canvas');
        off.width = cacheSize;
        off.height = cacheSize;
        var oc = off.getContext('2d');

        // Shadow
        oc.globalAlpha = 0.1;
        oc.fillStyle = '#000000';
        oc.beginPath();
        oc.ellipse(cx, cy + r * 0.65, r * 0.9, r * 0.2, 0, 0, Math.PI * 2);
        oc.fill();
        oc.globalAlpha = 1;

        // Castle base (owner-tinted stone wall)
        var wallW = r * 1.2;
        var wallH = r * 1.0;
        var wallX = cx - wallW / 2;
        var wallY = cy - wallH * 0.3;
        var stoneGrad = oc.createLinearGradient(wallX, wallY, wallX, wallY + wallH);
        stoneGrad.addColorStop(0, sc.light);
        stoneGrad.addColorStop(0.5, sc.mid);
        stoneGrad.addColorStop(1, sc.dark);
        oc.fillStyle = stoneGrad;
        oc.fillRect(wallX, wallY, wallW, wallH);

        // Stone texture lines
        oc.strokeStyle = 'rgba(0,0,0,0.08)';
        oc.lineWidth = 0.5;
        var stoneRows = Math.floor(wallH / (r * 0.18));
        for (var row = 0; row < stoneRows; row++) {
          var sy = wallY + row * (wallH / stoneRows);
          oc.beginPath();
          oc.moveTo(wallX, sy);
          oc.lineTo(wallX + wallW, sy);
          oc.stroke();
          var offset = (row % 2 === 0) ? 0 : wallW / 6;
          for (var col = 0; col < 4; col++) {
            var sx = wallX + offset + col * (wallW / 3);
            if (sx > wallX && sx < wallX + wallW) {
              oc.beginPath();
              oc.moveTo(sx, sy);
              oc.lineTo(sx, sy + wallH / stoneRows);
              oc.stroke();
            }
          }
        }

        // Crenellation (owner-colored battlements)
        var merlonW = r * 0.2;
        var merlonH = r * 0.22;
        var merlonCount = Math.max(3, Math.floor(wallW / (merlonW * 1.5)));
        var spacing = wallW / merlonCount;
        oc.fillStyle = sc.cren;
        for (var i = 0; i < merlonCount; i++) {
          var mx = wallX + i * spacing;
          oc.fillRect(mx, wallY - merlonH, merlonW * 0.8, merlonH);
        }

        // Tower (central, taller)
        var towerW = r * 0.45;
        var towerH = r * 0.5;
        var towerX = cx - towerW / 2;
        var towerY = wallY - merlonH - towerH;
        var towerGrad = oc.createLinearGradient(towerX, towerY, towerX, towerY + towerH);
        towerGrad.addColorStop(0, sc.light);
        towerGrad.addColorStop(1, sc.mid);
        oc.fillStyle = towerGrad;
        oc.fillRect(towerX, towerY, towerW, towerH);

        // Tower top crenellation (colored)
        var tMerlonW = r * 0.12;
        oc.fillStyle = sc.cren;
        for (var i = 0; i < 3; i++) {
          oc.fillRect(towerX + i * (towerW / 3), towerY - r * 0.1, tMerlonW, r * 0.1);
        }

        // Colored tower roof (triangle)
        var roofPeak = towerY - r * 0.1 - r * 0.3;
        var roofGrad = oc.createLinearGradient(towerX, roofPeak, towerX + towerW, towerY - r * 0.1);
        roofGrad.addColorStop(0, sc.roof);
        roofGrad.addColorStop(1, sc.roofSh);
        oc.fillStyle = roofGrad;
        oc.beginPath();
        oc.moveTo(cx, roofPeak);
        oc.lineTo(towerX - r * 0.05, towerY - r * 0.1);
        oc.lineTo(towerX + towerW + r * 0.05, towerY - r * 0.1);
        oc.closePath();
        oc.fill();

        // Color tint overlay on walls (stronger)
        oc.globalAlpha = 0.35;
        oc.fillStyle = colors.planet;
        oc.fillRect(wallX, wallY, wallW, wallH);
        oc.fillRect(towerX, towerY, towerW, towerH);
        oc.globalAlpha = 1;

        // Wall banners (2 hanging banners on wall face)
        var bannerW = r * 0.12;
        var bannerH = r * 0.35;
        oc.fillStyle = colors.planet;
        // Left banner
        oc.fillRect(cx - r * 0.35, wallY + wallH * 0.15, bannerW, bannerH);
        oc.beginPath();
        oc.moveTo(cx - r * 0.35, wallY + wallH * 0.15 + bannerH);
        oc.lineTo(cx - r * 0.35 + bannerW / 2, wallY + wallH * 0.15 + bannerH + r * 0.08);
        oc.lineTo(cx - r * 0.35 + bannerW, wallY + wallH * 0.15 + bannerH);
        oc.fill();
        // Right banner
        oc.fillRect(cx + r * 0.23, wallY + wallH * 0.15, bannerW, bannerH);
        oc.beginPath();
        oc.moveTo(cx + r * 0.23, wallY + wallH * 0.15 + bannerH);
        oc.lineTo(cx + r * 0.23 + bannerW / 2, wallY + wallH * 0.15 + bannerH + r * 0.08);
        oc.lineTo(cx + r * 0.23 + bannerW, wallY + wallH * 0.15 + bannerH);
        oc.fill();

        // Flag pole (static part)
        oc.strokeStyle = '#5D4037';
        oc.lineWidth = 1.5;
        oc.beginPath();
        oc.moveTo(cx, roofPeak);
        oc.lineTo(cx, roofPeak - r * 0.28);
        oc.stroke();

        // Door at base
        oc.fillStyle = '#5D4037';
        var doorW = r * 0.2;
        var doorH = r * 0.3;
        oc.fillRect(cx - doorW / 2, wallY + wallH - doorH, doorW, doorH);
        oc.beginPath();
        oc.arc(cx, wallY + wallH - doorH, doorW / 2, Math.PI, 0);
        oc.fill();

        // Window slits
        oc.fillStyle = '#37474F';
        oc.fillRect(cx - r * 0.35, wallY + wallH * 0.55, r * 0.06, r * 0.15);
        oc.fillRect(cx + r * 0.3, wallY + wallH * 0.55, r * 0.06, r * 0.15);

        p.renderCache = { canvas: off, owner: p.owner, radius: r };
      }

      // Capture flash (animated)
      if (p.captureFlashTimer > 0) {
        ctx.globalAlpha = p.captureFlashTimer * 0.5;
        ctx.fillStyle = '#FFECB3';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Blit cached castle
      ctx.drawImage(p.renderCache.canvas, p.x - cacheSize / 2, p.y - cacheSize / 2);

      // Flag on tower (animated wave)
      var wallW = r * 1.2;
      var wallH = r * 1.0;
      var wallY = p.y - wallH * 0.3;
      var merlonH = r * 0.22;
      var towerW = r * 0.45;
      var towerH = r * 0.5;
      var towerY = wallY - merlonH - towerH;
      var roofPeak = towerY - r * 0.1 - r * 0.3;
      var flagPoleX = p.x;
      var flagPoleY = roofPeak;
      var flagH = r * 0.28;
      var flagW = r * 0.35;
      var wave = Math.sin(time * 2.5 + p.pulsePhase) * 2;
      ctx.fillStyle = colors.planet;
      ctx.beginPath();
      ctx.moveTo(flagPoleX, flagPoleY - flagH);
      ctx.quadraticCurveTo(flagPoleX + flagW * 0.5 + wave, flagPoleY - flagH + flagH * 0.3, flagPoleX + flagW + wave, flagPoleY - flagH + flagH * 0.15);
      ctx.lineTo(flagPoleX + flagW + wave * 0.7, flagPoleY - flagH + flagH * 0.85);
      ctx.quadraticCurveTo(flagPoleX + flagW * 0.5 + wave * 0.5, flagPoleY - flagH + flagH * 0.6, flagPoleX, flagPoleY - flagH + flagH * 0.7);
      ctx.closePath();
      ctx.fill();

      // Selection ring
      if (p.selected) {
        ctx.strokeStyle = colors.planet;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = colors.planet;
        ctx.shadowBlur = 10;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y + r * 0.1, r * 1.45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }

      // Ship count text
      ctx.fillStyle = '#3E2723';
      ctx.font = 'bold ' + Math.max(10, r * 0.6) + 'px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.shipCount, p.x, p.y + r * 0.35);
    },

    drawShip: function (ctx, s, owner, colors) {
      ctx.save();
      ctx.translate(s.ox, s.oy);

      // Shield
      ctx.fillStyle = colors.ships;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(2.5, -1.5);
      ctx.lineTo(2.5, 1);
      ctx.lineTo(0, 3);
      ctx.lineTo(-2.5, 1);
      ctx.lineTo(-2.5, -1.5);
      ctx.closePath();
      ctx.fill();
      // Shield cross/emblem
      ctx.strokeStyle = lightenColor(colors.ships, 0.3);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -2); ctx.lineTo(0, 2);
      ctx.moveTo(-1.5, 0); ctx.lineTo(1.5, 0);
      ctx.stroke();

      // Head (tiny circle)
      ctx.fillStyle = '#FFCCBC';
      ctx.beginPath();
      ctx.arc(0, -3.8, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Helmet
      ctx.fillStyle = '#757575';
      ctx.beginPath();
      ctx.arc(0, -4.2, 1.3, Math.PI, 0);
      ctx.fill();

      // Spear (line sticking up-right)
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(4, -5);
      ctx.stroke();
      // Spear tip
      ctx.fillStyle = '#BDBDBD';
      ctx.beginPath();
      ctx.moveTo(4, -5);
      ctx.lineTo(3.5, -5.8);
      ctx.lineTo(4.5, -5.8);
      ctx.closePath();
      ctx.fill();

      // Tiny legs
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-0.8, 3); ctx.lineTo(-1.2, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.8, 3); ctx.lineTo(1.2, 5); ctx.stroke();

      ctx.restore();
    },

    particleConfig: function (type) {
      if (type === 'explosion') return { colors: ['#FF6F00', '#FF8F00', '#FFB300', '#D84315'], shapes: ['spark', 'triangle'] };
      if (type === 'capture') return { colors: ['#C62828', '#1565C0', '#FFD54F', '#FFFFFF'], shapes: ['star', 'petal'] };
      return { colors: ['#BDBDBD', '#CFD8DC', '#ECEFF1'], shapes: ['dot', 'spark'] };
    }
  };

  // ----------------------------------------------------------
  //  NEON BACKGROUND
  // ----------------------------------------------------------

  function NeonBackground(w, h) {
    this.w = w;
    this.h = h;
    this.gridLines = [];
    this.pulses = [];
    this.pulseTimer = 0;
    this._init();
  }

  NeonBackground.prototype._init = function () {
    this.gridLines = [];
    var spacing = 60;
    for (var y = 0; y < this.h + spacing; y += spacing) {
      this.gridLines.push({ dir: 'h', pos: y, speed: 0.15 + Math.random() * 0.1, alpha: 0.08 + Math.random() * 0.06 });
    }
    for (var x = 0; x < this.w + spacing; x += spacing) {
      this.gridLines.push({ dir: 'v', pos: x, speed: 0.1 + Math.random() * 0.08, alpha: 0.08 + Math.random() * 0.06 });
    }
    this.pulses = [];
  };

  NeonBackground.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this._init();
  };

  NeonBackground.prototype.draw = function (ctx, time) {
    for (var i = 0; i < this.gridLines.length; i++) {
      var g = this.gridLines[i];
      var flicker = 0.7 + 0.3 * Math.sin(time * 1.5 + i * 0.7);
      ctx.globalAlpha = g.alpha * flicker;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      if (g.dir === 'h') {
        var yOff = (g.pos + time * g.speed * 20) % (this.h + 60) - 30;
        ctx.moveTo(0, yOff);
        ctx.lineTo(this.w, yOff);
      } else {
        var xOff = (g.pos + time * g.speed * 15) % (this.w + 60) - 30;
        ctx.moveTo(xOff, 0);
        ctx.lineTo(xOff, this.h);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.pulseTimer -= 0.016;
    if (this.pulseTimer <= 0) {
      this.pulses.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 0, maxR: 150 + Math.random() * 200,
        life: 1, color: Math.random() > 0.5 ? '#00ff88' : '#ff0066'
      });
      this.pulseTimer = 3 + Math.random() * 5;
    }

    for (var i = this.pulses.length - 1; i >= 0; i--) {
      var p = this.pulses[i];
      p.r += 2;
      p.life -= 0.012;
      if (p.life <= 0) { this.pulses.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * 0.12;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var cornerGrad = ctx.createRadialGradient(0, this.h, 0, 0, this.h, this.w * 0.5);
    cornerGrad.addColorStop(0, 'rgba(0,255,136,0.03)');
    cornerGrad.addColorStop(1, 'rgba(0,255,136,0)');
    ctx.fillStyle = cornerGrad;
    ctx.fillRect(0, 0, this.w, this.h);
  };

  // ----------------------------------------------------------
  //  THEME 5: NEON
  // ----------------------------------------------------------

  var THEME_NEON = {
    id: 'neon',
    name: 'Neon Grid',
    emoji: '💠',

    colors: {
      neutral: { planet: '#666666', ships: '#888888', glow: 'rgba(102,102,102,0.4)' },
      player:  { planet: '#00ff88', ships: lightenColor('#00ff88', 0.2), glow: 'rgba(0,255,136,0.45)' },
      ai1:     { planet: '#ff0066', ships: lightenColor('#ff0066', 0.2), glow: 'rgba(255,0,102,0.45)' },
      ai2:     { planet: '#00ccff', ships: lightenColor('#00ccff', 0.2), glow: 'rgba(0,204,255,0.45)' },
      ai3:     { planet: '#ff6600', ships: lightenColor('#ff6600', 0.2), glow: 'rgba(255,102,0,0.45)' }
    },

    bgColor: '#0a0a0a',
    selectionColor: '#00ff88',
    dragBoxColor: 'rgba(0, 255, 136, 0.7)',
    textColor: '#ffffff',
    textFont: 'bold Xpx "Courier New", monospace',
    pauseOverlay: 'rgba(0,0,0,0.85)',

    cssVars: {
      '--bg-deep': '#0a0a0a',
      '--bg-surface': '#141414',
      '--bg-card': 'rgba(14,14,14,0.92)',
      '--text': '#e0ffe8',
      '--text-dim': '#77aa88',
      '--border': 'rgba(0,255,136,0.15)',
      '--accent': '#00ff88',
      '--accent-glow': 'rgba(0,255,136,0.4)',
      '--btn-bg': '#141414',
      '--btn-selected': '#00ff88',
      '--btn-hover': 'rgba(0,255,136,0.1)'
    },

    labels: {
      title: 'SWARM',
      titleAccent: 'WARS',
      tagline: 'Enter the Grid.',
      planet: 'nodes',
      ship: 'drones',
      planetIcon: '◈',
      shipIcon: '▸',
      startBtn: '▶ JACK IN'
    },

    createBackground: function (w, h) {
      return new NeonBackground(w, h);
    },

    drawPlanet: function (ctx, p, time, colors) {
      var r = p.radius;
      var cacheSize = (r + 20) * 2;
      var cx = cacheSize / 2, cy = cacheSize / 2;

      // Build offscreen cache if missing or stale
      if (!p.renderCache || p.renderCache.owner !== p.owner || p.renderCache.radius !== r) {
        var off = document.createElement('canvas');
        off.width = cacheSize;
        off.height = cacheSize;
        var oc = off.getContext('2d');

        // Outer neon glow (static part baked with fixed shadowBlur)
        oc.save();
        oc.shadowColor = colors.planet;
        oc.shadowBlur = 15;
        oc.strokeStyle = colors.planet;
        oc.lineWidth = 3;
        oc.beginPath();
        oc.arc(cx, cy, r, 0, Math.PI * 2);
        oc.stroke();
        oc.restore();

        // Dark fill
        oc.fillStyle = '#0a0a0a';
        oc.beginPath();
        oc.arc(cx, cy, r - 2, 0, Math.PI * 2);
        oc.fill();

        // Inner ring
        oc.strokeStyle = colors.glow;
        oc.lineWidth = 1;
        oc.beginPath();
        oc.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        oc.stroke();

        // Hex grid inside
        var hexSize = Math.max(4, r * 0.3);
        oc.strokeStyle = colors.planet;
        oc.lineWidth = 0.4;
        oc.globalAlpha = 0.2;
        for (var row = -2; row <= 2; row++) {
          for (var col = -2; col <= 2; col++) {
            var hx = cx + col * hexSize * 1.5;
            var hy = cy + row * hexSize * 0.87 + (col % 2 === 0 ? 0 : hexSize * 0.43);
            var dx = hx - cx, dy = hy - cy;
            if (Math.sqrt(dx * dx + dy * dy) > r * 0.55) continue;
            oc.beginPath();
            for (var k = 0; k < 6; k++) {
              var angle = (k / 6) * Math.PI * 2;
              var px = hx + Math.cos(angle) * hexSize * 0.4;
              var py = hy + Math.sin(angle) * hexSize * 0.4;
              if (k === 0) oc.moveTo(px, py); else oc.lineTo(px, py);
            }
            oc.closePath();
            oc.stroke();
          }
        }
        oc.globalAlpha = 1;

        p.renderCache = { canvas: off, owner: p.owner, radius: r };
      }

      // Capture flash (animated)
      if (p.captureFlashTimer > 0) {
        ctx.globalAlpha = p.captureFlashTimer;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Blit cached planet
      ctx.drawImage(p.renderCache.canvas, p.x - cacheSize / 2, p.y - cacheSize / 2);

      // Rotating scan line (animated)
      var scanAngle = time * 1.5 + p.pulsePhase;
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = colors.planet;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(scanAngle) * r * 0.9, p.y + Math.sin(scanAngle) * r * 0.9);
      ctx.stroke();
      ctx.restore();

      // Selection ring
      if (p.selected) {
        ctx.save();
        ctx.shadowColor = colors.planet;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = colors.planet;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Ship count
      ctx.save();
      ctx.shadowColor = colors.planet;
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(10, r * 0.6) + 'px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.shipCount, p.x, p.y);
      ctx.restore();
    },

    drawShip: function (ctx, s, owner, colors) {
      ctx.save();
      ctx.translate(s.ox, s.oy);

      ctx.shadowColor = colors.ships;
      ctx.shadowBlur = 4;
      ctx.fillStyle = colors.ships;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(0, -2);
      ctx.lineTo(-3, 0);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();

      // Trail
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = colors.ships;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(-7, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();
    },

    particleConfig: function (type) {
      if (type === 'explosion') return { colors: ['#00ff88', '#ff0066', '#00ccff', '#ffffff'], shapes: ['spark', 'triangle'] };
      if (type === 'capture') return { colors: ['#00ff88', '#ffffff', '#00ccff', '#ff0066'], shapes: ['star', 'hexagon'] };
      return { colors: ['#00ff88', '#00ccff', '#333333'], shapes: ['dot', 'spark'] };
    }
  };

  // ----------------------------------------------------------
  //  THEMES registry and accessor
  // ----------------------------------------------------------

  var THEMES = {
    'space': THEME_SPACE,
    'ant-colony': THEME_ANT_COLONY,
    'bee-swarm': THEME_BEE_SWARM,
    'medieval': THEME_MEDIEVAL,
    'neon': THEME_NEON
  };

  function getTheme(id) {
    return THEMES[id] || THEMES['space'];
  }

  // ----------------------------------------------------------
  //  Expose globals
  // ----------------------------------------------------------

  window.THEMES = THEMES;
  window.getTheme = getTheme;
  window.lightenColor = lightenColor;

})();