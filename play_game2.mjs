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
    javaScriptEnabled: true,
  });

  const page = await context.newPage();

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

  // Click start
  console.log('Clicking start button...');
  await page.click('#start-btn');
  await sleep(5000);

  // Screenshot 2: Game just started
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_game_started.png') });
  console.log('Screenshot 2: Game started ✓');

  await sleep(2000);

  // Screenshot 3: World loaded
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_world_loaded.png') });
  console.log('Screenshot 3: World loaded ✓');

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

  // Walk around and explore
  await pressKey('w', 1200);
  await look(30, 0, 5);
  await pressKey('w', 600);
  await pressKey('Space', 100);
  await sleep(700);

  // Screenshot 4: Exploring the world
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_exploring.png') });
  console.log('Screenshot 4: Exploring ✓');

  // Sprint and slide
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await sleep(700);
  await page.keyboard.down('Control');
  await sleep(500);
  await page.keyboard.up('Control');
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await sleep(400);

  // Screenshot 5: After sliding
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_sliding.png') });
  console.log('Screenshot 5: Sliding ✓');

  // Fire weapon a few times
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(640, 360);
    await sleep(180);
  }

  // Screenshot 6: Firing weapon
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_firing.png') });
  console.log('Screenshot 6: Firing ✓');

  // =========================================================
  // FREDDY FIGHT: Spawn Freddy directly in front and shoot him
  // =========================================================
  const freddySetup = await page.evaluate(() => {
    const g = window.game;
    if (!g || !g.player) return 'no game';

    // Clear existing entities so only Freddy is in the scene
    for (const e of [...g.entityManager.entities]) {
      g.scene.remove(e.group);
    }
    g.entityManager.entities = [];

    // Spawn FNAF entities until we get a Freddy
    let freddy = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const spawnPos = g.player.position.clone();
      spawnPos.z -= 6;
      const e = g.entityManager.spawnFNAF(spawnPos);
      if (e.constructor.name === 'Freddy') {
        freddy = e;
        break;
      } else {
        // Not Freddy - remove it
        g.scene.remove(e.group);
        g.entityManager.entities.pop();
        if (e.dispose) e.dispose();
      }
    }

    if (!freddy) return 'could not spawn Freddy';

    // Position player: elevated slightly, facing Freddy
    const playerPos = g.player.position;
    freddy.position.set(playerPos.x, playerPos.y, playerPos.z - 5.5);
    freddy.group.position.copy(freddy.position);
    freddy.aiState = 'chase';

    // Player faces Freddy straight ahead (yaw=0 looks toward -z)
    g.player.yaw = 0;
    g.player.pitch = 0.1;  // very slight downward tilt
    g.player.velocity.set(0, 0, 0);

    // Restore player health so they aren't dead
    g.player.health = 100;

    return `Freddy spawned at ${freddy.position.x.toFixed(1)}, ${freddy.position.y.toFixed(1)}, ${freddy.position.z.toFixed(1)}`;
  });
  console.log('Freddy setup:', freddySetup);

  // Switch to assault rifle for the fight
  await page.keyboard.press('3');
  await sleep(400);

  await sleep(800); // let Freddy render in frame

  // Screenshot 7: Facing Freddy before shooting
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_freddy_encounter.png') });
  console.log('Screenshot 7: Freddy encounter ✓');

  // Fire at Freddy - burst of shots
  for (let i = 0; i < 8; i++) {
    await page.mouse.click(640, 360);
    await sleep(120);
  }

  // Screenshot 8: Mid-fight, shooting Freddy (health bar should be reduced)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_shooting_freddy.png') });
  console.log('Screenshot 8: Shooting Freddy ✓');

  // Keep firing - more dramatic burst
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(640, 360);
    await sleep(100);
  }

  // Dodge sideways while shooting
  await page.keyboard.down('d');
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(640, 360);
    await sleep(150);
  }
  await page.keyboard.up('d');

  // Screenshot 9: Still fighting Freddy (low health)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_freddy_fight.png') });
  console.log('Screenshot 9: Freddy fight ✓');

  // ========================
  // Kitten section
  // ========================
  const kittenResult = await page.evaluate(() => {
    const g = window.game;
    if (!g) return 'no game object';
    const kittens = g.entityManager?.kittens;
    if (!kittens || kittens.length === 0) return 'no kittens';

    for (const kitten of kittens) {
      const kp = kitten.position || kitten.group?.position;
      if (!kp) continue;
      console.log('Found kitten at:', kp.x.toFixed(1), kp.y.toFixed(1), kp.z.toFixed(1));
      if (g.player) {
        kitten.wanderTimer = 9999;
        g.player.position.set(kp.x, kp.y + 1.0, kp.z + 1.8);
        g.player.velocity.set(0, 0, 0);
        g.player.yaw = Math.PI;
        g.player.pitch = 0.45;
      }
      return `teleported near kitten at ${kp.x.toFixed(1)}, ${kp.y.toFixed(1)}, ${kp.z.toFixed(1)}`;
    }
    return 'no valid kitten position found';
  });
  console.log('Kitten teleport:', kittenResult);

  await sleep(1200);

  // Switch to pistol for the kitten visit
  await page.keyboard.press('1');
  await sleep(300);

  // Screenshot 10: Near kitten
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_near_kitten.png') });
  console.log('Screenshot 10: Near kitten ✓');

  // Pet the kitten
  await pressKey('f', 100);
  await sleep(600);

  // Screenshot 11: Petting kitten
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_petting_kitten.png') });
  console.log('Screenshot 11: Petting kitten ✓');

  // Close-up kitten
  const closeUp = await page.evaluate(() => {
    const g = window.game;
    const kittens = g?.entityManager?.kittens;
    if (!kittens) return 'no kittens array';
    for (const kitten of kittens) {
      const kp = kitten.position || kitten.group?.position;
      if (!kp) continue;
      if (g.player) {
        g.player.position.set(kp.x, kp.y + 0.6, kp.z + 0.9);
        g.player.velocity.set(0, 0, 0);
        g.player.yaw = Math.PI;
        g.player.pitch = 0.35;
      }
      return `close up at ${kp.x.toFixed(1)}, ${kp.y.toFixed(1)}, ${kp.z.toFixed(1)}`;
    }
    return 'no kitten for close up';
  });
  console.log('Close up:', closeUp);
  await sleep(800);

  // Screenshot 12: Kitten close-up
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_kitten_closeup.png') });
  console.log('Screenshot 12: Kitten close-up ✓');

  // Rainbow sky
  await page.evaluate(() => {
    const g = window.game;
    if (!g) return;
    if (g.player) {
      g.player.position.set(8, 72, 8);
      g.player.velocity.set(0, 0, 0);
      g.player.pitch = -0.7;
      g.player.yaw = 0.5;
    }
  });
  await sleep(800);

  // Screenshot 13: Rainbow sky
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_rainbow_sky.png') });
  console.log('Screenshot 13: Rainbow sky ✓');

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

  // Screenshot 14: Final state
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_final.png') });
  console.log('Screenshot 14: Final state ✓');

  await browser.close();
  console.log('\nAll screenshots saved to:', SCREENSHOTS_DIR);

  return finalReport;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
