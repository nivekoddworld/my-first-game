import * as THREE from 'three';
import { BLOCK_COLORS } from '../constants.js';

const MAX_PARTICLES = 600;

class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.life = 0;
    this.maxLife = 1;
    this.size = 0.08;
    this.color = new THREE.Color(1, 1, 1);
    this.active = false;
    this.gravity = true;
  }
}

export class Particles {
  constructor(scene, isMobile) {
    this.scene = scene;
    this.maxCount = isMobile ? 150 : MAX_PARTICLES;
    this.pool = Array.from({ length: this.maxCount }, () => new Particle());
    this._setupGeometry();
  }

  _setupGeometry() {
    const positions = new Float32Array(this.maxCount * 3);
    const colors = new Float32Array(this.maxCount * 3);
    const sizes = new Float32Array(this.maxCount);

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  _getParticle() {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    // Recycle oldest
    return this.pool[0];
  }

  spawn(pos, vel, color, life = 0.8, size = 0.1, gravity = true) {
    const p = this._getParticle();
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.color.set(color);
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.active = true;
    p.gravity = gravity;
  }

  spawnBurst(pos, count, color, speed = 3, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 0.5,
        (Math.random() - 0.5) * speed
      );
      this.spawn(pos.clone(), vel, color, life + Math.random() * 0.4, 0.08 + Math.random() * 0.06);
    }
  }

  spawnHit(pos, normal, blockId) {
    const col = BLOCK_COLORS[blockId];
    const color = col ? col[1] : 0x888888;
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    for (let i = 0; i < 6; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      vel.addScaledVector(normal, 1.5);
      this.spawn(pos.clone(), vel, hex, 0.5 + Math.random() * 0.3, 0.06);
    }
  }

  spawnBlood(pos) {
    this.spawnBurst(pos, 10, '#cc2222', 5, 0.7);
  }

  spawnHearts(pos) {
    for (let i = 0; i < 5; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        1.5 + Math.random() * 2,
        (Math.random() - 0.5) * 1.5
      );
      this.spawn(pos.clone(), vel, '#ff69b4', 1.2 + Math.random() * 0.5, 0.15, false);
    }
  }

  spawnPurr(pos) {
    const colors = ['#ff99cc', '#ffccee', '#ffaadd'];
    for (let i = 0; i < 4; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        0.8 + Math.random(),
        (Math.random() - 0.5) * 0.8
      );
      this.spawn(pos.clone(), vel, colors[i % colors.length], 1.0, 0.12, false);
    }
  }

  spawnRainbow(pos, count = 8) {
    const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0099ff', '#8800ff'];
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 2
      );
      this.spawn(pos.clone(), vel, colors[i % colors.length], 0.8, 0.1, false);
    }
  }

  spawnPortalSparks(pos, colorHex) {
    for (let i = 0; i < 3; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      this.spawn(pos.clone(), vel, colorHex, 0.5, 0.12, false);
    }
  }

  update(dt) {
    const posArr = this.geo.attributes.position.array;
    const colArr = this.geo.attributes.color.array;
    const sizeArr = this.geo.attributes.size.array;

    for (let i = 0; i < this.maxCount; i++) {
      const p = this.pool[i];
      const off = i * 3;

      if (!p.active) {
        posArr[off] = posArr[off+1] = posArr[off+2] = 0;
        sizeArr[i] = 0;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        sizeArr[i] = 0;
        continue;
      }

      if (p.gravity) p.vel.y -= 9.8 * dt;
      p.pos.addScaledVector(p.vel, dt);

      const t = p.life / p.maxLife;
      posArr[off]   = p.pos.x;
      posArr[off+1] = p.pos.y;
      posArr[off+2] = p.pos.z;
      colArr[off]   = p.color.r * t;
      colArr[off+1] = p.color.g * t;
      colArr[off+2] = p.color.b * t;
      sizeArr[i] = p.size * t;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
}
