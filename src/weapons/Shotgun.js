import * as THREE from 'three';
import { BaseGun } from './BaseGun.js';
import { GUNS } from '../constants.js';

export class Shotgun extends BaseGun {
  constructor() {
    super(GUNS.SHOTGUN);
    this.magazine = Array(6).fill(true);
    this._chamberNext();
  }

  buildModel() {
    const g = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.BoxGeometry(0.07, 0.07, 0.45);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.15);
    g.add(body);

    // Barrel (dual side-by-side look)
    for (const xOff of [-0.022, 0.022]) {
      const bGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8);
      bGeo.rotateX(Math.PI / 2);
      const bMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
      const b = new THREE.Mesh(bGeo, bMat);
      b.position.set(xOff, 0.01, -0.38);
      g.add(b);
    }

    // Pump
    const pumpGeo = new THREE.BoxGeometry(0.065, 0.055, 0.1);
    const pumpMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pump.position.set(0, -0.018, -0.28);
    g.add(pump);

    // Stock
    const stockGeo = new THREE.BoxGeometry(0.06, 0.07, 0.16);
    const stockMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const stock = new THREE.Mesh(stockGeo, stockMat);
    stock.position.set(0, -0.005, 0.09);
    g.add(stock);

    // UWU rainbow stripe on stock
    const stripeGeo = new THREE.BoxGeometry(0.062, 0.01, 0.16);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.04, 0.09);
    g.add(stripe);

    g.position.set(0.2, -0.18, -0.28);
    g.rotation.y = -0.08;

    this.modelGroup = g;
    return g;
  }
}
