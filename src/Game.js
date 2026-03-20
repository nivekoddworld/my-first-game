import * as THREE from 'three';
import { initNoise } from './world/WorldGen.js';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { FPSCamera } from './player/FPSCamera.js';
import { InputState } from './input/InputManager.js';
import { KeyboardMouse } from './input/KeyboardMouse.js';
import { TouchInput } from './input/TouchInput.js';
import { DodgeRoll } from './mechanics/DodgeRoll.js';
import { GrappleHook } from './mechanics/GrappleHook.js';
import { Slide } from './mechanics/Slide.js';
import { PortalGun } from './mechanics/PortalGun.js';
import { WeaponSystem } from './weapons/WeaponSystem.js';
import { EntityManager } from './entities/EntityManager.js';
import { Particles } from './effects/Particles.js';
import { Rainbow } from './effects/Rainbow.js';
import { BLOCK, CHUNK_W } from './constants.js';

export class Game {
  constructor(canvas, isMobile) {
    this.canvas = canvas;
    this.isMobile = isMobile;
    this.paused = false;

    this._setupRenderer();
    this._setupScene();
    this._setupPlayer();
    this._setupInput(canvas);
    this._setupWorld();
    this._setupMechanics();
    this._setupWeapons();
    this._setupEntities();
    this._setupEffects();
    this._spawnInitialEntities();

    this._lastTime = performance.now();
    this._frameCount = 0;
    this._fps = 60;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, this.isMobile ? 60 : 100, this.isMobile ? 120 : 200);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xFFEECC, 1.2);
    sun.position.set(100, 200, 80);
    sun.castShadow = !this.isMobile;
    if (!this.isMobile) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 300;
      sun.shadow.camera.left = -80;
      sun.shadow.camera.right = 80;
      sun.shadow.camera.top = 80;
      sun.shadow.camera.bottom = -80;
    }
    this.scene.add(sun);
    this.sun = sun;

    // Sky hemisphere
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x4a7c59, 0.4);
    this.scene.add(hemi);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
    this.scene.add(this.camera);
  }

  _setupPlayer() {
    this.player = new Player();
    this.player.position.set(8, 80, 8);
  }

  _setupInput(canvas) {
    this.inputState = new InputState();
    this.keyboardMouse = new KeyboardMouse(this.inputState, canvas);
    if (this.isMobile) {
      this.touchInput = new TouchInput(this.inputState);
    }
  }

  _setupWorld() {
    initNoise(Date.now());
    this.world = new World(this.scene, this.isMobile);
    // Pre-generate spawn area
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        this.world.getOrCreateChunk(dx, dz);
      }
    }
  }

  _setupMechanics() {
    this.dodgeRoll = new DodgeRoll(this.player);
    this.grappleHook = new GrappleHook(this.player, this.world, this.scene);
    this.slide = new Slide(this.player);
    this.portalGun = new PortalGun(this.scene, this.renderer, this.isMobile);
    this.playerController = new PlayerController(this.player, this.world);

    this.fpsCamera = new FPSCamera(this.camera, this.player);
    // Store ref for weapon system ADS
    this.player._fpsCamera = this.fpsCamera;
  }

  _setupWeapons() {
    this.weaponSystem = new WeaponSystem(this.camera, this.portalGun);
  }

  _setupEntities() {
    this.particles = new Particles(this.scene, this.isMobile);
    this.entityManager = new EntityManager(this.scene, this.particles);
  }

  _setupEffects() {
    this.rainbow = new Rainbow(this.scene);
  }

  _spawnInitialEntities() {
    // Spawn a few FNAF and kittens near start
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spawnPos = new THREE.Vector3(
        8 + Math.cos(angle) * 20,
        60,
        8 + Math.sin(angle) * 20
      );
      this.entityManager.spawnFNAF(spawnPos);
    }
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spawnPos = new THREE.Vector3(
        8 + Math.cos(angle) * 10,
        60,
        8 + Math.sin(angle) * 10
      );
      this.entityManager.spawnKitten(spawnPos);
    }
  }

  update() {
    const now = performance.now();
    let dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    dt = Math.min(dt, 0.05); // cap at 50ms to prevent spiral of death

    this._frameCount++;
    if (this._frameCount % 30 === 0) {
      this._fps = Math.round(1 / dt);
    }

    if (this.paused) return;

    const input = this.inputState;

    // --- Look ---
    this.player.yaw -= input.lookDX;
    this.player.pitch -= input.lookDY;
    this.player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.player.pitch));
    input.clearLook();

    // --- Sprint / Crouch state ---
    this.player.isSprinting = input.sprint && !this.player.isCrouching && !this.player.isRolling;
    if (!this.slide.active) {
      this.player.isCrouching = input.crouch;
    }

    // --- Dodge roll ---
    if (input.consumeDodge()) {
      this.dodgeRoll.trigger(input);
    }
    this.dodgeRoll.update(dt);

    // --- Slide ---
    if (input.crouch && this.slide.canSlide()) {
      this.slide.trigger();
    }
    this.slide.update(dt, input);

    // --- Physics / Movement ---
    this.playerController.update(dt, input);

    // --- Grapple ---
    if (input.consumeGrapple()) {
      this.grappleHook.trigger(this.camera);
    }
    this.grappleHook.update(dt, this.camera);

    // --- Portal ---
    this.portalGun.update(dt);
    this.portalGun.checkTeleport(this.player);

    // --- Stamina ---
    const consumingStamina = this.dodgeRoll.isActive;
    this.player.updateStamina(dt, consumingStamina);

    // --- Block interact ---
    if (input.consumeInteract() || input.consumePlace()) {
      this._handleBlockInteract(input);
    }

    // --- Weapons ---
    this.weaponSystem.update(dt, this.player, this.world, this.entityManager, this.particles, input);

    // --- World ---
    this.world.update(this.player.position.x, this.player.position.z);

    // --- Sun follow player ---
    this.sun.position.set(
      this.player.position.x + 100,
      this.player.position.y + 200,
      this.player.position.z + 80
    );

    // --- Entities ---
    this.entityManager.update(dt, this.player, this.world);

    // --- Effects ---
    this.particles.update(dt);
    this.rainbow.update(this.player.position, this.portalGun, dt);

    // Portal sparks
    if (this.portalGun.bluePortal.active) {
      if (Math.random() < 0.3) {
        this.particles.spawnPortalSparks(
          this.portalGun.bluePortal.position.clone().addScaledVector(
            new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5), 1.5
          ),
          '#00aaff'
        );
      }
    }
    if (this.portalGun.orangePortal.active) {
      if (Math.random() < 0.3) {
        this.particles.spawnPortalSparks(
          this.portalGun.orangePortal.position.clone().addScaledVector(
            new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5), 1.5
          ),
          '#ff6600'
        );
      }
    }

    // --- Camera ---
    this.fpsCamera.update(dt);

    // --- HUD updates ---
    this._updateHUD();

    // --- Player respawn ---
    if (this.player.dead) {
      this._handleDead();
    }

    // Mouse wheel weapon switch
    const wheel = this.keyboardMouse.getWheelDelta();
    if (wheel !== 0) {
      const slots = this.weaponSystem.weapons.length;
      const delta = wheel > 0 ? 1 : -1;
      this.weaponSystem.switchTo((this.weaponSystem.currentSlot + delta + slots) % slots);
    }
  }

  render() {
    // Portal views first
    this.portalGun.renderPortalViews(this.camera, this.scene);

    // Main render
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  _handleBlockInteract(input) {
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const hit = this.world.raycast(origin, dir, 6);

    if (hit) {
      if (input.altFire && this.weaponSystem.currentSlot !== 3) {
        // Place block on hit face
        const placePos = {
          x: hit.blockPos.x + hit.normal.x,
          y: hit.blockPos.y + hit.normal.y,
          z: hit.blockPos.z + hit.normal.z,
        };
        // Don't place inside player
        const pp = this.player.position;
        if (
          Math.abs(placePos.x - pp.x) > 0.5 ||
          Math.abs(placePos.z - pp.z) > 0.5 ||
          placePos.y >= pp.y + this.player.height ||
          placePos.y < pp.y - 0.1
        ) {
          this.world.setBlock(placePos.x, placePos.y, placePos.z, this.player.heldBlockId);
        }
      } else {
        // Break block
        this.world.setBlock(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, BLOCK.AIR);
        this.particles.spawnHit(hit.pos, hit.normal, hit.blockId);
      }
    }
  }

  _handleDead() {
    // After 2 seconds, respawn
    if (!this._deathRespawnTimer) this._deathRespawnTimer = 2.5;
    this._deathRespawnTimer -= 0.016;
    if (this._deathRespawnTimer <= 0) {
      this._deathRespawnTimer = null;
      this.player.dead = false;
      this.player.health = this.player.maxHealth;
      this.player.position.set(8, 80, 8);
      this.player.velocity.set(0, 0, 0);
    }
  }

  _updateHUD() {
    const p = this.player;

    // Health bar
    const hb = document.getElementById('health-bar');
    if (hb) hb.style.width = `${(p.health / p.maxHealth) * 100}%`;
    if (hb) {
      const ratio = p.health / p.maxHealth;
      hb.style.background = ratio > 0.5 ? '#e74c3c' : ratio > 0.25 ? '#e67e22' : '#c0392b';
    }

    // Stamina bar
    const sb = document.getElementById('stamina-bar');
    if (sb) sb.style.width = `${(p.stamina / p.maxStamina) * 100}%`;

    // Debug info
    const dbg = document.getElementById('debug-info');
    if (dbg) {
      dbg.textContent = [
        `XYZ: ${p.position.x.toFixed(1)} ${p.position.y.toFixed(1)} ${p.position.z.toFixed(1)}`,
        `FPS: ${this._fps}`,
        `Chunks: ${this.world.chunks.size}`,
        `Entities: ${this.entityManager.entities.length} FNAF | ${this.entityManager.kittens.length} kittens`,
        p.onGround ? 'GROUND' : 'AIR',
      ].join(' | ');
    }

    // Interact hint
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const hit = this.world.raycast(origin, dir, 5);
    const interactHint = document.getElementById('interact-hint');
    if (interactHint) {
      interactHint.style.display = hit ? 'block' : 'none';
      if (hit) interactHint.textContent = `LMB Break | RMB Place (${BLOCK[this.player.heldBlockId] || 'Block'})`;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setPaused(paused) {
    this.paused = paused;
    const pt = document.getElementById('paused-text');
    if (pt) pt.style.display = paused ? 'block' : 'none';
  }
}
