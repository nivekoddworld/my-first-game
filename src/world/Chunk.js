import * as THREE from 'three';
import { CHUNK_W, CHUNK_H, CHUNK_D } from '../constants.js';
import { isSolid, getColor } from './Block.js';

// Face directions: +Y, -Y, +X, -X, +Z, -Z
const FACES = [
  { dir: [0,1,0], corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]], face: 0 },
  { dir: [0,-1,0], corners: [[1,0,0],[1,0,1],[0,0,1],[0,0,0]], face: 1 },
  { dir: [1,0,0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], face: 2 },
  { dir: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], face: 3 },
  { dir: [0,0,1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], face: 4 },
  { dir: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], face: 5 },
];

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_W * CHUNK_H * CHUNK_D);
    this.mesh = null;
    this.dirty = true;
    this.worldX = cx * CHUNK_W;
    this.worldZ = cz * CHUNK_D;
  }

  idx(x, y, z) {
    return (y * CHUNK_D + z) * CHUNK_W + x;
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_W || y < 0 || y >= CHUNK_H || z < 0 || z >= CHUNK_D) return 0;
    return this.blocks[this.idx(x, y, z)];
  }

  setBlock(x, y, z, id) {
    if (x < 0 || x >= CHUNK_W || y < 0 || y >= CHUNK_H || z < 0 || z >= CHUNK_D) return;
    this.blocks[this.idx(x, y, z)] = id;
    this.dirty = true;
  }

  buildMesh(getNeighborBlock) {
    const positions = [];
    const colors = [];
    const indices = [];
    let vi = 0;

    for (let y = 0; y < CHUNK_H; y++) {
      for (let z = 0; z < CHUNK_D; z++) {
        for (let x = 0; x < CHUNK_W; x++) {
          const id = this.getBlock(x, y, z);
          if (!isSolid(id)) continue;

          for (const { dir, corners, face } of FACES) {
            const nx = x + dir[0];
            const ny = y + dir[1];
            const nz = z + dir[2];

            let neighborSolid;
            if (nx < 0 || nx >= CHUNK_W || nz < 0 || nz >= CHUNK_D || ny < 0 || ny >= CHUNK_H) {
              neighborSolid = getNeighborBlock
                ? isSolid(getNeighborBlock(this.worldX + nx, ny, this.worldZ + nz))
                : false;
            } else {
              neighborSolid = isSolid(this.getBlock(nx, ny, nz));
            }

            if (!neighborSolid) {
              const col = getColor(id, face);
              const r = ((col >> 16) & 0xff) / 255;
              const g = ((col >> 8) & 0xff) / 255;
              const b = (col & 0xff) / 255;

              // Ambient occlusion factor per face
              const ao = face === 0 ? 1.0 : face === 1 ? 0.5 : 0.75;

              for (const [cx2, cy2, cz2] of corners) {
                positions.push(
                  this.worldX + x + cx2,
                  y + cy2,
                  this.worldZ + z + cz2
                );
                colors.push(r * ao, g * ao, b * ao);
              }

              indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
              vi += 4;
            }
          }
        }
      }
    }

    if (this.mesh) {
      this.mesh.geometry.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    if (!this.mesh) {
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.receiveShadow = true;
      this.mesh.castShadow = false;
    } else {
      this.mesh.geometry = geo;
    }

    this.dirty = false;
    return this.mesh;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
