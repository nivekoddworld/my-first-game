import * as THREE from 'three';
import { BaseGun } from './BaseGun.js';
import { GUNS } from '../constants.js';

export class Pistol extends BaseGun {
  constructor() {
    super(GUNS.PISTOL);
    // Start with chambered round
    this.magazine = Array(7).fill(true);
    this._chamberNext();
  }

  buildModel() {
    const g = new THREE.Group();

    // Slide
    const slideGeo = new THREE.BoxGeometry(0.08, 0.07, 0.28);
    const slideMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const slide = new THREE.Mesh(slideGeo, slideMat);
    slide.position.set(0, 0.03, -0.08);
    g.add(slide);

    // Frame
    const frameGeo = new THREE.BoxGeometry(0.07, 0.1, 0.22);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, -0.02, -0.08);
    g.add(frame);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.065, 0.13, 0.09);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.09, -0.03);
    grip.rotation.x = 0.15;
    g.add(grip);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.22);
    g.add(barrel);

    // Cute pink heart sticker
    const stickerGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const stickerMat = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
    const sticker = new THREE.Mesh(stickerGeo, stickerMat);
    sticker.position.set(0.04, 0, -0.08);
    g.add(sticker);

    // Position in view (bottom right)
    g.position.set(0.18, -0.16, -0.25);
    g.rotation.y = -0.1;

    this.modelGroup = g;
    return g;
  }
}
