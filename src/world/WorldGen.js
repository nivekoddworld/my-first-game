import { createNoise2D } from 'simplex-noise';
import { BLOCK, CHUNK_W, CHUNK_H, CHUNK_D } from '../constants.js';

let noise2D = null;
let noise2D2 = null;
let noise2D3 = null;

export function initNoise(seed = Math.random()) {
  // Simple seeded PRNG for simplex
  const rng = seededRng(seed);
  noise2D = createNoise2D(rng);
  noise2D2 = createNoise2D(seededRng(seed * 1.618));
  noise2D3 = createNoise2D(seededRng(seed * 2.718));
}

function seededRng(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

export function getTerrainHeight(wx, wz) {
  const scale1 = 0.008, scale2 = 0.04, scale3 = 0.1;
  const h1 = (noise2D(wx * scale1, wz * scale1) + 1) * 0.5;
  const h2 = (noise2D2(wx * scale2, wz * scale2) + 1) * 0.5;
  const h3 = (noise2D3(wx * scale3, wz * scale3) + 1) * 0.5;
  const height = 40 + h1 * 30 + h2 * 10 + h3 * 4;
  return Math.floor(height);
}

export function generateChunk(chunk) {
  const { cx, cz, worldX, worldZ } = chunk;
  const rng = seededRng((cx * 73856093) ^ (cz * 19349663));

  for (let lx = 0; lx < CHUNK_W; lx++) {
    for (let lz = 0; lz < CHUNK_D; lz++) {
      const wx = worldX + lx;
      const wz = worldZ + lz;
      const terrainH = getTerrainHeight(wx, wz);
      const snowLine = 75;
      const sandLine = 42;

      for (let y = 0; y < CHUNK_H; y++) {
        let id = BLOCK.AIR;

        if (y === 0) {
          id = BLOCK.STONE;
        } else if (y < terrainH - 4) {
          id = BLOCK.STONE;
        } else if (y < terrainH) {
          id = BLOCK.DIRT;
        } else if (y === terrainH) {
          if (y >= snowLine) id = BLOCK.SNOW;
          else if (y <= sandLine) id = BLOCK.SAND;
          else id = BLOCK.GRASS;
        }

        chunk.setBlock(lx, y, lz, id);
      }

      // Trees (on grass, not too high or low)
      if (terrainH > sandLine && terrainH < snowLine - 5) {
        if (rng() < 0.025) {
          placeTree(chunk, lx, terrainH + 1, lz, rng);
        }
      }

      // Rainbow crystals (rare)
      if (rng() < 0.002) {
        const ry = terrainH + 1;
        if (ry < CHUNK_H - 3) {
          chunk.setBlock(lx, ry, lz, BLOCK.RAINBOW);
          chunk.setBlock(lx, ry+1, lz, BLOCK.RAINBOW);
        }
      }
    }
  }

  // Clouds at y=90
  for (let lx = 0; lx < CHUNK_W; lx++) {
    for (let lz = 0; lz < CHUNK_D; lz++) {
      const wx = worldX + lx;
      const wz = worldZ + lz;
      const cn = (noise2D2(wx * 0.02, wz * 0.02) + 1) * 0.5;
      if (cn > 0.65) {
        const cloudH = 90;
        if (cloudH < CHUNK_H) {
          chunk.setBlock(lx, cloudH, lz, BLOCK.CLOUD);
          if (cn > 0.75) chunk.setBlock(lx, cloudH + 1, lz, BLOCK.CLOUD);
        }
      }
    }
  }

  chunk.dirty = true;
}

function placeTree(chunk, x, y, z, rng) {
  const trunkH = 4 + Math.floor(rng() * 3);
  for (let t = 0; t < trunkH; t++) {
    if (y + t < CHUNK_H) chunk.setBlock(x, y + t, z, BLOCK.WOOD);
  }
  // Leaves
  const topY = y + trunkH;
  for (let ly = -2; ly <= 1; ly++) {
    const r = ly < 0 ? 2 : 1;
    for (let lx2 = -r; lx2 <= r; lx2++) {
      for (let lz2 = -r; lz2 <= r; lz2++) {
        if (Math.abs(lx2) === r && Math.abs(lz2) === r) continue;
        const bx = x + lx2, by = topY + ly, bz = z + lz2;
        if (bx >= 0 && bx < CHUNK_W && bz >= 0 && bz < CHUNK_D && by >= 0 && by < CHUNK_H) {
          if (chunk.getBlock(bx, by, bz) === BLOCK.AIR) {
            chunk.setBlock(bx, by, bz, BLOCK.LEAVES);
          }
        }
      }
    }
  }
}
