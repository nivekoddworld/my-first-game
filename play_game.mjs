// Game playtest automation script using puppeteer-core + playwright's chromium
import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
const SCREENSHOTS_DIR = '/home/user/my-first-game/screenshots';
const URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-web-security',
      '--window-size=1280,720',
    ],
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });
  page.on('pageerror', err => {
    const text = `[pageerror] ${err.message}`;
    logs.push(text);
    console.error(text);
  });

  // Mock PointerLock API (headless doesn't support it)
  await page.evaluateOnNewDocument(() => {
    // Stub pointer lock so requestPointerLock doesn't fail silently
    HTMLElement.prototype.requestPointerLock = function() {
      document.dispatchEvent(new Event('pointerlockchange'));
    };
    Object.defineProperty(document, 'pointerLockElement', {
      get: () => document.querySelector('canvas'),
      configurable: true,
    });
  });

  console.log(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('Waiting for overlay to appear...');
  await page.waitForSelector('#start-btn', { timeout: 15000 });
  await sleep(500);

  // Screenshot 1: Start screen
  console.log('Screenshot 1: Start screen');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_start_screen.png') });

  // Click the Start button
  console.log('Clicking start button...');
  await page.click('#start-btn');
  await sleep(3000); // Let Three.js + world gen initialize

  // Screenshot 2: Game just started
  console.log('Screenshot 2: Game loading...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_game_loading.png') });

  // Wait more for world chunks to generate
  await sleep(3000);

  // Screenshot 3: World generated
  console.log('Screenshot 3: World generated');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_world_generated.png') });

  // Expose game object to window for easy access
  const gameExposed = await page.evaluate(() => {
    // The game might be on window.game from main.js
    return typeof window.game !== 'undefined' ? 'yes' : 'no';
  });
  console.log('Game on window.game:', gameExposed);

  // Try to access game directly from the module
  await page.evaluate(() => {
    // Make game accessible - check if main.js set window.game
    if (window.game) {
      window._g = window.game;
    }
  });

  // Log current player position
  const playerInfo = await page.evaluate(() => {
    const g = window.game || window._g;
    if (!g || !g.player) return 'no game object';
    return {
      pos: { x: g.player.position.x.toFixed(1), y: g.player.position.y.toFixed(1), z: g.player.position.z.toFixed(1) },
      hp: g.player.hp,
      kittens: g.entityManager ? g.entityManager.kittens.length : 'unknown',
      entities: g.entityManager ? g.entityManager.entities.length : 'unknown',
    };
  });
  console.log('Player info:', JSON.stringify(playerInfo));

  // Simulate WASD movement by dispatching keyboard events
  const pressKey = async (code, duration = 300) => {
    await page.evaluate((c) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true }));
    }, code);
    await sleep(duration);
    await page.evaluate((c) => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true }));
    }, code);
  };

  const look = async (dx, dy, times = 1) => {
    for (let i = 0; i < times; i++) {
      await page.evaluate((movementX, movementY) => {
        const evt = new MouseEvent('mousemove', { bubbles: true, movementX, movementY });
        Object.defineProperty(evt, 'movementX', { value: movementX, configurable: true });
        Object.defineProperty(evt, 'movementY', { value: movementY, configurable: true });
        document.dispatchEvent(evt);
      }, dx, dy);
      await sleep(16);
    }
  };

  // Move forward to explore terrain
  console.log('Walking forward...');
  await pressKey('KeyW', 1200);
  await sleep(200);

  // Jump!
  await pressKey('Space', 100);
  await sleep(600);

  // Screenshot 4: Exploring terrain
  console.log('Screenshot 4: Exploring terrain');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_exploring_terrain.png') });

  // Sprint + slide
  console.log('Sprint + slide combo...');
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
  });
  await sleep(800);
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlLeft', bubbles: true }));
  });
  await sleep(600);
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ControlLeft', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
  });
  await sleep(400);

  // Screenshot 5: After slide
  console.log('Screenshot 5: After slide');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_sliding.png') });

  // Dodge roll (Q)
  await pressKey('KeyQ', 100);
  await sleep(600);

  // Look around (simulate mouse for camera rotation)
  await look(60, 0, 5);  // rotate right
  await sleep(200);

  // Fire weapon
  console.log('Firing weapon...');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { button: 0, buttons: 1, bubbles: true }));
    });
    await sleep(120);
    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { button: 0, buttons: 0, bubbles: true }));
    });
    await sleep(150);
  }

  // Screenshot 6: Firing weapon
  console.log('Screenshot 6: Firing weapon');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_firing.png') });

  // Now teleport player near a kitten using JS
  console.log('Teleporting to kitten...');
  const kittenTeleport = await page.evaluate(() => {
    const g = window.game;
    if (!g) return 'no game';
    if (!g.entityManager) return 'no entityManager';
    const kittens = g.entityManager.kittens;
    if (!kittens || kittens.length === 0) return 'no kittens found';

    const kitten = kittens[0];
    const kp = kitten.position || kitten.group.position;
    console.log('Kitten position:', kp.x.toFixed(1), kp.y.toFixed(1), kp.z.toFixed(1));

    // Teleport player 2 blocks in front of kitten
    if (g.player) {
      g.player.position.set(kp.x - 2, kp.y + 1, kp.z);
      g.player.vel.set(0, 0, 0);
      // Look at kitten (yaw)
      if (g.camera) {
        g.camera.yaw = Math.atan2(-(kp.z - g.player.position.z), kp.x - g.player.position.x) + Math.PI / 2;
        g.camera.pitch = -0.3;
      }
      return `teleported to ${kp.x.toFixed(1)}, ${kp.y.toFixed(1)}, ${kp.z.toFixed(1)}`;
    }
    return 'no player to teleport';
  });
  console.log('Kitten teleport result:', kittenTeleport);

  await sleep(1000);

  // Look slightly down to see kitten on ground
  await look(0, 30, 3);
  await sleep(300);

  // Screenshot 7: Near kitten
  console.log('Screenshot 7: Near kitten');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_near_kitten.png') });

  // Pet the kitten (F key = interact)
  await pressKey('KeyF', 100);
  await sleep(500);

  // Screenshot 8: Petting kitten
  console.log('Screenshot 8: Petting kitten');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_petting_kitten.png') });

  // Zoom in a bit by looking at kitten more directly
  await look(0, 15, 2);
  await sleep(200);

  // Screenshot 9: Close up of kitten
  console.log('Screenshot 9: Close up of kitten');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_kitten_closeup.png') });

  // Get game state report
  const report = await page.evaluate(() => {
    const g = window.game;
    if (!g) return 'no game found';
    return {
      playerHP: g.player ? g.player.hp : 'N/A',
      playerStamina: g.player ? g.player.stamina?.toFixed(1) : 'N/A',
      playerPos: g.player ? {
        x: g.player.position.x.toFixed(1),
        y: g.player.position.y.toFixed(1),
        z: g.player.position.z.toFixed(1),
      } : 'N/A',
      kittens: g.entityManager ? g.entityManager.kittens.length : 0,
      fnafEntities: g.entityManager ? g.entityManager.entities.length : 0,
      chunks: g.world ? g.world.chunks ? Object.keys(g.world.chunks).length : 'N/A' : 'N/A',
      weapon: g.weaponSystem ? g.weaponSystem.currentWeapon?.constructor?.name : 'N/A',
      paused: g.paused,
    };
  });
  console.log('Game state:', JSON.stringify(report, null, 2));

  // Switch weapons
  await pressKey('Digit2', 100);
  await sleep(600);

  // Screenshot 10: Shotgun equipped
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_shotgun.png') });

  await pressKey('Digit3', 100);
  await sleep(600);

  // Screenshot 11: AR equipped
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_assault_rifle.png') });

  // Teleport to see rainbow sky
  await page.evaluate(() => {
    const g = window.game;
    if (g && g.player) {
      // Move to open area with sky visible
      g.player.position.set(8, 75, 8);
      g.player.vel.set(0, 0, 0);
      if (g.camera) {
        g.camera.pitch = -0.6; // look up at sky/rainbow
      }
    }
  });
  await sleep(800);

  // Look up
  await look(0, -50, 5);
  await sleep(300);

  // Screenshot 12: Rainbow sky
  console.log('Screenshot 12: Rainbow sky');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_rainbow_sky.png') });

  // Look at FNAF enemy
  await page.evaluate(() => {
    const g = window.game;
    if (!g) return;
    const entities = g.entityManager?.entities;
    if (entities && entities.length > 0) {
      const fnaf = entities[0];
      const fp = fnaf.position || fnaf.group?.position;
      if (fp && g.player) {
        g.player.position.set(fp.x - 3, fp.y + 1, fp.z);
        g.player.vel.set(0, 0, 0);
        if (g.camera) {
          g.camera.yaw = Math.atan2(-(fp.z - g.player.position.z), fp.x - g.player.position.x) + Math.PI / 2;
          g.camera.pitch = 0;
        }
        console.log('Teleported to FNAF at:', fp.x.toFixed(1), fp.y.toFixed(1), fp.z.toFixed(1));
      }
    }
  });
  await sleep(800);

  // Screenshot 13: FNAF enemy encounter
  console.log('Screenshot 13: FNAF encounter');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_fnaf_encounter.png') });

  // Final game state screenshot
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_final_state.png') });

  // Print logs summary
  console.log('\n=== GAME LOG SUMMARY ===');
  const gameLogs = logs.filter(l => l.includes('[log]') || l.includes('[warn]'));
  gameLogs.slice(-15).forEach(l => console.log(l));

  await browser.close();
  console.log('\nDone! Screenshots in:', SCREENSHOTS_DIR);
  console.log('Game report:', JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
