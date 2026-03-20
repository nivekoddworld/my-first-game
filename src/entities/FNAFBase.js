import * as THREE from 'three';
import { FNAF_SIGHT_RANGE, FNAF_ATTACK_RANGE, FNAF_CHASE_SPEED, FNAF_WANDER_SPEED, FNAF_ATTACK_DAMAGE, FNAF_HEALTH } from '../constants.js';

const AI_STATE = {
  IDLE: 'idle',
  WANDER: 'wander',
  CHASE: 'chase',
  ATTACK: 'attack',
  UWU_EMOTE: 'uwu_emote',
};

export class FNAFBase {
  constructor(scene, position, particles) {
    this.scene = scene;
    this.position = position.clone();
    this.particles = particles;

    this.health = FNAF_HEALTH;
    this.maxHealth = FNAF_HEALTH;
    this.alive = true;
    this.speed = FNAF_WANDER_SPEED;

    this.aiState = AI_STATE.IDLE;
    this.stateTimer = 0;
    this.wanderTarget = null;
    this.attackCooldown = 0;
    this.uwuTimer = 0;
    this.heartTimer = 0;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    scene.add(this.group);

    this._animTime = 0;
    this._deathTimer = 0;

    // Labels (floating text via sprites would need canvas, use simple geometry)
    this._buildMesh();
    this._buildHealthBar();
  }

  _buildMesh() {
    // Overridden by subclass
  }

  _buildHealthBar() {
    // Simple health bar above head
    const bgGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
    this.hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBg.position.set(0, 2.6, 0);

    const fgGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x00cc44, side: THREE.DoubleSide });
    this.hpFg = new THREE.Mesh(fgGeo, fgMat);
    this.hpFg.position.set(0, 2.6, 0.01);

    this.group.add(this.hpBg);
    this.group.add(this.hpFg);
  }

  _makeBox(w, h, d, color, x = 0, y = 0, z = 0, parent = null) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    (parent || this.group).add(mesh);
    return mesh;
  }

  _makeSphere(r, color, x = 0, y = 0, z = 0, parent = null) {
    const geo = new THREE.SphereGeometry(r, 12, 8);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    (parent || this.group).add(mesh);
    return mesh;
  }

  _makeCylinder(rt, rb, h, color, x = 0, y = 0, z = 0, parent = null) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, 12);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    (parent || this.group).add(mesh);
    return mesh;
  }

  // Add cute UWU eyes
  _addCuteEyes(head, eyeY = 0.1, eyeSpread = 0.22) {
    // White of eye
    for (const sx of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      eyeWhite.position.set(sx * eyeSpread, eyeY, 0.41);
      head.add(eyeWhite);

      // Pupil
      const pupil = new THREE.Mesh(
        new THREE.CircleGeometry(0.065, 12),
        new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
      );
      pupil.position.set(sx * eyeSpread, eyeY, 0.42);
      head.add(pupil);

      // Star highlight
      const star = new THREE.Mesh(
        new THREE.CircleGeometry(0.025, 5),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      star.position.set(sx * eyeSpread + 0.03, eyeY + 0.04, 0.43);
      head.add(star);

      // Blush
      const blush = new THREE.Mesh(
        new THREE.CircleGeometry(0.07, 10),
        new THREE.MeshBasicMaterial({ color: 0xff9999, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      blush.position.set(sx * (eyeSpread + 0.12), eyeY - 0.1, 0.41);
      head.add(blush);
    }
  }

  update(dt, playerPos, world) {
    if (!this.alive) {
      this._deathTimer -= dt;
      if (this._deathTimer <= 0) {
        this.scene.remove(this.group);
      } else {
        this.group.scale.setScalar(Math.max(0, this._deathTimer));
      }
      return;
    }

    this._animTime += dt;
    this.stateTimer -= dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.heartTimer = Math.max(0, this.heartTimer - dt);

    const distToPlayer = this.position.distanceTo(playerPos);

    // AI transitions
    if (distToPlayer < FNAF_SIGHT_RANGE && this.aiState !== AI_STATE.ATTACK) {
      this.aiState = AI_STATE.CHASE;
      this.speed = FNAF_CHASE_SPEED;
    } else if (distToPlayer >= FNAF_SIGHT_RANGE && this.aiState === AI_STATE.CHASE) {
      this.aiState = AI_STATE.WANDER;
      this.speed = FNAF_WANDER_SPEED;
    }

    if (distToPlayer < FNAF_ATTACK_RANGE && this.attackCooldown <= 0) {
      this.aiState = AI_STATE.ATTACK;
      this.stateTimer = 0.4;
    }

    // Idle UWU emotes
    if (this.aiState === AI_STATE.IDLE || this.aiState === AI_STATE.WANDER) {
      if (this.heartTimer <= 0 && Math.random() < 0.005) {
        this.heartTimer = 3 + Math.random() * 5;
        if (this.particles) this.particles.spawnHearts(this.position.clone().add(new THREE.Vector3(0, 2, 0)));
      }
    }

    // Wander target
    if (this.aiState === AI_STATE.WANDER) {
      if (!this.wanderTarget || this.position.distanceTo(this.wanderTarget) < 1.5 || this.stateTimer <= 0) {
        this.wanderTarget = new THREE.Vector3(
          this.position.x + (Math.random() - 0.5) * 20,
          this.position.y,
          this.position.z + (Math.random() - 0.5) * 20
        );
        this.stateTimer = 3 + Math.random() * 4;

        // Sometimes idle
        if (Math.random() < 0.3) {
          this.aiState = AI_STATE.IDLE;
          this.stateTimer = 1 + Math.random() * 2;
        }
      }
    }

    // Movement
    let moveTarget = null;
    if (this.aiState === AI_STATE.CHASE || this.aiState === AI_STATE.ATTACK) {
      moveTarget = playerPos;
    } else if (this.aiState === AI_STATE.WANDER && this.wanderTarget) {
      moveTarget = this.wanderTarget;
    }

    if (moveTarget && distToPlayer > 0.5) {
      const toTarget = moveTarget.clone().sub(this.position);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist > 0.1) {
        toTarget.normalize();
        const moveSpeed = this.aiState === AI_STATE.ATTACK ? FNAF_CHASE_SPEED * 1.5 : this.speed;
        this.position.x += toTarget.x * moveSpeed * dt;
        this.position.z += toTarget.z * moveSpeed * dt;

        // Face movement direction
        this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
    }

    // Attack
    if (this.aiState === AI_STATE.ATTACK && this.stateTimer <= 0) {
      // Damage is handled by Game.js checking proximity
      this.attackCooldown = 1.2;
      this.aiState = AI_STATE.CHASE;
    }

    // Snap to ground (simple)
    if (world) {
      const groundY = world.getSurfaceY(Math.round(this.position.x), Math.round(this.position.z));
      this.position.y += (groundY - this.position.y) * 10 * dt;
      this.position.y = Math.max(this.position.y, groundY);
    }

    this.group.position.copy(this.position);

    // Bobbing animation
    const bobY = Math.sin(this._animTime * 4) * 0.05;
    const limbSwing = Math.sin(this._animTime * 6) * 0.3;
    this._animate(bobY, limbSwing);

    // Health bar always faces camera-ish (billboard)
    if (this.hpFg) {
      const ratio = this.health / this.maxHealth;
      this.hpFg.scale.x = ratio;
      this.hpFg.position.x = -(1 - ratio) * 0.6;
      this.hpFg.material.color.setHex(ratio > 0.5 ? 0x00cc44 : ratio > 0.25 ? 0xffaa00 : 0xff2200);
    }
  }

  _animate(bobY, limbSwing) {
    // Override in subclass
  }

  takeDamage(amount, particles) {
    if (!this.alive) return;
    this.health -= amount;
    if (particles) particles.spawnBlood(this.position.clone().add(new THREE.Vector3(0, 1, 0)));
    if (this.health <= 0) this._die(particles);
  }

  _die(particles) {
    this.alive = false;
    this._deathTimer = 1.0;
    if (particles) {
      this.particles.spawnHearts(this.position.clone().add(new THREE.Vector3(0, 1, 0)));
      this.particles.spawnRainbow(this.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
    // Kill feed
    const kf = document.getElementById('kill-feed');
    if (kf) {
      const entry = document.createElement('div');
      entry.className = 'kill-entry';
      entry.textContent = `✨ Defeated ${this.constructor.name}! uwu`;
      kf.appendChild(entry);
      setTimeout(() => entry.remove(), 3200);
    }
  }

  raycastHit(origin, direction, maxDist) {
    if (!this.alive) return null;
    // Simple sphere hit test
    const toCenter = this.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin);
    const t = toCenter.dot(direction);
    if (t < 0 || t > maxDist) return null;
    const closest = origin.clone().addScaledVector(direction, t);
    const dist = closest.distanceTo(this.position.clone().add(new THREE.Vector3(0, 1, 0)));
    if (dist < 0.9) return { t, entity: this };
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
