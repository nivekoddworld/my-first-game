import * as THREE from 'three';

export class PortalGunWeapon {
  constructor(portalGun) {
    this.name = 'Portal Gun';
    this.portalGun = portalGun;
    this.animState = 'idle';
    this.fireCooldown = 0;
    this.modelGroup = null;
    // Fake state for HUD compatibility
    this.bulletsInMag = Infinity;
    this.chamberLoaded = true;
    this.chamberJammed = false;
    this.condition = 100;
    this.attachments = { scope: null, suppressor: false, foregrip: false };
    this.spareMags = Infinity;
    this.totalAmmo = Infinity;
    this.currentMode = 'portal';
  }

  buildModel() {
    const g = new THREE.Group();

    // Main body (futuristic white)
    const bodyGeo = new THREE.BoxGeometry(0.07, 0.08, 0.38);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    g.add(body);

    // Barrel with glowing ring
    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.18, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0, 0, -0.28);
    g.add(barrel);

    // Blue portal emitter ring
    const ringGeo = new THREE.TorusGeometry(0.035, 0.008, 8, 16);
    const ringMatB = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    const ringB = new THREE.Mesh(ringGeo, ringMatB);
    ringB.position.set(-0.02, 0, -0.36);
    ringB.rotation.y = Math.PI / 2;
    g.add(ringB);

    // Orange portal emitter ring
    const ringMatO = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const ringO = new THREE.Mesh(ringGeo.clone(), ringMatO);
    ringO.position.set(0.02, 0, -0.36);
    ringO.rotation.y = Math.PI / 2;
    g.add(ringO);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.055, 0.12, 0.07);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.1, 0);
    g.add(grip);

    // Aperture Science logo (cute version — just a sphere)
    const logoGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const logoMat = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, 0.05, 0);
    g.add(logo);

    g.position.set(0.2, -0.16, -0.28);
    this.modelGroup = g;
    return g;
  }

  fire(player, world) {
    // Handled by PortalGun directly
  }

  update(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.modelGroup) {
      // Gentle floating animation
      this.modelGroup.position.y = -0.16 + Math.sin(Date.now() * 0.003) * 0.005;
    }
  }

  startReload() {} // no reload
  rackBolt() {}
  clearJam() {}
  cycleFireMode() {}
  inspectGun() {}
  canFire() { return true; }

  getStateText() {
    const b = this.portalGun.bluePortal.active ? '🔵' : '⬜';
    const o = this.portalGun.orangePortal.active ? '🟠' : '⬜';
    return `LMB=${b} RMB=${o} | LMB/RMB to place portals`;
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
