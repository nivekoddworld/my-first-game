import * as THREE from 'three';
import { Freddy } from './Freddy.js';
import { Chica } from './Chica.js';
import { Bonnie } from './Bonnie.js';
import { Foxy } from './Foxy.js';
import { Kitten } from './Kitten.js';
import { FNAF_ATTACK_RANGE, FNAF_ATTACK_DAMAGE } from '../constants.js';

const FNAF_TYPES = [Freddy, Chica, Bonnie, Foxy];

export class EntityManager {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.entities = [];
    this.kittens = [];

    this.spawnTimer = 0;
    this.kittenSpawnTimer = 0;
    this.maxFNAF = 8;
    this.maxKittens = 5;
  }

  spawnFNAF(position) {
    const Type = FNAF_TYPES[Math.floor(Math.random() * FNAF_TYPES.length)];
    const entity = new Type(this.scene, position, this.particles);
    this.entities.push(entity);
    return entity;
  }

  spawnKitten(position) {
    const kitten = new Kitten(this.scene, position, this.particles);
    this.kittens.push(kitten);
    return kitten;
  }

  update(dt, player, world) {
    const playerPos = player.position.clone();

    // Auto-spawn FNAF characters nearby
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.entities.length < this.maxFNAF) {
      this.spawnTimer = 8 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 12;
      const spawnPos = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * dist,
        playerPos.y,
        playerPos.z + Math.sin(angle) * dist
      );
      if (world) spawnPos.y = world.getSurfaceY(Math.round(spawnPos.x), Math.round(spawnPos.z));
      this.spawnFNAF(spawnPos);
    }

    // Auto-spawn kittens
    this.kittenSpawnTimer -= dt;
    if (this.kittenSpawnTimer <= 0 && this.kittens.length < this.maxKittens) {
      this.kittenSpawnTimer = 15 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 15;
      const spawnPos = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * dist,
        playerPos.y,
        playerPos.z + Math.sin(angle) * dist
      );
      if (world) spawnPos.y = world.getSurfaceY(Math.round(spawnPos.x), Math.round(spawnPos.z));
      this.spawnKitten(spawnPos);
    }

    // Update all FNAF
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.update(dt, playerPos, world);

      // Attack player
      if (e.alive && e.aiState === 'attack' && e.attackCooldown <= 0) {
        const distToPlayer = e.position.distanceTo(playerPos);
        if (distToPlayer < FNAF_ATTACK_RANGE + 0.5) {
          player.takeDamage(FNAF_ATTACK_DAMAGE, performance.now() / 1000);
          this._triggerDamageFlash();
        }
      }

      // Remove if dead and timer expired
      if (!e.alive && e._deathTimer <= 0) {
        this.entities.splice(i, 1);
      }
    }

    // Update kittens
    for (let i = this.kittens.length - 1; i >= 0; i--) {
      const k = this.kittens[i];
      k.update(dt, playerPos, world);
      if (!k.alive && k._deathTimer <= 0) {
        this.kittens.splice(i, 1);
      }
    }
  }

  _triggerDamageFlash() {
    const flash = document.getElementById('damage-flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => { flash.style.opacity = '0'; }, 150);
    }
  }

  // Raycast against all entities
  raycastEntities(origin, direction, maxDist) {
    let best = null;
    let bestT = maxDist;

    for (const e of [...this.entities, ...this.kittens]) {
      const hit = e.raycastHit(origin, direction, maxDist);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
        best = hit;
      }
    }
    return best;
  }

  dispose() {
    for (const e of this.entities) e.dispose();
    for (const k of this.kittens) k.dispose();
    this.entities = [];
    this.kittens = [];
  }
}
