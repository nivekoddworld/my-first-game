import * as THREE from 'three';

const RAINBOW_COLORS = [
  0xFF0000, // Red
  0xFF7700, // Orange
  0xFFFF00, // Yellow
  0x00DD00, // Green
  0x0088FF, // Blue
  0x8800FF, // Violet
];

export class Rainbow {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildSkyRainbow();
    this._buildPortalRainbows();

    // Slowly rotate to always show
    this._time = 0;
  }

  _buildSkyRainbow() {
    this.arcGroup = new THREE.Group();
    this.group.add(this.arcGroup);

    const numBands = RAINBOW_COLORS.length;
    const baseRadius = 180;
    const bandWidth = 6;

    for (let i = 0; i < numBands; i++) {
      const r = baseRadius - i * bandWidth;
      // Half-torus arc (Pi angle)
      const torusGeo = new THREE.TorusGeometry(r, bandWidth * 0.45, 4, 64, Math.PI);
      const torusMat = new THREE.MeshBasicMaterial({
        color: RAINBOW_COLORS[i],
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const arc = new THREE.Mesh(torusGeo, torusMat);
      arc.rotation.z = Math.PI; // Open side down
      this.arcGroup.add(arc);
    }

    // Position arc high in the sky
    this.arcGroup.position.set(0, 80, -150);
  }

  _buildPortalRainbows() {
    // Small decorative rainbows near portals (handled in update)
    this.portalArcs = [];
  }

  update(playerPos, portalGun, dt) {
    this._time += dt;

    // Sky rainbow follows player (distant)
    this.arcGroup.position.x = playerPos.x;
    this.arcGroup.position.z = playerPos.z - 160;
    this.arcGroup.position.y = playerPos.y + 65;

    // Subtle shimmer
    const shimmer = 0.45 + Math.sin(this._time * 0.8) * 0.08;
    this.arcGroup.children.forEach((child, i) => {
      child.material.opacity = shimmer - i * 0.02;
    });

    // Portal halos
    if (portalGun) {
      this._updatePortalHalos(portalGun);
    }
  }

  _updatePortalHalos(portalGun) {
    // Animated color ring around each portal
    for (const portal of [portalGun.bluePortal, portalGun.orangePortal]) {
      if (!portal.active || !portal.mesh) continue;
      // The glow ring is already built in PortalGun, just animate it
      const ring = portal.mesh.children.find(c => c.isMesh && c.geometry.type === 'TorusGeometry');
      if (ring) {
        ring.rotation.z = this._time * 1.5;
        const pulse = 0.9 + Math.sin(this._time * 4) * 0.1;
        ring.scale.setScalar(pulse);
      }
    }
  }

  addSmallRainbow(pos) {
    // A small rainbow arc at a position (e.g., kitten location)
    const arcGrp = new THREE.Group();
    for (let i = 0; i < RAINBOW_COLORS.length; i++) {
      const geo = new THREE.TorusGeometry(2.5 - i * 0.3, 0.15, 4, 20, Math.PI);
      const mat = new THREE.MeshBasicMaterial({
        color: RAINBOW_COLORS[i],
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const arc = new THREE.Mesh(geo, mat);
      arc.rotation.z = Math.PI;
      arcGrp.add(arc);
    }
    arcGrp.position.copy(pos);
    this.scene.add(arcGrp);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      this.scene.remove(arcGrp);
      arcGrp.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }, 3000);
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
}
