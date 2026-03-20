import * as THREE from 'three';
import { FNAFBase } from './FNAFBase.js';

// Cute UWU Chica - yellow chicken
export class Chica extends FNAFBase {
  _buildMesh() {
    const g = this.group;

    // Body
    this._makeBox(0.85, 1.05, 0.65, 0xFFD700, 0, 0.72, 0);

    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.62, 0);
    g.add(this.head);
    this._makeSphere(0.50, 0xFFD700, 0, 0, 0, this.head);

    // Beak (orange triangle-ish)
    const beakGeo = new THREE.ConeGeometry(0.12, 0.22, 6);
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.05, 0.48);
    this.head.add(beak);

    // Cute UWU eyes
    this._addCuteEyes(this.head, 0.12, 0.2);

    // Comb (red spiky top)
    for (let i = 0; i < 3; i++) {
      const combGeo = new THREE.ConeGeometry(0.06, 0.18, 5);
      const combMat = new THREE.MeshLambertMaterial({ color: 0xFF3333 });
      const comb = new THREE.Mesh(combGeo, combMat);
      comb.position.set((i - 1) * 0.12, 0.52, -0.1);
      this.head.add(comb);
    }

    // Bib (white)
    const bibGeo = new THREE.PlaneGeometry(0.55, 0.5);
    const bibMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
    const bib = new THREE.Mesh(bibGeo, bibMat);
    bib.position.set(0, 0.88, 0.34);
    g.add(bib);

    // "LET'S EAT" on bib as colored box pattern
    this._makeBox(0.4, 0.06, 0.01, 0xFF0000, 0, 1.05, 0.35);
    this._makeBox(0.3, 0.05, 0.01, 0xFF6600, 0, 0.96, 0.35);

    // Wattle (red chin)
    this._makeSphere(0.07, 0xFF3333, 0, -0.3, 0.4, this.head);

    // Wings
    this.leftWing = this._makeBox(0.15, 0.6, 0.45, 0xFFD700, -0.52, 0.85, 0);
    this.rightWing = this._makeBox(0.15, 0.6, 0.45, 0xFFD700, 0.52, 0.85, 0);

    // Legs
    this._makeBox(0.15, 0.45, 0.15, 0xFF8C00, -0.2, 0.23, 0);
    this._makeBox(0.15, 0.45, 0.15, 0xFF8C00, 0.2, 0.23, 0);
    // Feet
    this._makeBox(0.28, 0.06, 0.2, 0xFF8C00, -0.2, 0.04, 0.05);
    this._makeBox(0.28, 0.06, 0.2, 0xFF8C00, 0.2, 0.04, 0.05);

    // Floating cupcake companion
    this.cupcake = new THREE.Group();
    this.cupcake.position.set(0.9, 1.3, 0);
    // Cup
    this._makeCylinder(0.12, 0.09, 0.16, 0xffa040, 0, 0, 0, this.cupcake);
    // Frosting (white dome)
    this._makeSphere(0.14, 0xffffff, 0, 0.14, 0, this.cupcake);
    // Cherry
    this._makeSphere(0.04, 0xff0000, 0, 0.28, 0, this.cupcake);
    // Eye on cupcake (creepy cute)
    const eyeGeo = new THREE.CircleGeometry(0.04, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.04, 0.15);
    this.cupcake.add(eye);
    g.add(this.cupcake);
  }

  _animate(bobY, limbSwing) {
    if (this.head) this.head.position.y = 1.62 + bobY;
    if (this.leftWing) this.leftWing.rotation.z = 0.2 + limbSwing * 0.3;
    if (this.rightWing) this.rightWing.rotation.z = -(0.2 + limbSwing * 0.3);
    // Cupcake float
    if (this.cupcake) {
      this.cupcake.position.y = 1.3 + Math.sin(this._animTime * 2.5) * 0.12;
      this.cupcake.rotation.y = this._animTime * 0.8;
    }
  }
}
