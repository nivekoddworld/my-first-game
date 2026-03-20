import * as THREE from 'three';
import { FNAFBase } from './FNAFBase.js';

// Cute UWU Bonnie - purple bunny with guitar
export class Bonnie extends FNAFBase {
  _buildMesh() {
    const g = this.group;

    // Body
    this._makeBox(0.85, 1.1, 0.65, 0x6B3FA0, 0, 0.75, 0);

    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.65, 0);
    g.add(this.head);
    this._makeSphere(0.50, 0x6B3FA0, 0, 0, 0, this.head);

    // Bunny ears (long!)
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      this._makeBox(0.12, 0.52, 0.1, 0x6B3FA0, 0, 0, 0, ear);
      this._makeBox(0.07, 0.42, 0.04, 0xD4A0C8, 0, 0, 0.04, ear); // inner
      ear.position.set(sx * 0.24, 0.72, -0.05);
      this.head.add(ear);
    }

    // Snout
    this._makeSphere(0.2, 0x8B5CA0, 0, -0.1, 0.38, this.head);
    this._makeSphere(0.045, 0x222222, 0, 0.0, 0.56, this.head); // nose

    // Cute UWU eyes
    this._addCuteEyes(this.head, 0.1, 0.2);

    // Bow tie (red)
    this._makeBox(0.22, 0.09, 0.04, 0xCC0000, -0.11, 1.2, 0.36);
    this._makeBox(0.22, 0.09, 0.04, 0xCC0000, 0.11, 1.2, 0.36);
    this._makeSphere(0.05, 0x990000, 0, 1.2, 0.38);

    // Arms
    this.leftArm = this._makeBox(0.22, 0.7, 0.22, 0x6B3FA0, -0.56, 0.85, 0);
    this.rightArm = this._makeBox(0.22, 0.7, 0.22, 0x6B3FA0, 0.56, 0.85, 0);

    // Legs
    this._makeBox(0.28, 0.55, 0.28, 0x4a2d70, -0.2, 0.25, 0);
    this._makeBox(0.28, 0.55, 0.28, 0x4a2d70, 0.2, 0.25, 0);

    // Belly
    this._makeBox(0.6, 0.7, 0.12, 0x9966cc, 0, 0.85, 0.33);

    // Guitar (simplified)
    this.guitar = new THREE.Group();
    this.guitar.position.set(-0.75, 0.85, 0.1);
    this.guitar.rotation.z = -0.3;
    // Body
    this._makeSphere(0.22, 0xD2691E, 0, 0, 0, this.guitar);
    this._makeBox(0.16, 0.6, 0.08, 0xD2691E, 0, 0.42, 0, this.guitar); // neck
    // Strings
    for (let i = 0; i < 4; i++) {
      const strGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4);
      const strMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
      const str = new THREE.Mesh(strGeo, strMat);
      str.position.set(-0.02 + i * 0.013, 0.42, 0.05);
      this.guitar.add(str);
    }
    // Tuning pegs
    this._makeBox(0.22, 0.08, 0.06, 0xA0522D, 0, 0.74, 0, this.guitar);
    g.add(this.guitar);
  }

  _animate(bobY, limbSwing) {
    if (this.head) {
      this.head.position.y = 1.65 + bobY;
      // Head tilt (bobbing)
      this.head.rotation.z = Math.sin(this._animTime * 1.5) * 0.08;
    }
    if (this.leftArm) this.leftArm.rotation.x = limbSwing * 0.4;
    if (this.rightArm) this.rightArm.rotation.x = -limbSwing * 0.4;
    // Guitar bob
    if (this.guitar) {
      this.guitar.rotation.z = -0.3 + Math.sin(this._animTime * 2) * 0.1;
    }
  }
}
