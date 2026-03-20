import * as THREE from 'three';
import { COLOR_PORTAL_BLUE, COLOR_PORTAL_ORANGE, PORTAL_W, PORTAL_H } from '../constants.js';

export class Portal {
  constructor(color, colorHex) {
    this.color = color;
    this.colorHex = colorHex;
    this.active = false;
    this.position = new THREE.Vector3();
    this.normal = new THREE.Vector3(0, 0, 1);
    this.mesh = null;
    this.renderTarget = null;
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 500);
    this.matrix = new THREE.Matrix4();
  }
}

export class PortalGun {
  constructor(scene, renderer, isMobile) {
    this.scene = scene;
    this.renderer = renderer;

    const res = isMobile ? 512 : 1024;
    this.bluePortal = this._makePortal(COLOR_PORTAL_BLUE, res);
    this.orangePortal = this._makePortal(COLOR_PORTAL_ORANGE, res);
    this.cooldown = 0;

    // Link portals
    this.bluePortal.other = this.orangePortal;
    this.orangePortal.other = this.bluePortal;
  }

  _makePortal(colorHex, res) {
    const portal = new Portal('portal', colorHex);
    portal.renderTarget = new THREE.WebGLRenderTarget(res, res);

    // Portal quad geometry
    const geo = new THREE.PlaneGeometry(PORTAL_W, PORTAL_H);
    const mat = new THREE.MeshBasicMaterial({
      map: portal.renderTarget.texture,
      side: THREE.DoubleSide,
    });
    portal.mesh = new THREE.Mesh(geo, mat);
    portal.mesh.visible = false;
    portal.mesh.renderOrder = 1;

    // Glowing border
    const edges = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: colorHex,
      linewidth: 3,
    });
    const border = new THREE.LineSegments(edges, edgeMat);
    border.scale.set(1.05, 1.05, 1.05);
    portal.mesh.add(border);

    // Glow ring
    const ringGeo = new THREE.TorusGeometry(PORTAL_W * 0.6, 0.12, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.scale.set(1, PORTAL_H / PORTAL_W, 1);
    portal.mesh.add(ring);

    this.scene.add(portal.mesh);
    return portal;
  }

  placePortal(portal, hitPos, hitNormal) {
    portal.active = true;
    portal.position.copy(hitPos);
    portal.normal.copy(hitNormal);

    // Position slightly off surface
    portal.mesh.position.copy(hitPos).addScaledVector(hitNormal, 0.05);

    // Orient to face outward from surface
    const up = Math.abs(hitNormal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const quat = new THREE.Quaternion();
    const mat = new THREE.Matrix4();
    mat.lookAt(portal.mesh.position, portal.mesh.position.clone().add(hitNormal), up);
    quat.setFromRotationMatrix(mat);
    portal.mesh.quaternion.copy(quat);
    portal.mesh.visible = true;

    // Update world matrix
    portal.mesh.updateMatrixWorld(true);
    portal.matrix.copy(portal.mesh.matrixWorld);

    this._updateHUDIndicators();
  }

  firePrimary(world, camera) {
    if (this.cooldown > 0) return;
    const hit = this._raycastWorld(world, camera);
    if (hit) {
      this.placePortal(this.bluePortal, hit.pos, hit.normal);
      this.cooldown = 0.3;
    }
  }

  fireSecondary(world, camera) {
    if (this.cooldown > 0) return;
    const hit = this._raycastWorld(world, camera);
    if (hit) {
      this.placePortal(this.orangePortal, hit.pos, hit.normal);
      this.cooldown = 0.3;
    }
  }

  _raycastWorld(world, camera) {
    const origin = camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    return world.raycast(origin, dir, 60);
  }

  // Render portal views (call before main render)
  renderPortalViews(mainCamera, mainScene) {
    const { bluePortal: bp, orangePortal: op } = this;

    if (bp.active && op.active) {
      // Render orange portal view into blue render target
      this._renderPortalView(mainCamera, bp, op, mainScene);
      // Render blue portal view into orange render target
      this._renderPortalView(mainCamera, op, bp, mainScene);
    }
  }

  _renderPortalView(mainCamera, srcPortal, dstPortal, scene) {
    // Temporarily hide the dst portal mesh to avoid z-fighting
    dstPortal.mesh.visible = false;

    // Compute portal camera: transform from main camera through portal pair
    const srcMat = srcPortal.mesh.matrixWorld;
    const dstMat = dstPortal.mesh.matrixWorld;

    // Camera relative to source portal
    const invSrc = new THREE.Matrix4().copy(srcMat).invert();
    const camRelToSrc = new THREE.Matrix4().copy(mainCamera.matrixWorld).premultiply(invSrc);

    // Flip 180 around Y (portals face each other)
    const flip = new THREE.Matrix4().makeRotationY(Math.PI);
    const portalCamWorld = new THREE.Matrix4()
      .copy(camRelToSrc)
      .premultiply(flip)
      .premultiply(dstMat);

    srcPortal.camera.matrixWorld.copy(portalCamWorld);
    srcPortal.camera.matrixWorldInverse.copy(portalCamWorld).invert();
    srcPortal.camera.fov = mainCamera.fov;
    srcPortal.camera.aspect = mainCamera.aspect;
    srcPortal.camera.near = mainCamera.near;
    srcPortal.camera.far = mainCamera.far;
    srcPortal.camera.updateProjectionMatrix();

    this.renderer.setRenderTarget(srcPortal.renderTarget);
    this.renderer.render(scene, srcPortal.camera);
    this.renderer.setRenderTarget(null);

    dstPortal.mesh.visible = true;
  }

  // Check if player is passing through a portal
  checkTeleport(player) {
    const { bluePortal: bp, orangePortal: op } = this;
    if (!bp.active || !op.active) return;

    this._checkPortalPass(player, bp, op);
    this._checkPortalPass(player, op, bp);
  }

  _checkPortalPass(player, inPortal, outPortal) {
    const toPortal = player.position.clone().sub(inPortal.position);
    const dist = toPortal.dot(inPortal.normal);

    // Check if player is within portal bounds and crossed the plane
    const projected = player.position.clone().sub(inPortal.normal.clone().multiplyScalar(dist));
    const localDiff = projected.clone().sub(inPortal.position);

    // Check within portal rectangle
    const inPortalMesh = inPortal.mesh;
    const invQuat = inPortalMesh.quaternion.clone().invert();
    const localPos = localDiff.clone().applyQuaternion(invQuat);

    if (
      Math.abs(localPos.x) < PORTAL_W * 0.5 &&
      Math.abs(localPos.y) < PORTAL_H * 0.5 &&
      Math.abs(dist) < 0.8
    ) {
      // Teleport!
      const inMat = inPortal.mesh.matrixWorld.clone();
      const outMat = outPortal.mesh.matrixWorld.clone();
      const invIn = inMat.clone().invert();
      const flip = new THREE.Matrix4().makeRotationY(Math.PI);

      // Transform position
      const newPos = player.position.clone();
      newPos.applyMatrix4(invIn);
      newPos.applyMatrix4(flip);
      newPos.applyMatrix4(outMat);
      // Offset out of portal
      newPos.addScaledVector(outPortal.normal, 1.5);
      player.position.copy(newPos);

      // Transform velocity
      const newVel = player.velocity.clone();
      newVel.transformDirection(invIn);
      newVel.transformDirection(flip);
      newVel.transformDirection(outMat);
      player.velocity.copy(newVel);

      // Transform yaw
      const yawQuat = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(0, player.yaw, 0));
      yawQuat.premultiply(invIn.extractRotation(new THREE.Matrix4().copy(invIn)));
      const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI);
      yawQuat.multiply(flipQuat);
      const outRotQuat = new THREE.Quaternion().setFromRotationMatrix(outMat);
      yawQuat.premultiply(outRotQuat);
      const euler = new THREE.Euler().setFromQuaternion(yawQuat, 'YXZ');
      player.yaw = euler.y;
    }
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  _updateHUDIndicators() {
    const bInd = document.getElementById('portal-b-ind');
    const oInd = document.getElementById('portal-o-ind');
    if (bInd) bInd.className = `portal-indicator${this.bluePortal.active ? ' blue' : ''}`;
    if (oInd) oInd.className = `portal-indicator${this.orangePortal.active ? ' orange' : ''}`;
  }
}
