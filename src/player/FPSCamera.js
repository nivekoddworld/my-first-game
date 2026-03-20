import * as THREE from 'three';

export class FPSCamera {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;

    // Headbob
    this.bobTime = 0;
    this.bobAmount = 0;
    this.bobTarget = 0;

    // Roll (slide/dodge)
    this.currentRoll = 0;
    this.targetRoll = 0;

    // Pitch offset (slide dip)
    this.pitchOffset = 0;
    this.targetPitchOffset = 0;

    // ADS zoom
    this.fovNormal = 75;
    this.fovADS = 45;
    this.currentFov = 75;
    this.targetFov = 75;

    // Eye height for crouch
    this.eyeY = player.eyeOffset;
    this.targetEyeY = player.eyeOffset;
  }

  update(dt) {
    const p = this.player;

    // --- Headbob ---
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    if (p.onGround && speed > 1.5) {
      this.bobTarget = p.isSprinting ? 0.08 : 0.04;
      this.bobTime += dt * (p.isSprinting ? 14 : 9);
    } else {
      this.bobTarget = 0;
    }
    this.bobAmount += (this.bobTarget - this.bobAmount) * 8 * dt;

    // --- Roll ---
    if (p.isSliding) {
      const slideDir = Math.atan2(p.velocity.x, p.velocity.z);
      this.targetRoll = 0.12;
    } else if (p.isRolling) {
      this.targetRoll = 0.25;
    } else {
      this.targetRoll = 0;
    }
    this.currentRoll += (this.targetRoll - this.currentRoll) * 10 * dt;

    // --- Pitch offset ---
    this.targetPitchOffset = p.isSliding ? -0.2 : 0;
    this.pitchOffset += (this.targetPitchOffset - this.pitchOffset) * 8 * dt;

    // --- Eye height ---
    this.targetEyeY = p.isCrouching ? p.eyeOffset * 0.6 : p.eyeOffset;
    this.eyeY += (this.targetEyeY - this.eyeY) * 10 * dt;

    // --- FOV ---
    this.currentFov += (this.targetFov - this.currentFov) * 12 * dt;
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    // --- Apply to camera ---
    const eye = p.position.clone();
    eye.y += this.eyeY;
    eye.y += Math.sin(this.bobTime) * this.bobAmount;
    eye.x += Math.cos(this.bobTime * 0.5) * this.bobAmount * 0.5;

    // Camera shake
    eye.x += p.shakeX;
    eye.y += p.shakeY;

    this.camera.position.copy(eye);

    const euler = new THREE.Euler(
      p.pitch + this.pitchOffset,
      p.yaw,
      this.currentRoll,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(euler);
  }

  setADS(enabled) {
    this.targetFov = enabled ? this.fovADS : this.fovNormal;
  }
}
