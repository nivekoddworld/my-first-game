import * as THREE from 'three';
import { BaseGun } from './BaseGun.js';
import { GUNS } from '../constants.js';

export class AssaultRifle extends BaseGun {
  constructor() {
    super(GUNS.RIFLE);
    this.magazine = Array(30).fill(true);
    this._chamberNext();
  }

  buildModel() {
    const g = new THREE.Group();

    // Receiver
    const recvGeo = new THREE.BoxGeometry(0.06, 0.07, 0.38);
    const recvMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const recv = new THREE.Mesh(recvGeo, recvMat);
    recv.position.set(0, 0, -0.12);
    g.add(recv);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.28, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0, 0.005, -0.36);
    g.add(barrel);

    // Magazine (curved AK-style)
    const magGeo = new THREE.BoxGeometry(0.04, 0.18, 0.055);
    const magMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.12, -0.12);
    mag.rotation.x = -0.15;
    g.add(mag);

    // Stock
    const stockGeo = new THREE.BoxGeometry(0.05, 0.065, 0.18);
    const stockMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const stock = new THREE.Mesh(stockGeo, stockMat);
    stock.position.set(0, -0.01, 0.1);
    g.add(stock);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.04, 0.1, 0.06);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.07, -0.02);
    g.add(grip);

    // UWU star sticker
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const starGeo = new THREE.SphereGeometry(0.012, 5, 5);
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(0.03, 0.04, -0.12);
    g.add(star);

    g.position.set(0.18, -0.14, -0.3);
    g.rotation.y = -0.05;

    this.modelGroup = g;
    return g;
  }
}
