// Game playtest using playwright (which has better WebGL support)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = '/home/user/my-first-game/screenshots';
const URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('Launching browser with playwright...');
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Mock pointer lock
    javaScriptEnabled: true,
  });

  const page = await context.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });
  page.on('pageerror', err => {
    console.error('[pageerror]', err.message);
  });

  // Mock PointerLock API before page load
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function() {
      const event = new Event('pointerlockchange');
      document.dispatchEvent(event);
    };
    Object.defineProperty(document, 'pointerLockElement', {
      get: () => document.querySelector('canvas'),
      configurable: true,
    });
  });

  console.log(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Check WebGL support
  const webglSupport = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'NO WEBGL';
    return `WebGL OK: ${gl.getParameter(gl.RENDERER)}`;
  });
  console.log('WebGL:', webglSupport);

  await page.waitForSelector('#start-btn', { timeout: 15000 });
  await sleep(500);

  // Screenshot 1: Start screen
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_start_screen.png') });
  console.log('Screenshot 1: Start screen ✓');

  // Click the start button
  console.log('Clicking start button...');
  await page.click('#start-btn');
  await sleep(5000); // World gen takes time

  // Check game state
  const gameState = await page.evaluate(() => {
    return typeof window.game !== 'undefined' ? 'found' : 'not found';
  });
  console.log('Game state:', gameState);

  // Screenshot 2: After start
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_game_started.png') });
  console.log('Screenshot 2: Game started ✓');

  await sleep(2000);

  // Screenshot 3: World loaded
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_world_loaded.png') });
  console.log('Screenshot 3: World loaded ✓');

  // Move forward using keyboard
  const pressKey = async (key, duration = 400) => {
    await page.keyboard.down(key);
    await sleep(duration);
    await page.keyboard.up(key);
  };

  const look = async (dx, dy, steps = 1) => {
    for (let i = 0; i < steps; i++) {
      await page.evaluate(({ movementX, movementY }) => {
        const evt = new MouseEvent('mousemove', { bubbles: true });
        Object.defineProperty(evt, 'movementX', { value: movementX, configurable: true });
        Object.defineProperty(evt, 'movementY', { value: movementY, configurable: true });
        document.dispatchEvent(evt);
      }, { movementX: dx, movementY: dy });
      await sleep(30);
    }
  };

  // Walk around
  await pressKey('w', 1000);
  await pressKey('Space', 100);
  await sleep(600);

  // Screenshot 4: Exploring
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_exploring.png') });
  console.log('Screenshot 4: Exploring ✓');

  // Sprint slide
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await sleep(700);
  await page.keyboard.down('Control');
  await sleep(500);
  await page.keyboard.up('Control');
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await sleep(400);

  // Screenshot 5: Sliding
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_sliding.png') });
  console.log('Screenshot 5: Sliding ✓');

  // Fire weapon (left click)
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(640, 360);
    await sleep(200);
  }

  // Screenshot 6: Firing
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_firing.png') });
  console.log('Screenshot 6: Firing ✓');

  // Teleport to kitten - precise positioning directly above & in front
  const kittenResult = await page.evaluate(() => {
    const g = window.game;
    if (!g) return 'no game object';

    const kittens = g.entityManager?.kittens;
    if (!kittens || kittens.length === 0) return 'no kittens';

    // Try all kittens to find one with a valid position
    for (const kitten of kittens) {
      const kp = kitten.position || kitten.group?.position;
      if (!kp) continue;

      console.log('Found kitten at:', kp.x.toFixed(1), kp.y.toFixed(1), kp.z.toFixed(1));

      if (g.player) {
        // Freeze kitten position by setting wander timer very high
        kitten.wanderTimer = 9999;
        // Place player 1.5 units in front of kitten (+z) and 1 unit above
        g.player.position.set(kp.x, kp.y + 1.0, kp.z + 1.8);
        g.player.velocity.set(0, 0, 0);
        // yaw=Math.PI means face toward -z (kitten is in -z from player)
        g.player.yaw = Math.PI;
        // positive pitch = look down toward the kitten on the ground
        g.player.pitch = 0.45;
      }
      return `teleported near kitten at ${kp.x.toFixed(1)}, ${kp.y.toFixed(1)}, ${kp.z.toFixed(1)}`;
    }
    return 'no valid kitten position found';
  });
  console.log('Kitten teleport:', kittenResult);

  await sleep(1500);

  // Screenshot 7: Near kitten - standard view
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_near_kitten.png') });
  console.log('Screenshot 7: Near kitten ✓');

  // Pet the kitten (F = interact)
  await pressKey('f', 100);
  await sleep(600);

  // Screenshot 8: Petting kitten (with heart particles)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_petting_kitten.png') });
  console.log('Screenshot 8: Petting kitten ✓');

  // Extreme close-up of kitten face
  const closeUp = await page.evaluate(() => {
    const g = window.game;
    const kittens = g?.entityManager?.kittens;
    if (!kittens) return 'no kittens array';
    for (const kitten of kittens) {
      const kp = kitten.position || kitten.group?.position;
      if (!kp) continue;
      if (g.player) {
        // Super close - 0.6 units in front, slightly above
        g.player.position.set(kp.x, kp.y + 0.6, kp.z + 0.9);
        g.player.velocity.set(0, 0, 0);
        g.player.yaw = Math.PI;   // face toward kitten (-z)
        g.player.pitch = 0.35;   // look down to see kitten clearly
      }
      return `close up at ${kp.x.toFixed(1)}, ${kp.y.toFixed(1)}, ${kp.z.toFixed(1)}`;
    }
    return 'no kitten for close up';
  });
  console.log('Close up:', closeUp);
  await sleep(800);

  // Screenshot 9: Close-up kitten face
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_kitten_closeup.png') });
  console.log('Screenshot 9: Kitten close-up ✓');

  // Switch weapons
  await page.keyboard.press('2');
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_shotgun.png') });
  console.log('Screenshot 10: Shotgun ✓');

  await page.keyboard.press('3');
  await sleep(500);

  // Teleport to see FNAF enemy
  await page.evaluate(() => {
    const g = window.game;
    if (!g) return;
    const entities = g.entityManager?.entities;
    if (!entities || entities.length === 0) return;
    const fnaf = entities[0];
    const fp = fnaf.position || fnaf.group?.position;
    if (!fp) return;
    console.log('FNAF at:', fp.x.toFixed(1), fp.y.toFixed(1), fp.z.toFixed(1));
    if (g.player) {
      g.player.position.set(fp.x + 3, fp.y + 1.5, fp.z);
      g.player.velocity.set(0, 0, 0);
      g.player.yaw = 0;
      g.player.pitch = -0.05;
    }
  });
  await sleep(1000);

  // Screenshot 11: FNAF encounter
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_fnaf_encounter.png') });
  console.log('Screenshot 11: FNAF encounter ✓');

  // Look at rainbow sky
  await page.evaluate(() => {
    const g = window.game;
    if (!g) return;
    if (g.player) {
      g.player.position.set(8, 72, 8);
      g.player.velocity.set(0, 0, 0);
      g.player.pitch = -0.7; // look up toward rainbow sky (negative = up)
      g.player.yaw = 0.5;
    }
  });
  await sleep(800);

  // Screenshot 12: Rainbow sky
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_rainbow_sky.png') });
  console.log('Screenshot 12: Rainbow sky ✓');

  // Game report
  const finalReport = await page.evaluate(() => {
    const g = window.game;
    if (!g) return { error: 'no game object' };
    return {
      playerHP: g.player?.health,
      playerPos: g.player ? [
        +g.player.position.x.toFixed(1),
        +g.player.position.y.toFixed(1),
        +g.player.position.z.toFixed(1),
      ] : null,
      kittens: g.entityManager?.kittens?.length ?? 0,
      fnaf: g.entityManager?.entities?.length ?? 0,
      weapon: g.weaponSystem?.currentWeapon?.constructor?.name ?? 'unknown',
      fps: g._fps ?? 'unknown',
      paused: g.paused,
      webgl: (() => {
        try {
          const c = document.querySelector('canvas');
          const gl = c?.getContext('webgl');
          return gl ? gl.getParameter(gl.RENDERER) : 'no webgl';
        } catch(e) { return 'error'; }
      })(),
    };
  });
  console.log('\n=== FINAL GAME REPORT ===');
  console.log(JSON.stringify(finalReport, null, 2));

  // Final screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_final.png') });
  console.log('Screenshot 13: Final state ✓');

  await browser.close();
  console.log('\nAll screenshots saved to:', SCREENSHOTS_DIR);

  return finalReport;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
