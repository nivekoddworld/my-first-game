import * as THREE from 'three';
import { isSolid } from '../world/Block.js';
import {
  GRAVITY, JUMP_FORCE, WALK_SPEED, SPRINT_SPEED, CROUCH_SPEED,
  PLAYER_HEIGHT, PLAYER_WIDTH, CHUNK_H
} from '../constants.js';

const EPSILON = 0.001;

export class PlayerController {
  constructor(player, world) {
    this.player = player;
    this.world = world;
  }

  update(dt, input) {
    const p = this.player;
    if (p.dead) return;

    // Don't apply normal movement during roll (handled by DodgeRoll)
    // Don't apply normal movement during slide (handled by Slide)
    const sliding = p.isSliding;
    const rolling = p.isRolling;

    // --- Horizontal movement ---
    if (!rolling && !sliding) {
      const speed = p.isCrouching ? CROUCH_SPEED : (p.isSprinting ? SPRINT_SPEED : WALK_SPEED);

      const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

      const move = new THREE.Vector3();
      if (input.forward) move.addScaledVector(forward, speed);
      if (input.backward) move.addScaledVector(forward, -speed);
      if (input.right) move.addScaledVector(right, speed);
      if (input.left) move.addScaledVector(right, -speed);

      if (move.length() > speed) move.normalize().multiplyScalar(speed);

      // Apply to velocity (horizontal only, smooth)
      if (p.onGround) {
        p.velocity.x = move.x;
        p.velocity.z = move.z;
      } else {
        // Air control (reduced)
        p.velocity.x += (move.x - p.velocity.x) * 5 * dt;
        p.velocity.z += (move.z - p.velocity.z) * 5 * dt;
      }

      // Ground friction
      if (p.onGround && move.length() === 0) {
        p.velocity.x *= 0.78;
        p.velocity.z *= 0.78;
      }
    }

    // --- Sliding decel handled in Slide.js, just apply friction ---
    if (sliding) {
      if (p.onGround) {
        p.velocity.x *= 0.92;
        p.velocity.z *= 0.92;
      }
    }

    // --- Gravity ---
    if (!p.isGrappling) {
      p.velocity.y -= GRAVITY * dt;
    }

    // --- Jump ---
    if (input.jump && p.coyoteTime > 0) {
      p.velocity.y = JUMP_FORCE;
      p.coyoteTime = 0;
      p.onGround = false;
    }

    // Clamp fall speed
    p.velocity.y = Math.max(p.velocity.y, -50);

    // --- Collision & Move ---
    this.moveWithCollision(dt);

    p.update(dt);
  }

  moveWithCollision(dt) {
    const p = this.player;
    const pos = p.position;
    const vel = p.velocity;

    const crouchScale = p.isCrouching ? 0.6 : 1.0;
    const h = p.height * crouchScale;
    const hw = p.width * 0.5;

    // Move axes separately
    pos.x += vel.x * dt;
    this.resolveAxis('x', pos, vel, hw, h);

    pos.y += vel.y * dt;
    const wasOnGround = p.onGround;
    p.onGround = false;
    this.resolveAxis('y', pos, vel, hw, h, true);

    pos.z += vel.z * dt;
    this.resolveAxis('z', pos, vel, hw, h);

    // Keep in world bounds
    pos.y = Math.max(0.1, pos.y);
    if (pos.y >= CHUNK_H - 2) {
      pos.y = CHUNK_H - 2;
      vel.y = 0;
    }
  }

  resolveAxis(axis, pos, vel, hw, h, isY = false) {
    const p = this.player;
    const world = this.world;

    // Check corners of AABB
    const minX = pos.x - hw, maxX = pos.x + hw;
    const minY = pos.y, maxY = pos.y + h;
    const minZ = pos.z - hw, maxZ = pos.z + hw;

    const xs = [Math.floor(minX), Math.floor(maxX)];
    const ys = [Math.floor(minY), Math.floor(maxY - EPSILON)];
    const zs = [Math.floor(minZ), Math.floor(maxZ)];

    let collision = false;

    for (const x of new Set(xs)) {
      for (const y of new Set(ys)) {
        for (const z of new Set(zs)) {
          if (y < 0 || y >= CHUNK_H) continue;
          if (isSolid(world.getBlock(x, y, z))) {
            collision = true;

            if (axis === 'x') {
              if (vel.x > 0) pos.x = x - hw - EPSILON;
              else pos.x = x + 1 + hw + EPSILON;
              vel.x = 0;
            } else if (axis === 'y') {
              if (vel.y < 0) {
                pos.y = y + 1;
                vel.y = 0;
                p.onGround = true;
              } else {
                pos.y = y - h - EPSILON;
                vel.y = 0;
              }
            } else if (axis === 'z') {
              if (vel.z > 0) pos.z = z - hw - EPSILON;
              else pos.z = z + 1 + hw + EPSILON;
              vel.z = 0;
            }
          }
        }
      }
    }
  }
}
