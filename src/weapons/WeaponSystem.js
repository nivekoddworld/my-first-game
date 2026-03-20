import * as THREE from 'three';
import { Pistol } from './Pistol.js';
import { AssaultRifle } from './AssaultRifle.js';
import { Shotgun } from './Shotgun.js';
import { PortalGunWeapon } from './PortalGunWeapon.js';

export class WeaponSystem {
  constructor(camera, portalGun) {
    this.camera = camera;
    this.portalGun = portalGun;

    // Weapon slots
    this.weapons = [
      new Pistol(),
      new AssaultRifle(),
      new Shotgun(),
      new PortalGunWeapon(portalGun),
    ];

    this.currentSlot = 0;

    // Build models and attach to camera
    this.viewModelGroup = new THREE.Group();
    this.viewModelGroup.renderOrder = 999;
    // Don't frustum cull view model
    this.viewModelGroup.traverse(c => { if (c.isMesh) c.frustumCulled = false; });
    camera.add(this.viewModelGroup);

    for (const weapon of this.weapons) {
      const model = weapon.buildModel();
      model.visible = false;
      // Disable frustum culling on all children
      model.traverse(c => {
        c.frustumCulled = false;
        if (c.isMesh) c.renderOrder = 999;
      });
      this.viewModelGroup.add(model);
    }

    this._showCurrentWeapon();
    this._updateWeaponBar();
  }

  get currentWeapon() {
    return this.weapons[this.currentSlot];
  }

  switchTo(slot) {
    if (slot === this.currentSlot) return;
    if (slot < 0 || slot >= this.weapons.length) return;
    this.weapons[this.currentSlot].modelGroup.visible = false;
    this.currentSlot = slot;
    this._showCurrentWeapon();
    this._updateWeaponBar();
  }

  _showCurrentWeapon() {
    this.currentWeapon.modelGroup.visible = true;
  }

  update(dt, player, world, entities, particles, input) {
    const w = this.currentWeapon;
    w.update(dt);

    // Fire
    const isPortalGun = this.currentSlot === 3;
    if (isPortalGun) {
      if (input.fire) this.portalGun.firePrimary(world, this.camera);
      if (input.altFire) this.portalGun.fireSecondary(world, this.camera);
    } else {
      // Auto or semi
      const shouldFire = w.currentMode === 'auto' ? input.fire : input._justFired;
      if (input.fire) {
        if (w.fireCooldown <= 0) {
          w.fire(player, world, entities, particles);
          // For semi: track just fired
          input._justFired = false;
        }
      }
    }

    // Reload
    if (input.consumeReload()) w.startReload();
    if (input.consumeRack()) w.rackBolt();
    if (input.consumeClearJam()) w.clearJam();
    if (input.consumeInspect()) w.inspectGun();

    // ADS
    const fpsCamera = player._fpsCamera;
    if (fpsCamera) fpsCamera.setADS(input.altFire && !isPortalGun);

    // Weapon switch
    if (input.weaponSlot >= 0) {
      this.switchTo(input.weaponSlot);
      input.weaponSlot = -1;
    }

    this._updateHUD(w);
  }

  _updateHUD(w) {
    const nameEl = document.getElementById('gun-name');
    const ammoEl = document.getElementById('ammo-display');
    const stateEl = document.getElementById('gun-state-line');
    const condEl = document.getElementById('condition-val');
    const magEl = document.getElementById('magazine-bullets');
    const attachEl = document.getElementById('attachment-slot');

    if (nameEl) nameEl.textContent = w.name;
    if (stateEl) stateEl.textContent = w.getStateText();
    if (condEl) condEl.textContent = Math.round(w.condition);

    const isPortal = this.currentSlot === 3;

    if (ammoEl) {
      if (isPortal) {
        ammoEl.innerHTML = '∞ <span>portals</span>';
      } else {
        const inMag = w.bulletsInMag;
        const inChamber = w.chamberLoaded ? 1 : 0;
        const total = inMag + (w.spareMags * w.magCapacity);
        ammoEl.innerHTML = `${inMag + inChamber} <span>/ ${total}</span>`;
      }
    }

    if (magEl && !isPortal) {
      magEl.innerHTML = '';
      for (let i = 0; i < w.magCapacity; i++) {
        const pip = document.createElement('div');
        pip.className = 'bullet-pip' + (w.magazine[i] ? '' : ' empty');
        magEl.appendChild(pip);
      }
      if (w.chamberLoaded) {
        const cPip = document.createElement('div');
        cPip.className = 'bullet-pip chambered';
        magEl.prepend(cPip);
      }
    } else if (magEl && isPortal) {
      magEl.innerHTML = '';
    }

    if (attachEl) {
      const parts = [];
      if (w.attachments?.scope) parts.push(`${w.attachments.scope} scope`);
      if (w.attachments?.suppressor) parts.push('suppressor');
      if (w.attachments?.foregrip) parts.push('foregrip');
      attachEl.textContent = parts.length ? parts.join(', ') : 'None';
    }
  }

  _updateWeaponBar() {
    for (let i = 0; i < this.weapons.length; i++) {
      const el = document.getElementById(`wslot-${i}`);
      if (el) {
        el.className = `weapon-slot${i === this.currentSlot ? ' active' : ''}`;
      }
    }
  }
}
