import * as THREE from 'three';
import {
  GRAPPLE_MAX_DIST, GRAPPLE_SPRING_K, GRAPPLE_DAMPING, GRAPPLE_DETACH_BOOST
} from '../constants.js';

export class GrappleHook {
  constructor(player, world, scene) {
    this.player = player;
    this.world = world;
    this.scene = scene;

    this.attached = false;
    this.attaching = false; // projectile flying
    this.attachPoint = new THREE.Vector3();
    this.hookPos = new THREE.Vector3(); // current hook projectile pos
    this.hookVel = new THREE.Vector3();
    this.cooldown = 0;

    // Visual rope
    this._lineGeo = null;
    this._lineMat = null;
    this._line = null;
    this._createLine();
  }

  _createLine() {
    this._lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3()
    ]);
    this._lineMat = new THREE.LineBasicMaterial({ color: 0xccaa88, linewidth: 2 });
    this._line = new THREE.Line(this._lineGeo, this._lineMat);
    this._line.visible = false;
    this._line.frustumCulled = false;
    this.scene.add(this._line);
  }

  trigger(camera) {
    if (this.cooldown > 0) return;
    if (this.attached) {
      this.detach();
      return;
    }

    // Fire hook projectile in look direction
    const origin = camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Instant raycast for grapple target
    const hit = this.world.raycast(origin, dir, GRAPPLE_MAX_DIST);
    if (hit) {
      this.attachPoint.copy(hit.pos);
      this.attached = true;
      this.player.isGrappling = true;
      this._line.visible = true;
      const s = document.getElementById('status-grapple');
      if (s) s.style.display = 'flex';
    }
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    this.player.isGrappling = false;
    this._line.visible = false;
    this.cooldown = 0.5;
    const s = document.getElementById('status-grapple');
    if (s) s.style.display = 'none';
  }

  update(dt, camera) {
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (!this.attached) return;

    const p = this.player;
    const eye = camera.position.clone();
    const toAnchor = this.attachPoint.clone().sub(eye);
    const dist = toAnchor.length();

    // Spring force toward anchor
    const restLen = 2.0;
    const stretch = Math.max(0, dist - restLen);
    const forceMag = GRAPPLE_SPRING_K * stretch;
    const forceDir = toAnchor.normalize();

    p.velocity.addScaledVector(forceDir, forceMag * dt * 4);

    // Damping on velocity component away from anchor
    const velDot = p.velocity.dot(forceDir);
    if (velDot < 0) {
      p.velocity.addScaledVector(forceDir, -velDot * GRAPPLE_DAMPING * dt * 3);
    }

    // Auto-detach if too close or too far
    if (dist < 1.5) {
      this.detach();
      return;
    }

    // Update line
    const pts = [eye, this.attachPoint];
    this._lineGeo.setFromPoints(pts);
    this._lineGeo.attributes.position.needsUpdate = true;

    // Auto-detach on ground (let player land naturally)
    if (p.onGround && p.velocity.y > -0.5) {
      this.detach();
    }
  }
}
