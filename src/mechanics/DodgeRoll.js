import * as THREE from 'three';
import {
  ROLL_DURATION, ROLL_WINDUP, ROLL_RECOVERY, ROLL_STAMINA_COST, ROLL_SPEED_MULT
} from '../constants.js';

const STATE = { IDLE: 'idle', WINDUP: 'windup', ROLLING: 'rolling', RECOVERY: 'recovery' };

export class DodgeRoll {
  constructor(player) {
    this.player = player;
    this.state = STATE.IDLE;
    this.timer = 0;
    this.cooldown = 0;
    this.rollDir = new THREE.Vector3();
  }

  canRoll() {
    return (
      this.state === STATE.IDLE &&
      this.cooldown <= 0 &&
      this.player.stamina >= ROLL_STAMINA_COST &&
      !this.player.dead
    );
  }

  trigger(input) {
    if (!this.canRoll()) return;

    const p = this.player;

    // Determine roll direction from input, or backward if nothing
    const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const dir = new THREE.Vector3();

    if (input.forward) dir.addScaledVector(forward, 1);
    if (input.backward) dir.addScaledVector(forward, -1);
    if (input.left) dir.addScaledVector(right, -1);
    if (input.right) dir.addScaledVector(right, 1);

    if (dir.length() < 0.1) dir.addScaledVector(forward, 1); // default: forward

    dir.normalize();
    this.rollDir.copy(dir);

    this.state = STATE.WINDUP;
    this.timer = ROLL_WINDUP;

    p.stamina = Math.max(0, p.stamina - ROLL_STAMINA_COST);
    p.isRolling = true;
    p.iFrames = false;

    // Flash effect
    const flash = document.getElementById('roll-flash');
    if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 100); }
    const statusRoll = document.getElementById('status-rolling');
    if (statusRoll) statusRoll.style.display = 'flex';
  }

  update(dt) {
    const p = this.player;
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.state === STATE.IDLE) return;

    this.timer -= dt;

    if (this.state === STATE.WINDUP) {
      if (this.timer <= 0) {
        this.state = STATE.ROLLING;
        this.timer = ROLL_DURATION;
        p.iFrames = true;
      }
    } else if (this.state === STATE.ROLLING) {
      // Apply roll velocity
      p.velocity.x = this.rollDir.x * ROLL_SPEED_MULT * 8;
      p.velocity.z = this.rollDir.z * ROLL_SPEED_MULT * 8;

      if (this.timer <= 0) {
        this.state = STATE.RECOVERY;
        this.timer = ROLL_RECOVERY;
        p.iFrames = false;
      }
    } else if (this.state === STATE.RECOVERY) {
      // Decelerate
      p.velocity.x *= 0.88;
      p.velocity.z *= 0.88;

      if (this.timer <= 0) {
        this.state = STATE.IDLE;
        p.isRolling = false;
        p.iFrames = false;
        this.cooldown = 0.2; // short extra cooldown after recovery
        const statusRoll = document.getElementById('status-rolling');
        if (statusRoll) statusRoll.style.display = 'none';
      }
    }
  }

  get isActive() { return this.state !== STATE.IDLE; }
}
