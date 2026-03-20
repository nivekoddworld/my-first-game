import { Game } from './Game.js';

// Detect mobile
const isMobile = (
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  window.innerWidth < 768
);

// Loading progress simulation
function setLoadProgress(pct, status) {
  const bar = document.getElementById('loading-bar');
  const statusEl = document.getElementById('loading-status');
  if (bar) bar.style.width = `${pct}%`;
  if (statusEl) statusEl.textContent = status;
}

async function init() {
  setLoadProgress(10, 'Initializing renderer...');

  const canvas = document.getElementById('game-canvas');
  const loadingScreen = document.getElementById('loading-screen');
  const overlay = document.getElementById('overlay');
  const hud = document.getElementById('hud');
  const mobileControls = document.getElementById('mobile-controls');

  // Show mobile controls if on mobile
  if (isMobile && mobileControls) {
    mobileControls.style.display = 'block';
    mobileControls.style.pointerEvents = 'none'; // allow pass-through except interactive elements
    // Restore pointer events on interactive children
    mobileControls.querySelectorAll('.joystick-zone, .mobile-btn').forEach(el => {
      el.style.pointerEvents = 'all';
    });
  }

  setLoadProgress(25, 'Generating world...');
  await new Promise(r => setTimeout(r, 100)); // let UI update

  let game = null;

  setLoadProgress(60, 'Loading FNAF characters uwu...');
  await new Promise(r => setTimeout(r, 100));

  setLoadProgress(80, 'Placing kittens OwO...');
  await new Promise(r => setTimeout(r, 100));

  setLoadProgress(95, 'Charging portal gun...');
  await new Promise(r => setTimeout(r, 100));

  setLoadProgress(100, 'Ready!');
  await new Promise(r => setTimeout(r, 300));

  // Hide loading, show start overlay
  if (loadingScreen) loadingScreen.style.display = 'none';
  if (overlay) overlay.style.display = 'flex';

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
    startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });
  }

  async function startGame() {
    if (overlay) overlay.style.display = 'none';

    // Create game
    game = new Game(canvas, isMobile);
    window.game = game; // expose for debugging/automation

    // Show HUD
    if (hud) hud.style.display = 'block';

    // Pointer lock (desktop)
    if (!isMobile) {
      canvas.requestPointerLock();
    }

    // Tab = pause
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        if (game) game.setPaused(!game.paused);
        if (!game.paused && !isMobile) canvas.requestPointerLock();
      }
      if (e.code === 'Escape') {
        if (game && !game.paused) game.setPaused(true);
      }
    });

    // Pointer lock regain on click
    canvas.addEventListener('click', () => {
      if (game && game.paused) game.setPaused(false);
      if (!isMobile && !document.pointerLockElement) canvas.requestPointerLock();
    });

    // Game loop
    function loop() {
      requestAnimationFrame(loop);
      if (game) {
        game.update();
        game.render();
      }
    }
    loop();
  }

  // Resize handler
  window.addEventListener('resize', () => {
    if (game) game.onResize();
  });

  // Prevent scroll on mobile
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchstart', (e) => {
    if (e.target === canvas || e.target === document.body) e.preventDefault();
  }, { passive: false });
}

init().catch(console.error);
