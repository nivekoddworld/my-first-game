import * as THREE from 'three';
import { FNAFBase } from './FNAFBase.js';
import { FNAF_CHASE_SPEED } from '../constants.js';

// Cute UWU Foxy - red fox pirate
export class Foxy extends FNAFBase {
  constructor(...args) {
    super(...args);
    // Foxy runs faster!
    this.speed = FNAF_CHASE_SPEED * 1.3;
  }

  _buildMesh() {
    const g = this.group;

    // Body (tattered look with red-brown)
    this._makeBox(0.82, 1.08, 0.62, 0xCC4400, 0, 0.74, 0);

    // Tattered cloth strips
    for (let i = 0; i < 3; i++) {
      this._makeBox(0.12, 0.3, 0.05, 0x8B3300, -0.3 + i * 0.3, 0.38, 0.32);
    }

    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.62, 0);
    g.add(this.head);
    this._makeSphere(0.50, 0xCC4400, 0, 0, 0, this.head);

    // Fox muzzle (elongated snout)
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -0.08, 0.3);
    this._makeBox(0.28, 0.2, 0.3, 0xFFD700, 0, 0, 0, muzzle);
    this._makeSphere(0.055, 0x111111, 0, 0.08, 0.17, muzzle); // nose
    this.head.add(muzzle);

    // Fox ears (pointy)
    for (const sx of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.12, 0.32, 4);
      const earMat = new THREE.MeshLambertMaterial({ color: 0xCC4400 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(sx * 0.3, 0.5, -0.1);
      this.head.add(ear);
      // Inner (lighter)
      const innerGeo = new THREE.ConeGeometry(0.07, 0.2, 4);
      const innerMat = new THREE.MeshLambertMaterial({ color: 0xFF8855 });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(sx * 0.3, 0.5, -0.05);
      this.head.add(inner);
    }

    // Cute UWU eyes (one with eyepatch)
    // Left eye normal
    const eyeWhite = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    eyeWhite.position.set(-0.2, 0.1, 0.41);
    this.head.add(eyeWhite);
    const pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.065, 12),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
    );
    pupil.position.set(-0.2, 0.1, 0.42);
    this.head.add(pupil);
    const star = new THREE.Mesh(
      new THREE.CircleGeometry(0.025, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    star.position.set(-0.17, 0.14, 0.43);
    this.head.add(star);
    // Blush
    const blush = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 10),
      new THREE.MeshBasicMaterial({ color: 0xff9999, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    blush.position.set(-0.33, 0.0, 0.41);
    this.head.add(blush);

    // Eyepatch (right eye)
    this._makeBox(0.22, 0.18, 0.04, 0x111111, 0.2, 0.1, 0.4, this.head);
    // Patch string
    this._makeBox(0.35, 0.02, 0.01, 0x222222, 0.05, 0.12, 0.41, this.head);

    // Normal left arm
    this.leftArm = this._makeBox(0.22, 0.7, 0.22, 0xCC4400, -0.56, 0.85, 0);

    // HOOK HAND (right)
    this.hookArm = new THREE.Group();
    this.hookArm.position.set(0.56, 0.85, 0);
    this._makeBox(0.22, 0.6, 0.22, 0xCC4400, 0, 0, 0, this.hookArm);
    // Hook
    const hookGrp = new THREE.Group();
    hookGrp.position.set(0, -0.38, 0);
    this._makeCylinder(0.04, 0.04, 0.18, 0x888888, 0, 0, 0, hookGrp);
    const hookCurveGeo = new THREE.TorusGeometry(0.1, 0.025, 6, 10, Math.PI * 1.2);
    const hookMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const hookCurve = new THREE.Mesh(hookCurveGeo, hookMat);
    hookCurve.position.set(0.05, -0.13, 0);
    hookCurve.rotation.z = -0.3;
    hookGrp.add(hookCurve);
    this.hookArm.add(hookGrp);
    g.add(this.hookArm);

    // Legs
    this._makeBox(0.28, 0.55, 0.28, 0x992200, -0.2, 0.25, 0);
    this._makeBox(0.28, 0.55, 0.28, 0x992200, 0.2, 0.25, 0);

    // Tail (fluffy)
    const tail = new THREE.Group();
    tail.position.set(0, 0.8, -0.38);
    tail.rotation.x = -0.5;
    this._makeSphere(0.18, 0xCC4400, 0, 0, 0, tail);
    this._makeSphere(0.14, 0xFF8855, 0, -0.15, 0.1, tail);
    this._makeSphere(0.1, 0xFFFFFF, 0, -0.26, 0.2, tail); // white tip
    g.add(tail);
  }

  _animate(bobY, limbSwing) {
    if (this.head) this.head.position.y = 1.62 + bobY;
    if (this.leftArm) this.leftArm.rotation.x = limbSwing * 0.6;
    if (this.hookArm) this.hookArm.rotation.x = -limbSwing * 0.6;

    // Run animation (more exaggerated)
    if (this.aiState === 'chase' || this.aiState === 'attack') {
      if (this.leftArm) this.leftArm.rotation.x = Math.sin(this._animTime * 10) * 0.8;
      if (this.hookArm) this.hookArm.rotation.x = -Math.sin(this._animTime * 10) * 0.8;
    }
  }
}
