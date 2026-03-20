import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { generateChunk } from './WorldGen.js';
import { isSolid } from './Block.js';
import { CHUNK_W, CHUNK_H, CHUNK_D, RENDER_DIST_DESKTOP, RENDER_DIST_MOBILE } from '../constants.js';

export class World {
  constructor(scene, isMobile = false) {
    this.scene = scene;
    this.chunks = new Map();
    this.renderDist = isMobile ? RENDER_DIST_MOBILE : RENDER_DIST_DESKTOP;
    this.pendingMesh = [];
  }

  chunkKey(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) { return this.chunks.get(this.chunkKey(cx, cz)); }

  getOrCreateChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      const chunk = new Chunk(cx, cz);
      generateChunk(chunk);
      this.chunks.set(key, chunk);
      this.pendingMesh.push(chunk);
    }
    return this.chunks.get(key);
  }

  getBlock(wx, wy, wz) {
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx, wy, wz, id) {
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    chunk.setBlock(lx, wy, lz, id);
    // Mark neighbors dirty if on boundary
    if (lx === 0) this.markChunkDirty(cx - 1, cz);
    if (lx === CHUNK_W - 1) this.markChunkDirty(cx + 1, cz);
    if (lz === 0) this.markChunkDirty(cx, cz - 1);
    if (lz === CHUNK_D - 1) this.markChunkDirty(cx, cz + 1);
  }

  markChunkDirty(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (c) { c.dirty = true; this.pendingMesh.push(c); }
  }

  getNeighborBlock(wx, wy, wz) {
    return this.getBlock(wx, wy, wz);
  }

  update(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_W);
    const pcz = Math.floor(playerZ / CHUNK_D);
    const rd = this.renderDist;

    // Load chunks in range
    for (let dx = -rd; dx <= rd; dx++) {
      for (let dz = -rd; dz <= rd; dz++) {
        this.getOrCreateChunk(pcx + dx, pcz + dz);
      }
    }

    // Process pending meshes (one or two per frame for performance)
    const toProcess = this.pendingMesh.splice(0, 2);
    for (const chunk of toProcess) {
      if (chunk.dirty) {
        const mesh = chunk.buildMesh((wx, wy, wz) => this.getNeighborBlock(wx, wy, wz));
        if (!this.scene.children.includes(mesh)) {
          this.scene.add(mesh);
        }
      }
    }

    // Unload far chunks
    for (const [key, chunk] of this.chunks) {
      const [cxs, czs] = key.split(',').map(Number);
      if (Math.abs(cxs - pcx) > rd + 2 || Math.abs(czs - pcz) > rd + 2) {
        if (chunk.mesh) this.scene.remove(chunk.mesh);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }
  }

  // DDA raycast through voxels
  // Returns {hit, pos, normal, blockPos} or null
  raycast(origin, direction, maxDist = 10) {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const dx = direction.x, dy = direction.y, dz = direction.z;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / dx);
    const tDeltaY = Math.abs(1 / dy);
    const tDeltaZ = Math.abs(1 / dz);

    let tMaxX = dx > 0 ? (x + 1 - origin.x) * tDeltaX : (origin.x - x) * tDeltaX;
    let tMaxY = dy > 0 ? (y + 1 - origin.y) * tDeltaY : (origin.y - y) * tDeltaY;
    let tMaxZ = dz > 0 ? (z + 1 - origin.z) * tDeltaZ : (origin.z - z) * tDeltaZ;

    let lastFace = null;
    let t = 0;

    while (t < maxDist) {
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX; t = tMaxX; tMaxX += tDeltaX;
          lastFace = [-stepX, 0, 0];
        } else {
          z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
          lastFace = [0, 0, -stepZ];
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY; t = tMaxY; tMaxY += tDeltaY;
          lastFace = [0, -stepY, 0];
        } else {
          z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
          lastFace = [0, 0, -stepZ];
        }
      }

      if (y < 0 || y >= CHUNK_H) break;

      const id = this.getBlock(x, y, z);
      if (isSolid(id)) {
        return {
          hit: true,
          blockPos: { x, y, z },
          normal: lastFace ? new THREE.Vector3(...lastFace) : new THREE.Vector3(0, 1, 0),
          pos: new THREE.Vector3(origin.x + dx * t, origin.y + dy * t, origin.z + dz * t),
          blockId: id,
          t,
        };
      }
    }
    return null;
  }

  // Returns surface height at world x, z
  getSurfaceY(wx, wz) {
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 40;
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    for (let y = CHUNK_H - 1; y >= 0; y--) {
      if (isSolid(chunk.getBlock(lx, y, lz))) return y + 1;
    }
    return 0;
  }
}
