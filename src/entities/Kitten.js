import * as THREE from 'three';

const KITTEN_COLORS = [0xFFFFFF, 0xFF9900, 0x333333, 0xFFC0CB, 0x888888];
const KITTEN_SPEED = 2.2;
const PET_RANGE = 1.8;

export class Kitten {
  constructor(scene, position, particles) {
    this.scene = scene;
    this.position = position.clone();
    this.particles = particles;

    this.alive = true;
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    scene.add(this.group);

    this.vel = new THREE.Vector3();
    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.pettedTimer = 0;
    this.happyTimer = 0;
    this.heartTimer = 0;
    this._animTime = 0;
    this._deathTimer = 0;

    this.color = KITTEN_COLORS[Math.floor(Math.random() * KITTEN_COLORS.length)];

    this._buildMesh();
  }

  _buildMesh() {
    const g = this.group;
    const c = this.color;
    const darker = new THREE.Color(c).multiplyScalar(0.7).getHex();

    const makeMesh = (geo, color, x = 0, y = 0, z = 0, parent = g) => {
      const mat = new THREE.MeshLambertMaterial({ color });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };

    // Scale down - kittens are small!
    g.scale.setScalar(0.5);

    // Body
    makeMesh(new THREE.SphereGeometry(0.38, 10, 8), c, 0, 0.38, 0);

    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.85, 0.18);
    g.add(this.head);
    makeMesh(new THREE.SphereGeometry(0.3, 10, 8), c, 0, 0, 0, this.head);

    // Ears (triangles)
    for (const sx of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.1, 0.2, 4);
      const earMat = new THREE.MeshLambertMaterial({ color: c });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(sx * 0.18, 0.25, -0.05);
      ear.rotation.z = sx * 0.2;
      this.head.add(ear);
      // Inner ear
      const innerGeo = new THREE.ConeGeometry(0.06, 0.12, 4);
      const innerMat = new THREE.MeshLambertMaterial({ color: 0xFF8899 });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(sx * 0.18, 0.25, -0.02);
      inner.rotation.z = sx * 0.2;
      this.head.add(inner);
    }

    // Eyes (big cute)
    for (const sx of [-1, 1]) {
      // White
      makeMesh(new THREE.CircleGeometry(0.095, 10), 0xFFFFFF, sx * 0.12, 0.05, 0.27, this.head);
      // Pupil
      makeMesh(new THREE.CircleGeometry(0.055, 10), 0x111111, sx * 0.12, 0.05, 0.28, this.head);
      // Highlight
      makeMesh(new THREE.CircleGeometry(0.02, 6), 0xFFFFFF, sx * 0.12 + 0.025, 0.07, 0.29, this.head);
      // Blush
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xFF99AA, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.055, 8), blushMat);
      bl.position.set(sx * 0.22, -0.03, 0.27);
      this.head.add(bl);
    }

    // Nose
    makeMesh(new THREE.SphereGeometry(0.028, 6, 6), 0xFF6699, 0, 0.0, 0.295, this.head);

    // Mouth (small w shape - just two small boxes)
    makeMesh(new THREE.BoxGeometry(0.05, 0.015, 0.01), 0x884455, -0.03, -0.045, 0.295, this.head);
    makeMesh(new THREE.BoxGeometry(0.05, 0.015, 0.01), 0x884455, 0.03, -0.045, 0.295, this.head);

    // Legs (tiny stubs)
    for (const [lx, lz] of [[-0.2, 0.15], [0.2, 0.15], [-0.2, -0.15], [0.2, -0.15]]) {
      makeMesh(new THREE.CylinderGeometry(0.08, 0.07, 0.25, 6), darker, lx, 0.13, lz);
    }

    // Tail
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.4, -0.3);
    const tailGeo = new THREE.CylinderGeometry(0.05, 0.035, 0.5, 6);
    const tailMat = new THREE.MeshLambertMaterial({ color: c });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    tailMesh.rotation.x = -1.2;
    tailMesh.position.set(0, 0.2, -0.1);
    this.tail.add(tailMesh);
    // Tail tip (white or same)
    const tipGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const tipMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0.42, -0.22);
    this.tail.add(tip);
    g.add(this.tail);
  }

  update(dt, playerPos, world) {
    if (!this.alive) {
      this._deathTimer -= dt;
      if (this._deathTimer <= 0) this.scene.remove(this.group);
      else this.group.scale.setScalar(Math.max(0, this._deathTimer) * 0.5);
      return;
    }

    this._animTime += dt;
    this.heartTimer = Math.max(0, this.heartTimer - dt);
    this.pettedTimer = Math.max(0, this.pettedTimer - dt);
    this.wanderTimer = Math.max(0, this.wanderTimer - dt);

    const distToPlayer = this.position.distanceTo(playerPos);

    // React to player proximity
    if (distToPlayer < PET_RANGE) {
      this.happyTimer = 1.0;
      if (this.heartTimer <= 0) {
        this.heartTimer = 2.0;
        if (this.particles) {
          this.particles.spawnHearts(this.position.clone().add(new THREE.Vector3(0, 0.6, 0)));
          this.particles.spawnPurr(this.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
        }
      }
    }
    this.happyTimer = Math.max(0, (this.happyTimer || 0) - dt);

    // Wander AI
    if (!this.wanderTarget || this.position.distanceTo(this.wanderTarget) < 1 || this.wanderTimer <= 0) {
      if (Math.random() < 0.3) {
        // Sit and chill
        this.wanderTarget = null;
        this.wanderTimer = 2 + Math.random() * 3;
      } else {
        this.wanderTarget = new THREE.Vector3(
          this.position.x + (Math.random() - 0.5) * 12,
          this.position.y,
          this.position.z + (Math.random() - 0.5) * 12
        );
        this.wanderTimer = 4 + Math.random() * 4;
      }
    }

    // Move toward wander target
    if (this.wanderTarget && distToPlayer > PET_RANGE * 0.7) {
      const toTarget = this.wanderTarget.clone().sub(this.position);
      toTarget.y = 0;
      const d = toTarget.length();
      if (d > 0.5) {
        toTarget.normalize();
        const spd = this.happyTimer > 0 ? KITTEN_SPEED * 0.3 : KITTEN_SPEED;
        this.position.x += toTarget.x * spd * dt;
        this.position.z += toTarget.z * spd * dt;
        this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
    }

    // Snap to ground
    if (world) {
      const gy = world.getSurfaceY(Math.round(this.position.x), Math.round(this.position.z));
      this.position.y += (gy - this.position.y) * 10 * dt;
      this.position.y = Math.max(this.position.y, gy);
    }

    this.group.position.copy(this.position);

    // Animations
    if (this.head) {
      // Happy headbob
      const bobAmt = this.happyTimer > 0 ? 0.12 : 0.04;
      const bobSpeed = this.happyTimer > 0 ? 10 : 4;
      this.head.position.y = 0.85 + Math.abs(Math.sin(this._animTime * bobSpeed)) * bobAmt;
      // Tilt when happy
      if (this.happyTimer > 0) {
        this.head.rotation.z = Math.sin(this._animTime * 5) * 0.2;
      } else {
        this.head.rotation.z *= 0.9;
      }
    }

    // Tail wag
    if (this.tail) {
      const wagSpeed = this.happyTimer > 0 ? 8 : 2;
      const wagAmt = this.happyTimer > 0 ? 0.6 : 0.2;
      this.tail.rotation.y = Math.sin(this._animTime * wagSpeed) * wagAmt;
    }

    // Rainbow trail when running
    if (this.wanderTarget && this.position.distanceTo(this.wanderTarget) > 2 && Math.random() < 0.1) {
      if (this.particles) {
        this.particles.spawnRainbow(this.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 2);
      }
    }
  }

  takeDamage(amount, particles) {
    if (!this.alive) return;
    // Kittens emit sadness particles
    if (particles) {
      particles.spawnHearts(this.position.clone().add(new THREE.Vector3(0, 0.6, 0)));
    }
    this.alive = false;
    this._deathTimer = 1.5;
  }

  raycastHit(origin, direction, maxDist) {
    if (!this.alive) return null;
    const toCenter = this.position.clone().add(new THREE.Vector3(0, 0.3, 0)).sub(origin);
    const t = toCenter.dot(direction);
    if (t < 0 || t > maxDist) return null;
    const closest = origin.clone().addScaledVector(direction, t);
    const dist = closest.distanceTo(this.position.clone().add(new THREE.Vector3(0, 0.3, 0)));
    if (dist < 0.35) return { t, entity: this };
    return null;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
}
