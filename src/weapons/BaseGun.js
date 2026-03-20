import * as THREE from 'three';

export class BaseGun {
  constructor(params) {
    this.name = params.name;
    this.magCapacity = params.magCapacity;
    this.fireRate = params.fireRate;
    this.damage = params.damage;
    this.recoilX = params.recoilX;
    this.recoilY = params.recoilY;
    this.spread = params.spread;
    this.range = params.range;
    this.reloadTime = params.reloadTime;
    this.rackTime = params.rackTime || 0.35;
    this.modes = params.modes || ['semi'];
    this.jamChanceBase = params.jamChanceBase || 0.001;
    this.pellets = params.pellets || 1;
    this.shellByShell = params.shellByShell || false;

    // State
    this.magazine = Array(this.magCapacity).fill(true); // true = loaded
    this.chamberLoaded = false;
    this.chamberJammed = false;
    this.condition = 100;
    this.currentMode = this.modes[0];

    // Extra mags (tarkov style)
    this.spareMags = 3;

    // Attachments
    this.attachments = {
      scope: null,    // null | '2x' | '4x'
      suppressor: false,
      foregrip: false,
    };

    // Anim state
    this.animState = 'idle';
    this.animTimer = 0;
    this.fireCooldown = 0;

    // Reloading sub-state
    this._reloadPhase = 0; // 0=not, 1=ejecting, 2=inserting, 3=done
    this._shellsToLoad = 0; // for shell-by-shell

    // Gun model
    this.model = null;
    this.modelGroup = null;

    // Recoil accumulator
    this._recoilPitch = 0;
    this._recoilYaw = 0;
  }

  // Returns the current magazine bullet count
  get bulletsInMag() {
    return this.magazine.filter(Boolean).length;
  }

  get totalAmmo() {
    return this.bulletsInMag + (this.chamberLoaded ? 1 : 0);
  }

  canFire() {
    return (
      this.fireCooldown <= 0 &&
      this.animState !== 'reloading' &&
      this.animState !== 'racking' &&
      this.animState !== 'clearing' &&
      !this.chamberJammed &&
      this.chamberLoaded
    );
  }

  fire(player, world, entities, particles) {
    if (!this.canFire()) return false;

    // Chamber a new bullet
    this.chamberLoaded = false;

    // Wear
    this.condition = Math.max(0, this.condition - 0.3);

    // Jam check
    const jamChance = this.jamChanceBase * (1 + (100 - this.condition) * 0.05);
    if (Math.random() < jamChance) {
      this.chamberJammed = true;
      this.chamberLoaded = true; // bullet stuck
      this.animState = 'jammed';
      this._updateJamHUD(true);
      return false;
    }

    // Recoil
    this._recoilPitch += this.recoilY + (Math.random() - 0.5) * this.recoilY * 0.3;
    this._recoilYaw += (Math.random() - 0.5) * this.recoilX * 2;

    this.fireCooldown = this.fireRate;
    this.animState = 'firing';
    this.animTimer = 0.08;

    // Raycast (with spread)
    const eye = player.eyePosition;
    const dir = player.getLookDirection();

    for (let i = 0; i < this.pellets; i++) {
      const spreadDir = dir.clone();
      spreadDir.x += (Math.random() - 0.5) * this.spread * 2;
      spreadDir.y += (Math.random() - 0.5) * this.spread * 2;
      spreadDir.z += (Math.random() - 0.5) * this.spread * 2;
      spreadDir.normalize();

      // Hit entities
      if (entities) {
        const hit = entities.raycastEntities(eye, spreadDir, this.range);
        if (hit) {
          hit.entity.takeDamage(this.damage, particles);
        }
      }

      // Hit world (show break particles)
      const worldHit = world.raycast(eye, spreadDir, this.range);
      if (worldHit && particles) {
        particles.spawnHit(worldHit.pos, worldHit.normal, worldHit.blockId);
      }
    }

    // Camera shake
    player.addShake(
      (Math.random() - 0.5) * this.recoilX * 30,
      -this.recoilY * 15
    );

    // Try to auto-chamber next bullet
    this._chamberNext();

    return true;
  }

  _chamberNext() {
    // Find next loaded bullet in mag
    for (let i = this.magazine.length - 1; i >= 0; i--) {
      if (this.magazine[i]) {
        this.magazine[i] = false;
        this.chamberLoaded = true;
        return;
      }
    }
    this.chamberLoaded = false; // empty
  }

  // Start reload sequence
  startReload() {
    if (this.animState === 'reloading') return;
    if (this.spareMags <= 0) return;

    if (this.shellByShell) {
      // Shell-by-shell: load one shell
      const missing = this.magCapacity - this.bulletsInMag - (this.chamberLoaded ? 1 : 0);
      if (missing <= 0) return;
      this._shellsToLoad = missing;
      this.animState = 'reloading';
      this.animTimer = this.reloadTime;
    } else {
      this._reloadPhase = 1; // eject mag
      this.animState = 'reloading';
      this.animTimer = 0.5;
    }
  }

  rackBolt() {
    if (this.animState === 'racking' || this.animState === 'reloading') return;
    if (this.chamberLoaded) return; // already chambered

    const hasBullet = this.magazine.some(Boolean);
    if (!hasBullet) return;

    this.animState = 'racking';
    this.animTimer = this.rackTime;
  }

  clearJam() {
    if (!this.chamberJammed) return;
    this.animState = 'clearing';
    this.animTimer = 0.8;
  }

  inspectGun() {
    if (this.animState !== 'idle' && this.animState !== 'firing') return;
    this.animState = 'inspecting';
    this.animTimer = 2.0;
  }

  update(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // Recoil recovery
    this._recoilPitch *= Math.pow(0.05, dt);
    this._recoilYaw *= Math.pow(0.05, dt);

    if (this.animTimer > 0) {
      this.animTimer -= dt;
      if (this.animTimer <= 0) {
        this._onAnimEnd();
      }
    }

    this._updateModel(dt);
  }

  _onAnimEnd() {
    if (this.animState === 'firing') {
      this.animState = 'idle';
    } else if (this.animState === 'racking') {
      this._chamberNext();
      this.animState = 'idle';
    } else if (this.animState === 'clearing') {
      this.chamberJammed = false;
      this.chamberLoaded = false;
      this.animState = 'idle';
      this._chamberNext();
      this._updateJamHUD(false);
    } else if (this.animState === 'reloading') {
      this._processReload();
    } else if (this.animState === 'inspecting') {
      this.animState = 'idle';
    }
  }

  _processReload() {
    if (this.shellByShell) {
      // Load one shell
      for (let i = 0; i < this.magazine.length; i++) {
        if (!this.magazine[i]) {
          this.magazine[i] = true;
          break;
        }
      }
      this._shellsToLoad--;
      if (this._shellsToLoad > 0) {
        this.animTimer = this.reloadTime; // next shell
      } else {
        this.animState = 'idle';
        if (!this.chamberLoaded) this.rackBolt();
      }
    } else {
      if (this._reloadPhase === 1) {
        // Eject done, insert new mag
        this._reloadPhase = 2;
        this.animTimer = 0.6;
      } else if (this._reloadPhase === 2) {
        // Insert done
        this.spareMags--;
        this.magazine = Array(this.magCapacity).fill(true);
        this._reloadPhase = 0;
        this.animState = 'idle';
        if (!this.chamberLoaded) this.rackBolt();
      }
    }
  }

  getStateText() {
    if (this.chamberJammed) return '⚠ JAM - Press T to clear';
    if (!this.chamberLoaded) return 'EMPTY CHAMBER - Press B to rack';
    if (this.animState === 'reloading') return 'RELOADING...';
    if (this.animState === 'racking') return 'RACKING BOLT...';
    if (this.animState === 'clearing') return 'CLEARING JAM...';
    if (this.animState === 'inspecting') return 'INSPECTING...';
    return `${this.currentMode.toUpperCase()} | ${this.attachments.suppressor ? 'SUPPRESSED' : 'LOUD'}`;
  }

  _updateJamHUD(jammed) {
    const el = document.getElementById('status-jammed');
    if (el) el.style.display = jammed ? 'flex' : 'none';
  }

  cycleFireMode() {
    const idx = this.modes.indexOf(this.currentMode);
    this.currentMode = this.modes[(idx + 1) % this.modes.length];
  }

  _updateModel(dt) {
    if (!this.modelGroup) return;
    // Firing kick
    const kick = this.animState === 'firing' ? 0.05 : 0;
    this.modelGroup.position.z = 0.1 + kick * Math.sin(this.animTimer * 40);
    this.modelGroup.rotation.x = this._recoilPitch;
  }

  buildModel(scene) {
    // Override in subclasses
    this.modelGroup = new THREE.Group();
    return this.modelGroup;
  }

  dispose() {
    if (this.modelGroup) {
      this.modelGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
  }
}
