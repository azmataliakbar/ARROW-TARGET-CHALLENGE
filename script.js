// Arrow Target Challenge - Game Logic
// =====================================

// Sound System (Web Audio API)
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playShootSound() {
    if (!audioCtx || !soundEnabled) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
}

function playHitSound() {
    if (!audioCtx || !soundEnabled) return;
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.start(now);
    osc1.stop(now + 0.08);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.2);
}

function playButtonSound() {
    if (!audioCtx || !soundEnabled) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
}

// Game State
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 500,
    PLAYER_Y_OFFSET: 80,
    ARROW_SPEED: 12,
    TARGET_MIN_SIZE: 40,
    TARGET_MAX_SIZE: 80,
    TARGET_BASE_SPEED: 2,
    GRAVITY: 0.15,
    MAX_ARROWS: 1,
    INITIAL_LIVES: 3,
    MAX_LIVES: 10,
    HIT_POINTS: 10,
    COMBO_MULTIPLIER_BASE: 1,
    PROGRESSION_HITS: 3,
    BONUS_ARROW_EVERY: 3
};

// Game Variables
let canvas, ctx;
let currentState = GameState.MENU;
let score = 0;
let misses = 0;
let lives = CONFIG.INITIAL_LIVES;
let combo = 0;
let consecutiveHits = 0;
let highScore = 0;
let animationId;
let lastTime = 0;

// Input State
let keys = {};
let mouseClicked = false;

// Player Movement
const PLAYER_SPEED = 5;
const PLAYER_MIN_X = 50;
const PLAYER_MAX_X = CONFIG.CANVAS_WIDTH - 50;
const PLAYER_MIN_Y = CONFIG.CANVAS_HEIGHT - 150;
const PLAYER_MAX_Y = CONFIG.CANVAS_HEIGHT - 50;

// Game Objects
let player = {
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    angle: -Math.PI / 2
};

let arrow = null;

let target = {
    x: 0,
    y: 0,
    size: CONFIG.TARGET_MAX_SIZE,
    speed: CONFIG.TARGET_BASE_SPEED,
    direction: 1,
    color: '#ff006e',
    pulsePhase: 0,
    horizontalOffset: 0
};

let particles = [];

// DOM Elements
let scoreElement, missesElement, livesElement, finalScoreElement, highScoreElement;
let gameScreen, gameTitle, gameStats, gameInstructions, mainBtn, resetBtn;
let comboDisplay, comboValueElement;
let gameArea, instructionsBar;
let touchControls, touchLeft, touchRight, touchShoot;

// Canvas scaling
let canvasScale = 1;

function resizeCanvas() {
    const gameArea = document.querySelector('.game-area');
    const availableWidth = gameArea.clientWidth - 20;
    const availableHeight = gameArea.clientHeight - 20;
    
    // Keep internal resolution at 800x500, scale CSS display to fit
    const scale = Math.min(
        availableWidth / CONFIG.CANVAS_WIDTH,
        availableHeight / CONFIG.CANVAS_HEIGHT,
        1 // Don't upscale beyond native
    );
    
    const displayWidth = CONFIG.CANVAS_WIDTH * scale;
    const displayHeight = CONFIG.CANVAS_HEIGHT * scale;
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Internal resolution stays at game world size
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    
    canvasScale = scale;
    
    // Player position relative to game world
    if (player) {
        player.y = CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_Y_OFFSET;
    }
}

// Initialize Game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size responsively
    resizeCanvas();
    
    // Listen for resize
    window.addEventListener('resize', resizeCanvas);
    
    // Get DOM elements
    scoreElement = document.getElementById('score');
    missesElement = document.getElementById('misses');
    livesElement = document.getElementById('lives');
    finalScoreElement = document.getElementById('finalScore');
    highScoreElement = document.getElementById('highScore');
    gameScreen = document.getElementById('gameScreen');
    gameTitle = document.getElementById('gameTitle');
    gameStats = document.getElementById('gameStats');
    gameInstructions = document.getElementById('gameInstructions');
    mainBtn = document.getElementById('mainBtn');
    resetBtn = document.getElementById('resetBtn');
    comboDisplay = document.getElementById('comboDisplay');
    comboValueElement = document.getElementById('comboValue');
    gameArea = document.querySelector('.game-area');
    instructionsBar = document.getElementById('instructionsBar');
    touchControls = document.getElementById('touchControls');
    touchLeft = document.getElementById('touchLeft');
    touchRight = document.getElementById('touchRight');
    touchShoot = document.getElementById('touchShoot');
    
    // Load high score
    highScore = parseInt(localStorage.getItem('arrowTargetHighScore')) || 0;
    
    // Initialize player position
    player.x = canvas.width / 2;
    player.y = canvas.height - CONFIG.PLAYER_Y_OFFSET;
    
    // Initialize target
    resetTarget();
    
    // Event Listeners
    setupEventListeners();
    
    // Touch Controls for mobile
    setupTouchControls();
    
    // Initialize UI state
    // Ensure reset button is always visible
    resetBtn.classList.add('visible');
    if (touchControls) {
        touchControls.classList.remove('active');
    }
    if (instructionsBar) {
        instructionsBar.classList.add('hidden');
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            handleShoot();
        }
        // Prevent scrolling with arrow keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Mouse click for desktop
    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleShoot();
    });
    
    // UI Buttons
    mainBtn.addEventListener('click', () => {
        initAudio();
        playButtonSound();
        if (currentState === GameState.PLAYING) {
            return;
        }
        startGame();
    });
    
    resetBtn.addEventListener('click', () => {
        initAudio();
        resetGame();
    });
}

function setupTouchControls() {
    if (!touchLeft || !touchRight || !touchShoot) return;
    
    // Touch Shoot Button
    const handleTouchShoot = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Visual feedback
        touchShoot.style.transform = 'scale(0.95)';
        setTimeout(() => touchShoot.style.transform = '', 100);
        
        handleShoot();
        return false;
    };
    
    touchShoot.addEventListener('click', handleTouchShoot);
    touchShoot.addEventListener('touchstart', handleTouchShoot, { passive: false });
    
    // Touch Left Button - continuous movement
    const leftStart = (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = true;
        touchLeft.style.transform = 'scale(0.95)';
        return false;
    };
    
    const leftEnd = (e) => {
        if (e) e.preventDefault();
        keys['ArrowLeft'] = false;
        touchLeft.style.transform = '';
        return false;
    };
    
    touchLeft.addEventListener('mousedown', leftStart);
    touchLeft.addEventListener('touchstart', leftStart, { passive: false });
    touchLeft.addEventListener('mouseup', leftEnd);
    touchLeft.addEventListener('mouseleave', leftEnd);
    touchLeft.addEventListener('touchend', leftEnd);
    touchLeft.addEventListener('touchcancel', leftEnd);
    
    // Touch Right Button - continuous movement
    const rightStart = (e) => {
        e.preventDefault();
        keys['ArrowRight'] = true;
        touchRight.style.transform = 'scale(0.95)';
        return false;
    };
    
    const rightEnd = (e) => {
        if (e) e.preventDefault();
        keys['ArrowRight'] = false;
        touchRight.style.transform = '';
        return false;
    };
    
    touchRight.addEventListener('mousedown', rightStart);
    touchRight.addEventListener('touchstart', rightStart, { passive: false });
    touchRight.addEventListener('mouseup', rightEnd);
    touchRight.addEventListener('mouseleave', rightEnd);
    touchRight.addEventListener('touchend', rightEnd);
    touchRight.addEventListener('touchcancel', rightEnd);
}

// Game Control Functions
function startGame() {
    currentState = GameState.PLAYING;
    score = 0;
    misses = 0;
    lives = CONFIG.INITIAL_LIVES;
    combo = 0;
    consecutiveHits = 0;
    arrow = null;
    
    resetTarget();
    target.speed = CONFIG.TARGET_BASE_SPEED;
    target.size = CONFIG.TARGET_MAX_SIZE;
    
    updateUI();
    
    // Ensure canvas is visible
    canvas.style.visibility = 'visible';
    canvas.style.display = 'block';
    
    // Hide game screen overlay
    gameScreen.classList.add('hidden');
    
    // Show touch controls on mobile
    if (touchControls) {
        touchControls.classList.add('active');
    }
    
    // Show instructions during gameplay
    if (instructionsBar) {
        instructionsBar.classList.remove('hidden');
    }
}

function gameOver() {
    currentState = GameState.GAME_OVER;
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('arrowTargetHighScore', highScore);
    }
    
    finalScoreElement.textContent = score;
    highScoreElement.textContent = highScore;
    
    // Show game over screen with updated content
    gameTitle.textContent = 'GAME OVER';
    gameStats.classList.remove('hidden');
    gameInstructions.classList.add('hidden');
    mainBtn.textContent = 'PLAY AGAIN';
    
    // Add compact class for smaller layout
    const panel = gameScreen.querySelector('.panel');
    if (panel) {
        panel.classList.add('compact');
    }
    
    // Show game screen, keep reset visible
    gameScreen.classList.remove('hidden');
    
    // Keep reset button visible (always shown)
    // Hide touch controls
    if (touchControls) {
        touchControls.classList.remove('active');
    }
    
    // Hide instructions bar
    if (instructionsBar) {
        instructionsBar.classList.add('hidden');
    }
}

function resetGame() {
    // Reset to initial state
    currentState = GameState.MENU;
    score = 0;
    misses = 0;
    lives = CONFIG.INITIAL_LIVES;
    combo = 0;
    consecutiveHits = 0;
    arrow = null;
    
    resetTarget();
    target.speed = CONFIG.TARGET_BASE_SPEED;
    target.size = CONFIG.TARGET_MAX_SIZE;
    
    updateUI();
    
    // Show menu screen
    gameTitle.textContent = 'Ready to Aim?';
    gameStats.classList.add('hidden');
    gameInstructions.classList.remove('hidden');
    mainBtn.textContent = 'NEW GAME';
    
    // Remove compact class
    const panel = gameScreen.querySelector('.panel');
    if (panel) {
        panel.classList.remove('compact');
    }
    
    gameScreen.classList.remove('hidden');
    
    // Hide touch controls
    if (touchControls) {
        touchControls.classList.remove('active');
    }
    
    // Hide instructions bar
    if (instructionsBar) {
        instructionsBar.classList.add('hidden');
    }
}

// Game Logic
function handleShoot() {
    // Only shoot if playing and have arrows
    if (currentState !== GameState.PLAYING) return;
    if (arrow !== null) return; // Arrow already in flight
    if (lives <= 0) return; // No arrows left
    
    initAudio();
    
    // Create arrow - start from bow position
    arrow = {
        x: player.x,
        y: player.y - 45,
        vx: 0,
        vy: -CONFIG.ARROW_SPEED,
        width: 6,
        height: 40,
        trail: []
    };
    
    // Add initial trail point
    arrow.trail.push({ x: arrow.x, y: arrow.y, alpha: 1 });
    
    // Create shoot effect
    createShootEffect();
    
    // Play shoot sound
    playShootSound();
}

function resetTarget() {
    // Random horizontal position
    const margin = 100;
    target.x = margin + Math.random() * (canvas.width - margin * 2);
    target.y = canvas.height / 2;
    target.direction = Math.random() > 0.5 ? 1 : -1;
    target.pulsePhase = 0;
    target.horizontalOffset = (Math.random() - 0.5) * 100;
}

function updatePlayerMovement() {
    // Left/Right movement (Arrow keys or A/D)
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= PLAYER_SPEED;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += PLAYER_SPEED;
    }
    
    // Up/Down movement (Arrow keys or W/S) - limited range
    if (keys['ArrowUp'] || keys['KeyW']) {
        player.y -= PLAYER_SPEED;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        player.y += PLAYER_SPEED;
    }
    
    // Dynamic Y bounds based on current canvas height
    const minY = canvas.height - 150;
    const maxY = canvas.height - 50;
    
    // Keep player within bounds
    player.x = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
}

function update(deltaTime) {
    if (currentState !== GameState.PLAYING) return;
    
    // Update player movement
    updatePlayerMovement();
    
    // Update target
    updateTarget(deltaTime);
    
    // Update arrow (only if exists)
    if (arrow !== null) {
        updateArrow();
    }
    
    // Update particles
    updateParticles();
    
    // Check collisions (only if arrow exists)
    if (arrow !== null) {
        checkCollisions();
    }
}

function updateTarget(deltaTime) {
    // Vertical movement
    target.y += target.speed * target.direction;
    
    // Horizontal oscillation
    const time = Date.now() / 1000;
    const oscillation = Math.sin(time * 0.5) * target.horizontalOffset;
    
    // Bounce off edges
    if (target.y < target.size) {
        target.y = target.size;
        target.direction = 1;
    } else if (target.y > canvas.height - target.size - 100) {
        target.y = canvas.height - target.size - 100;
        target.direction = -1;
    }
    
    // Update pulse animation
    target.pulsePhase += deltaTime * 0.003;
}

function updateArrow() {
    // Guard: only process if arrow exists
    if (arrow === null) return;
    
    // Add trail point
    arrow.trail.push({ x: arrow.x, y: arrow.y, alpha: 1 });
    if (arrow.trail.length > 10) {
        arrow.trail.shift();
    }
    
    // Update trail alpha
    arrow.trail.forEach((point, index) => {
        point.alpha = (index + 1) / arrow.trail.length;
    });
    
    // Move arrow
    arrow.x += arrow.vx;
    arrow.y += arrow.vy;
    
    // Apply slight gravity for arc effect
    arrow.vy += CONFIG.GRAVITY;
    
    // Check if arrow is out of bounds (missed target)
    // Check top boundary (arrow went above screen)
    // Check bottom boundary (arrow fell back down due to gravity - happens on tall screens)
    if (arrow.y < -50 || arrow.y > canvas.height + 50 || arrow.x < -50 || arrow.x > canvas.width + 50) {
        // Save arrow position before clearing
        const arrowX = arrow.x;
        const arrowY = arrow.y;
        
        // Immediately clear arrow to prevent double-processing
        arrow = null;
        
        // Increment misses counter
        misses++;
        
        // Decrease lives
        lives--;
        
        // Reset combo
        consecutiveHits = 0;
        combo = 0;
        
        // Visual feedback (pass saved position)
        createMissEffect(arrowX, arrowY);
        
        // Update UI
        updateUI();
        
        // Check for game over
        if (lives <= 0) {
            gameOver();
        }
        // Game continues - player can shoot remaining arrows
        
        return;
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= 0.02;
        p.alpha = p.life;
        return p.life > 0;
    });
}

function checkCollisions() {
    // Guard: only check if arrow exists
    if (arrow === null) return;
    
    // Check collision with target
    const dx = arrow.x - target.x;
    const dy = arrow.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Hit detection
    if (distance < (target.size / 2 + arrow.width)) {
        // Hit! - Process immediately
        
        // Increment consecutive hits
        consecutiveHits++;
        
        // Calculate combo
        combo = Math.floor(consecutiveHits / 3) + 1;
        
        // Calculate score
        const points = CONFIG.HIT_POINTS * combo;
        score += points;
        
        // Create hit effects
        createHitEffect(target.x, target.y);
        
        // Play hit sound
        playHitSound();
        
        // Screen shake
        triggerScreenShake();
        
        // Show combo
        if (combo > 1) {
            showCombo(combo);
        }
        
        // Check for bonus arrow (max 10)
        if (consecutiveHits % CONFIG.BONUS_ARROW_EVERY === 0 && lives < CONFIG.MAX_LIVES) {
            lives++;
            createBonusEffect();
        }
        
        // Increase difficulty
        increaseDifficulty();
        
        // Clear arrow
        arrow = null;
        
        // Move target to new position
        resetTarget();
        
        // Update UI
        updateUI();
    }
}

// handleHit is now integrated into checkCollisions for atomic processing
// This function is kept for potential future use but should not be called directly
function handleHit() {
    console.warn("handleHit() should not be called directly - hit handling is in checkCollisions()");
}

// handleMiss is now integrated into updateArrow for atomic processing
// This function is kept for potential future use but should not be called directly
function handleMiss() {
    console.warn("handleMiss() should not be called directly - miss handling is in updateArrow()");
}

function increaseDifficulty() {
    // Increase speed
    target.speed = Math.min(target.speed + 0.3, 8);
    
    // Decrease size
    target.size = Math.max(target.size - 2, CONFIG.TARGET_MIN_SIZE);
    
    // Increase movement randomness
    target.horizontalOffset = Math.min(target.horizontalOffset + 10, 150);
}

// Effects
function createShootEffect() {
    // Visual feedback at bow position
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: player.x,
            y: player.y - 30,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 4 - 2,
            life: 1,
            alpha: 1,
            color: '#00d4ff',
            size: Math.random() * 4 + 2
        });
    }
}

function createHitEffect(x, y) {
    // Burst of particles
    const colors = ['#ff006e', '#00d4ff', '#ffbe0b', '#7b2cbf'];
    
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = Math.random() * 6 + 3;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            alpha: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 6 + 3
        });
    }
    
    // Add score popup particles
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 1.5,
            alpha: 1,
            color: '#00ff88',
            size: 4,
            isScore: true,
            scoreValue: CONFIG.HIT_POINTS * combo
        });
    }
}

function createMissEffect(missX, missY) {
    // Subtle miss indicator
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: missX,
            y: missY,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 3,
            life: 0.8,
            alpha: 1,
            color: '#ff4444',
            size: Math.random() * 4 + 2
        });
    }
}

function createBonusEffect() {
    // Bonus arrow effect
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.2,
            alpha: 1,
            color: '#ffd700',
            size: Math.random() * 8 + 4
        });
    }
}

function triggerScreenShake() {
    gameArea.classList.add('shake');
    setTimeout(() => {
        gameArea.classList.remove('shake');
    }, 500);
}

function showCombo(multiplier) {
    comboValueElement.textContent = multiplier;
    comboDisplay.classList.add('show');
    
    setTimeout(() => {
        comboDisplay.classList.remove('show');
    }, 1000);
}

// Rendering
function render() {
    // Clear canvas with solid background first
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    drawBackground();
    
    // Draw target
    drawTarget();
    
    // Draw player
    drawPlayer();
    
    // Draw arrow
    if (arrow) {
        drawArrow();
    }
    
    // Draw particles
    drawParticles();
}

function drawBackground() {
    // Draw subtle grid
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw subtle gradient overlay
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, 'rgba(123, 44, 191, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    
    // Draw bow with 3D effect
    ctx.save();
    ctx.translate(x, y);
    
    // Bow shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    
    // Bow body gradient
    const bowGradient = ctx.createLinearGradient(-30, -30, 30, 30);
    bowGradient.addColorStop(0, '#2a1f3d');
    bowGradient.addColorStop(0.5, '#7b2cbf');
    bowGradient.addColorStop(1, '#00d4ff');
    
    // Draw bow arc
    ctx.beginPath();
    ctx.arc(0, 0, 35, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.lineWidth = 8;
    ctx.strokeStyle = bowGradient;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Reset shadow for string
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw bow string
    ctx.beginPath();
    ctx.moveTo(Math.cos(Math.PI * 0.2) * 35, Math.sin(Math.PI * 0.2) * 35);
    ctx.lineTo(0, 15);
    ctx.lineTo(Math.cos(Math.PI * 0.8) * 35, Math.sin(Math.PI * 0.8) * 35);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00d4ff';
    ctx.stroke();
    
    // Draw arrow on bow (if not shot)
    if (!arrow) {
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(0, -25);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-5, -18);
        ctx.lineTo(5, -18);
        ctx.closePath();
        ctx.fillStyle = '#ff006e';
        ctx.fill();
        
        // Feathers
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-6, 18);
        ctx.moveTo(0, 10);
        ctx.lineTo(6, 18);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00d4ff';
        ctx.stroke();
    }
    
    // Glow effect
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 35, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.stroke();
    
    ctx.restore();
}

function drawArrow() {
    if (!arrow) return;
    
    // Draw trail first (in world space)
    arrow.trail.forEach((point, index) => {
        const alpha = point.alpha * 0.6;
        const size = (index + 1) * 1.2;
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.fill();
    });
    
    ctx.save();
    
    // Calculate arrow angle
    const angle = Math.atan2(arrow.vy, arrow.vx) + Math.PI / 2;
    
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(angle);
    
    // Arrow shadow/glow
    ctx.shadowColor = 'rgba(0, 212, 255, 0.9)';
    ctx.shadowBlur = 20;
    
    // Arrow shaft gradient
    const shaftGradient = ctx.createLinearGradient(-3, 0, 3, 0);
    shaftGradient.addColorStop(0, '#0099cc');
    shaftGradient.addColorStop(0.5, '#00d4ff');
    shaftGradient.addColorStop(1, '#0099cc');
    
    // Arrow shaft
    ctx.fillStyle = shaftGradient;
    ctx.fillRect(-3, -20, 6, 40);
    
    // Arrow head
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-6, -18);
    ctx.lineTo(6, -18);
    ctx.closePath();
    ctx.fillStyle = '#ff006e';
    ctx.fill();
    
    // Feathers
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-8, 25);
    ctx.moveTo(0, 15);
    ctx.lineTo(8, 25);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00d4ff';
    ctx.stroke();
    
    ctx.restore();
}

function drawTarget() {
    const x = target.x;
    const y = target.y;
    const size = target.size;
    const pulse = Math.sin(target.pulsePhase) * 0.1 + 1;
    const currentSize = size * pulse;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(0, 0, currentSize * 0.3, 0, 0, currentSize);
    glowGradient.addColorStop(0, 'rgba(255, 0, 110, 0)');
    glowGradient.addColorStop(1, 'rgba(255, 0, 110, 0.3)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Target rings
    const rings = [
        { size: 1, color: '#ff006e' },
        { size: 0.75, color: '#fff' },
        { size: 0.5, color: '#ff006e' },
        { size: 0.25, color: '#ffd700' }
    ];
    
    rings.forEach(ring => {
        ctx.beginPath();
        ctx.arc(0, 0, currentSize * ring.size, 0, Math.PI * 2);
        ctx.fillStyle = ring.color;
        ctx.fill();
        
        // Ring glow
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
    
    // Inner highlight
    ctx.beginPath();
    ctx.arc(-currentSize * 0.1, -currentSize * 0.1, currentSize * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    
    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        if (p.isScore) {
            // Draw score text
            ctx.font = 'bold 20px Orbitron';
            ctx.fillStyle = p.color;
            ctx.textAlign = 'center';
            ctx.fillText(`+${p.scoreValue}`, p.x, p.y);
        } else {
            // Draw particle
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

// UI Updates
function updateUI() {
    // Update score
    scoreElement.textContent = score;
    
    // Update misses
    missesElement.textContent = misses;
    
    // Update lives - show ONLY available arrows (not max)
    livesElement.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        livesElement.innerHTML += '<span class="life-icon active">🏹</span>';
    }
}

// Game Loop
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update(deltaTime);
    render();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', init);
