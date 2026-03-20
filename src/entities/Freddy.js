import * as THREE from 'three';
import { FNAFBase } from './FNAFBase.js';

// Cute UWU Freddy Fazbear - brown bear with top hat
export class Freddy extends FNAFBase {
  _buildMesh() {
    const g = this.group;

    // Body (chubby bear body)
    this._makeBox(0.9, 1.1, 0.7, 0x8B4513, 0, 0.75, 0);

    // Head (big round)
    this.head = new THREE.Group();
    this.head.position.set(0, 1.65, 0);
    g.add(this.head);
    this._makeSphere(0.52, 0x8B4513, 0, 0, 0, this.head);

    // Snout
    this._makeSphere(0.22, 0xD2691E, 0, -0.1, 0.38, this.head);

    // Nose
    this._makeSphere(0.05, 0x111111, 0, 0.0, 0.57, this.head);

    // Ears
    for (const sx of [-1, 1]) {
      this._makeSphere(0.18, 0x8B4513, sx * 0.46, 0.35, -0.1, this.head);
      this._makeSphere(0.1, 0xD2691E, sx * 0.46, 0.35, -0.04, this.head); // inner
    }

    // Cute UWU eyes
    this._addCuteEyes(this.head, 0.08, 0.2);

    // Top hat (cylinder)
    this._makeCylinder(0.28, 0.32, 0.08, 0x1a1a1a, 0, 0.6, 0, this.head); // brim
    this._makeCylinder(0.22, 0.22, 0.4, 0x1a1a1a, 0, 0.85, 0, this.head); // crown
    // Hat band (pink uwu)
    this._makeBox(0.46, 0.06, 0.46, 0xff69b4, 0, 0.64, 0, this.head);

    // Bow tie
    const tieGroup = new THREE.Group();
    tieGroup.position.set(0, 1.25, 0.36);
    this._makeBox(0.25, 0.1, 0.04, 0x111111, -0.12, 0, 0, tieGroup);
    this._makeBox(0.25, 0.1, 0.04, 0x111111, 0.12, 0, 0, tieGroup);
    this._makeSphere(0.05, 0x333333, 0, 0, 0, tieGroup);
    g.add(tieGroup);

    // Arms
    this.leftArm = this._makeBox(0.22, 0.7, 0.22, 0x8B4513, -0.58, 0.85, 0);
    this.rightArm = this._makeBox(0.22, 0.7, 0.22, 0x8B4513, 0.58, 0.85, 0);

    // Legs
    this._makeBox(0.28, 0.55, 0.28, 0x5C3317, -0.2, 0.25, 0);
    this._makeBox(0.28, 0.55, 0.28, 0x5C3317, 0.2, 0.25, 0);

    // Belly (lighter)
    this._makeBox(0.65, 0.75, 0.15, 0xD2B48C, 0, 0.85, 0.33);

    // Microphone
    const micGroup = new THREE.Group();
    micGroup.position.set(0.58, 0.85, 0.2);
    this._makeCylinder(0.03, 0.03, 0.35, 0x888888, 0, 0, 0, micGroup);
    this._makeSphere(0.07, 0x555555, 0, 0.22, 0, micGroup);
    g.add(micGroup);
  }

  _animate(bobY, limbSwing) {
    if (this.head) this.head.position.y = 1.65 + bobY;
    if (this.leftArm) this.leftArm.rotation.x = limbSwing * 0.5;
    if (this.rightArm) this.rightArm.rotation.x = -limbSwing * 0.5;

    // Attack animation
    if (this.aiState === 'attack') {
      if (this.leftArm) this.leftArm.rotation.x = Math.sin(this._animTime * 15) * 1.2;
    }
  }
}
