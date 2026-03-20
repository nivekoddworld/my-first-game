import * as THREE from 'three';
import { STAMINA_MAX, STAMINA_REGEN, PLAYER_HEIGHT, PLAYER_WIDTH } from '../constants.js';

export class Player {
  constructor() {
    // Position (feet level)
    this.position = new THREE.Vector3(0, 60, 0);
    this.velocity = new THREE.Vector3();

    // Dimensions
    this.height = PLAYER_HEIGHT;
    this.width = PLAYER_WIDTH;
    this.eyeOffset = PLAYER_HEIGHT - 0.15;

    // State
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = STAMINA_MAX;
    this.maxStamina = STAMINA_MAX;

    this.onGround = false;
    this.isCrouching = false;
    this.isSprinting = false;
    this.isSliding = false;
    this.isRolling = false;
    this.isGrappling = false;
    this.iFrames = false; // invincibility during roll

    this.coyoteTime = 0;

    // Inventory / weapons
    this.weaponSlot = 0;
    this.heldBlockId = 1; // grass by default for placing

    // Look angles (in radians)
    this.yaw = 0;
    this.pitch = 0;

    // Last damage info
    this.lastDamageTime = 0;
    this.dead = false;

    // Camera shake
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeDecay = 0;
  }

  get eyePosition() {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeOffset,
      this.position.z
    );
  }

  getLookDirection() {
    const dir = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    dir.applyEuler(euler);
    return dir;
  }

  takeDamage(amount, time) {
    if (this.iFrames || this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamageTime = time;
    if (this.health <= 0) this.dead = true;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addShake(x, y) {
    this.shakeX += x;
    this.shakeY += y;
    this.shakeDecay = 0.85;
  }

  updateStamina(dt, consuming) {
    if (consuming) {
      // don't regen during consumption
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * dt);
    }
  }

  update(dt) {
    // Camera shake decay
    if (Math.abs(this.shakeX) > 0.0001 || Math.abs(this.shakeY) > 0.0001) {
      this.shakeX *= this.shakeDecay;
      this.shakeY *= this.shakeDecay;
    }
    // Coyote time
    if (this.onGround) {
      this.coyoteTime = 0.12;
    } else {
      this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    }
  }
}
