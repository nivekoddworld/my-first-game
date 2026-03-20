import * as THREE from 'three';
import { SLIDE_SPEED_BOOST } from '../constants.js';

const MIN_SLIDE_SPEED = 3.5;
const SLIDE_FRICTION = 0.90;
const SLIDE_DURATION_MAX = 2.0;

export class Slide {
  constructor(player) {
    this.player = player;
    this.active = false;
    this.timer = 0;
    this.cooldown = 0;
  }

  canSlide() {
    const p = this.player;
    const hspeed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    return (
      p.isSprinting &&
      p.onGround &&
      !p.isRolling &&
      !this.active &&
      this.cooldown <= 0 &&
      hspeed > MIN_SLIDE_SPEED
    );
  }

  trigger() {
    const p = this.player;
    const hspeed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    // Boost speed a bit
    p.velocity.x *= SLIDE_SPEED_BOOST;
    p.velocity.z *= SLIDE_SPEED_BOOST;
    this.active = true;
    p.isSliding = true;
    p.isCrouching = true;
    this.timer = SLIDE_DURATION_MAX;
    const s = document.getElementById('status-sliding');
    if (s) s.style.display = 'flex';
  }

  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = this.player;

    if (!this.active) return;

    this.timer -= dt;
    const hspeed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);

    // End conditions
    if (
      this.timer <= 0 ||
      hspeed < 1.5 ||
      !p.onGround ||
      (input.crouch === false && !input.sprint)
    ) {
      this._end();
      return;
    }

    // Apply friction
    p.velocity.x *= SLIDE_FRICTION;
    p.velocity.z *= SLIDE_FRICTION;

    // Allow slight steering
    const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    if (input.left) {
      p.velocity.x -= right.x * 2 * dt;
      p.velocity.z -= right.z * 2 * dt;
    }
    if (input.right) {
      p.velocity.x += right.x * 2 * dt;
      p.velocity.z += right.z * 2 * dt;
    }
  }

  _end() {
    this.active = false;
    this.player.isSliding = false;
    this.player.isCrouching = false;
    this.cooldown = 0.5;
    const s = document.getElementById('status-sliding');
    if (s) s.style.display = 'none';
  }
}
