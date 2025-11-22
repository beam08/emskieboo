// main.js — moved from inline script. This file initializes the visuals and effects.

// Utility: random helpers
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Color sets
const COLORS = [
    "#ff6fb5", "#ff8ad4", "#ffd166", "#7bf1a8", "#8ab4ff", "#b388ff", "#ff9f1c", "#00d1ff"
];

// Runtime caps to avoid creating too many DOM nodes/animations
let CURRENT_SPARKLES = 0, MAX_SPARKLES = 140;
let CURRENT_HEARTS = 0, MAX_HEARTS = 100;
let CURRENT_CONFETTI = 0, MAX_CONFETTI = 120;

// Mobile / touch detection -> reduce effects for phones/tablets
const IS_TOUCH = (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
// Base tile size and tile cap adjusted for mobile
const TILE_SIZE_BASE = IS_TOUCH ? 220 : 140;
const MAX_TILES_BASE = IS_TOUCH ? 180 : 420;
// Pointer trail throttle (ms)
let POINTER_THROTTLE_MS = IS_TOUCH ? 140 : 60;
// Idle behaviour tuning
const IDLE_INTERVAL = IS_TOUCH ? 14000 : 8000;
const START_HEARTS = IS_TOUCH ? 6 : 12;
const START_CONFETTI = IS_TOUCH ? 12 : 36;
const START_SPARKLES = IS_TOUCH ? 8 : 20;
// Reveal speed default
const REVEAL_SPEED_DEFAULT = IS_TOUCH ? 500 : 350;

// Emit floating hearts
function emitHearts(count = 22) {
    // cap concurrent hearts
    const allowed = Math.max(0, Math.min(count, MAX_HEARTS - CURRENT_HEARTS));
    for (let i = 0; i < allowed; i++) {
        CURRENT_HEARTS++;
        const h = document.createElement("div");
        h.className = "heart";
        const left = rand(0, 100);
        h.style.left = left + "vw";
        h.style.bottom = "-5vh";
        const dur = rand(6, 12) + "s";
        h.style.setProperty("--dur", dur);
        h.style.filter = `drop-shadow(0 0 18px ${pick(COLORS)}80)`;
        document.body.appendChild(h);
        setTimeout(() => { h.remove(); CURRENT_HEARTS--; }, (parseFloat(dur) * 1000));
    }
}

// Emit sparkles
function emitSparkles(count = 50) {
    // cap concurrent sparkles
    const allowed = Math.max(0, Math.min(count, MAX_SPARKLES - CURRENT_SPARKLES));
    for (let i = 0; i < allowed; i++) {
        CURRENT_SPARKLES++;
        const s = document.createElement("div");
        s.className = "sparkle";
        s.style.left = rand(0, 100) + "vw";
        s.style.top = rand(0, 100) + "vh";
        const sdur = rand(1.2, 3.2) + "s";
        s.style.setProperty("--sdur", sdur);
        document.body.appendChild(s);
        setTimeout(() => { s.remove(); CURRENT_SPARKLES--; }, 3600);
    }
}

// Emit confetti
function emitConfetti(count = 80) {
    const allowed = Math.max(0, Math.min(count, MAX_CONFETTI - CURRENT_CONFETTI));
    for (let i = 0; i < allowed; i++) {
        CURRENT_CONFETTI++;
        const c = document.createElement("div");
        c.className = "confetti";
        const w = rand(6, 10), h = rand(12, 18);
        c.style.width = w + "px";
        c.style.height = h + "px";
        c.style.left = rand(0, 100) + "vw";
        c.style.top = rand(-20, -5) + "vh";
        c.style.background = pick(COLORS);
        c.style.transform = `translateY(-10vh) rotate(${rand(0, 360)}deg)`;
        c.style.setProperty("--cdur", rand(3.5, 7.5) + "s");
        c.style.setProperty("--spin", rand(0.6, 2.2) + "s");
        document.body.appendChild(c);
        setTimeout(() => { c.remove(); CURRENT_CONFETTI--; }, 8000);
    }
}

// The heavy runtime setup will run when main.js is loaded after auth.
(function runtimeInit() {
    // Pointer star trail (throttled to reduce churn). Disabled on touch-only devices.
    (function () {
        if (IS_TOUCH) return; // skip pointer trail on touch devices
        let lastPointer = 0;
        window.addEventListener("pointermove", (e) => {
            const now = Date.now();
            if (now - lastPointer < POINTER_THROTTLE_MS) return;
            lastPointer = now;
            const t = document.createElement("div");
            t.className = "trail";
            t.style.left = (e.clientX + rand(-6, 6)) + "px";
            t.style.top = (e.clientY + rand(-6, 6)) + "px";
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 600);
        }, { passive: true });
    })();

    // Idle bursts
    function randomBurst() {
        const choice = Math.random();
        if (choice < .33) {
            // smaller on touch devices
            emitHearts(rand(IS_TOUCH ? 6 : 12, IS_TOUCH ? 12 : 22));
        } else if (choice < .66) {
            emitConfetti(rand(IS_TOUCH ? 18 : 50, IS_TOUCH ? 40 : 100));
        } else {
            emitSparkles(rand(IS_TOUCH ? 8 : 30, IS_TOUCH ? 20 : 80));
        }
    }
    // Idle bursts: reduce frequency and sizes to save CPU
    setInterval(randomBurst, IDLE_INTERVAL);
    setTimeout(() => emitHearts(START_HEARTS), 600);
    setTimeout(() => emitConfetti(START_CONFETTI), 1400);
    setTimeout(() => emitSparkles(START_SPARKLES), 2200);

    // CTA: bigger show + play music + start background slideshow/collage
    const music = document.getElementById("bg-music");
    document.getElementById("cta").addEventListener("click", () => {
        emitHearts(40);
        emitConfetti(160);
        emitSparkles(120);

        // Start slow background slideshow if available
        try {
            if (window.__bgSlideshow && typeof window.__bgSlideshow.startSlideshow === 'function') {
                window.__bgSlideshow.startSlideshow();
            }
        } catch (e) {
            console.warn('Slideshow start error', e);
        }

        // Start collage reveal (black & white -> color) if available
        try {
            if (window.__bgCollage && typeof window.__bgCollage.startReveal === 'function') {
                window.__bgCollage.startReveal();
            }
        } catch (e) {
            console.warn('Collage start error', e);
        }

        // Play music
        music.currentTime = 0;
        music.play().catch(err => console.log("Autoplay blocked:", err));
    });

    /* Background slow slideshow implementation */
    (function () {
        const shufflerEl = document.getElementById('bg-shuffler');

        // Default image paths (relative to this HTML). Place these files next to this file.
        const DEFAULT_PATHS = ['image/bg1.png', 'image/bg2.png', 'image/bg3.png', 'image/bg4.png', 'image/bg5.png',
            'image/bg6.png', 'image/bg7.png', 'image/bg8.png', 'image/bg9.png', 'image/bg10.png',
            'image/bg11.png', 'image/bg12.png', 'image/bg13.png', 'image/bg14.png', 'image/bg15.png',
            'image/bg16.png', 'image/bg17.png', 'image/bg18.png', 'image/bg19.png', 'image/bg20.png',
            'image/bg21.png', 'image/bg22.png', 'image/bg23.png', 'image/bg24.png', 'image/bg25.png',
            'image/bg26.png', 'image/bg27.png', 'image/bg28.png', 'image/bg29.png', 'image/bg30.png',
            'image/bg31.png', 'image/bg32.png', 'image/bg33.png', 'image/bg34.png', 'image/bg35.png',
            'image/bg36.png', 'image/bg37.png', 'image/bg38.png', 'image/bg39.png', 'image/bg40.png',
            'image/bg41.png', 'image/bg42.png',
        ];

        let slides = [];
        let current = 0;
        let timer = null;
        const INTERVAL = 7000; // ms between slides

        function createSlide(url) {
            const d = document.createElement('div');
            d.className = 'bg-slide';
            d.style.backgroundImage = `url(${url})`;
            shufflerEl.appendChild(d);
            return d;
        }

        function showSlide(idx) {
            const els = shufflerEl.children;
            for (let i = 0; i < els.length; i++) els[i].classList.remove('show');
            if (els[idx]) els[idx].classList.add('show');
        }

        function startSlideshow() {
            if (timer) return; // already running
            if (slides.length === 0) return;
            showSlide(current);
            timer = setInterval(() => {
                current = (current + 1) % slides.length;
                showSlide(current);
            }, INTERVAL);
        }

        function stopSlideshow() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        // preload defaults (async decoding to avoid blocking)
        DEFAULT_PATHS.forEach(p => {
            const img = new Image();
            try { img.decoding = 'async'; } catch (e) {}
            img.onload = () => {
                slides.push(p);
                createSlide(p);
                if (slides.length === 1) showSlide(0);
            };
            img.onerror = () => {
                // file missing or unreachable — ignore
            };
            img.src = p;
        });

        window.__bgSlideshow = { startSlideshow, stopSlideshow };
    })();

    /* Background collage: build a black & white mosaic and reveal tiles randomly */
    (function () {
        const container = document.getElementById('bg-collage');
        if (!container) return;

        const DEFAULT_PATHS = ['image/bg1.png', 'image/bg2.png', 'image/bg3.png', 'image/bg4.png', 'image/bg5.png',
            'image/bg6.png', 'image/bg7.png', 'image/bg8.png', 'image/bg9.png', 'image/bg10.png',
            'image/bg11.png', 'image/bg12.png', 'image/bg13.png', 'image/bg14.png', 'image/bg15.png',
            'image/bg16.png', 'image/bg17.png', 'image/bg18.png', 'image/bg19.png', 'image/bg20.png',
            'image/bg21.png', 'image/bg22.png', 'image/bg23.png', 'image/bg24.png', 'image/bg25.png',
            'image/bg26.png', 'image/bg27.png', 'image/bg28.png', 'image/bg29.png', 'image/bg30.png',
            'image/bg31.png', 'image/bg32.png', 'image/bg33.png', 'image/bg34.png', 'image/bg35.png',
            'image/bg36.png', 'image/bg37.png', 'image/bg38.png', 'image/bg39.png', 'image/bg40.png',
            'image/bg41.png', 'image/bg42.png',
        ];
        let TILE_SIZE = TILE_SIZE_BASE; // px approximate; adjusted for mobile
        let tiles = [];
        let revealed = new Set();
        let revealTimer = null;

        function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            }
            return arr;
        }

        function buildMosaic() {
            // clear previous
            container.innerHTML = '';
            tiles = [];
            revealed.clear();

            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            let cols = Math.ceil(vw / TILE_SIZE) + 1;
            let rows = Math.ceil(vh / TILE_SIZE) + 1;
            const w = Math.ceil(vw / cols);
            const h = Math.ceil(vh / rows);

            let needed = cols * rows;

            // If needed tiles is very large, increase TILE_SIZE so we cap total tiles
            const MAX_TILES = MAX_TILES_BASE;
            if (needed > MAX_TILES) {
                // compute a new tile size to reduce tiles to roughly MAX_TILES
                const area = vw * vh;
                const targetTileArea = Math.ceil(area / MAX_TILES);
                const newTileSide = Math.max(TILE_SIZE_BASE, Math.ceil(Math.sqrt(targetTileArea)));
                const newCols = Math.ceil(vw / newTileSide) + 1;
                const newRows = Math.ceil(vh / newTileSide) + 1;
                // apply new grid
                cols = newCols;
                rows = newRows;
                needed = cols * rows;
                TILE_SIZE = newTileSide;
            }

            // Build a pool of image paths large enough to cover tiles, then shuffle
            let pool = [];
            if (DEFAULT_PATHS.length > 0) {
                while (pool.length < needed) pool = pool.concat(DEFAULT_PATHS.slice());
                shuffleArray(pool);
                pool = pool.slice(0, needed);
            }

            let idx = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const t = document.createElement('div');
                    t.className = 'bg-tile';
                    const url = pool[idx] || '';
                    t.style.left = (c * w) + 'px';
                    t.style.top = (r * h) + 'px';
                    t.style.width = w + 'px';
                    t.style.height = h + 'px';
                    t.style.backgroundImage = url ? `url(${url})` : '';
                    container.appendChild(t);
                    tiles.push(t);
                    idx++;
                }
            }
        }

        function revealNext() {
            let idx;
            do { idx = Math.floor(Math.random() * tiles.length); } while (revealed.has(idx));
            revealed.add(idx);
            tiles[idx].classList.add('reveal');

            // If we've just revealed the last tile, stop and celebrate
            if (revealed.size >= tiles.length) {
                stopReveal();
                // small delay so last reveal transition finishes
                setTimeout(() => {
                    try { emitSparkles(IS_TOUCH ? 36 : 80); } catch (e) { /* emitSparkles may be undefined in some contexts */ }
                    try { emitHearts(IS_TOUCH ? 12 : 26); } catch (e) { }
                }, 400);
            }
        }

        function startReveal(speed) {
            if (!tiles.length) buildMosaic();
            if (revealTimer) return;
            const s = (typeof speed === 'number') ? speed : REVEAL_SPEED_DEFAULT;
            revealTimer = setInterval(() => revealNext(), s);
        }

        function stopReveal() {
            if (revealTimer) { clearInterval(revealTimer); revealTimer = null; }
        }

        // rebuild mosaic on resize to keep tiles neat
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                stopReveal();
                buildMosaic();
            }, 300);
        });

        // initial build (no reveal yet)
        buildMosaic();

        window.__bgCollage = { startReveal, stopReveal, buildMosaic };
    })();

})();
