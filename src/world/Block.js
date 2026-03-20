import { BLOCK, BLOCK_COLORS, BLOCK_SOLID } from '../constants.js';

export { BLOCK, BLOCK_COLORS, BLOCK_SOLID };

export function isSolid(id) {
  return BLOCK_SOLID[id & 0xff] === 1;
}

export function getColor(id, face) {
  const colors = BLOCK_COLORS[id];
  if (!colors) return 0x888888;
  // face 0=top, 1=bottom, 2-5=sides
  if (face === 0) return colors[0];
  if (face === 1) return colors[2];
  return colors[1];
}
