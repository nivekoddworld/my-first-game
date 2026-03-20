// Block type IDs
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  LEAVES: 6,
  WATER: 7,
  SNOW: 8,
  GRAVEL: 9,
  PLANKS: 10,
  RAINBOW: 11, // special uwu block
  CLOUD: 12,
};

// Block colors [top, side, bottom] as hex
export const BLOCK_COLORS = {
  [BLOCK.GRASS]:   [0x5cb85c, 0x8B6914, 0x8B6914],
  [BLOCK.DIRT]:    [0x8B6914, 0x8B6914, 0x8B6914],
  [BLOCK.STONE]:   [0x808080, 0x808080, 0x808080],
  [BLOCK.SAND]:    [0xf0d080, 0xf0d080, 0xf0d080],
  [BLOCK.WOOD]:    [0xB8860B, 0x8B6914, 0xB8860B],
  [BLOCK.LEAVES]:  [0x228B22, 0x2d8c2d, 0x228B22],
  [BLOCK.WATER]:   [0x1a6699, 0x1a7ab5, 0x1a6699],
  [BLOCK.SNOW]:    [0xffffff, 0xddddee, 0xffffff],
  [BLOCK.GRAVEL]:  [0x909090, 0x888888, 0x909090],
  [BLOCK.PLANKS]:  [0xD2B48C, 0xD2B48C, 0xD2B48C],
  [BLOCK.RAINBOW]: [0xff69b4, 0xa855f7, 0x00cfff],
  [BLOCK.CLOUD]:   [0xffffff, 0xeeeeee, 0xffffff],
};

// Solid check
export const BLOCK_SOLID = new Uint8Array(256);
for (let i = 1; i < 256; i++) BLOCK_SOLID[i] = 1;
BLOCK_SOLID[BLOCK.AIR] = 0;
BLOCK_SOLID[BLOCK.WATER] = 0;

// Chunk dimensions
export const CHUNK_W = 16;
export const CHUNK_H = 128;
export const CHUNK_D = 16;

// Render distance in chunks
export const RENDER_DIST_DESKTOP = 5;
export const RENDER_DIST_MOBILE = 3;

// Player physics
export const GRAVITY = 28;
export const JUMP_FORCE = 8.5;
export const WALK_SPEED = 5.5;
export const SPRINT_SPEED = 9.5;
export const CROUCH_SPEED = 2.8;
export const SLIDE_SPEED_BOOST = 1.35;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_WIDTH = 0.6;

// Dodge roll
export const ROLL_DURATION = 0.4;
export const ROLL_WINDUP = 0.08;
export const ROLL_RECOVERY = 0.18;
export const ROLL_STAMINA_COST = 25;
export const ROLL_SPEED_MULT = 1.8;

// Grapple
export const GRAPPLE_MAX_DIST = 50;
export const GRAPPLE_SPRING_K = 12;
export const GRAPPLE_DAMPING = 0.85;
export const GRAPPLE_DETACH_BOOST = 1.4;

// Stamina
export const STAMINA_MAX = 100;
export const STAMINA_REGEN = 22;

// Portal
export const PORTAL_W = 2;
export const PORTAL_H = 3;

// Colors
export const COLOR_PORTAL_BLUE = 0x00aaff;
export const COLOR_PORTAL_ORANGE = 0xff6600;

// UWU FNAF
export const FNAF_SIGHT_RANGE = 15;
export const FNAF_ATTACK_RANGE = 2.2;
export const FNAF_CHASE_SPEED = 4.5;
export const FNAF_WANDER_SPEED = 1.8;
export const FNAF_ATTACK_DAMAGE = 12;
export const FNAF_HEALTH = 80;

export const KITTEN_SPEED = 2.2;
export const KITTEN_PET_RANGE = 1.8;

// Gun params
export const GUNS = {
  PISTOL: {
    name: 'M1911 Pistol',
    magCapacity: 7,
    fireRate: 0.15,    // seconds between shots
    damage: 35,
    recoilX: 0.015,
    recoilY: 0.04,
    spread: 0.015,
    range: 60,
    reloadTime: 1.8,
    rackTime: 0.35,
    modes: ['semi'],
    jamChanceBase: 0.0008,
  },
  RIFLE: {
    name: 'AKM Rifle',
    magCapacity: 30,
    fireRate: 0.09,
    damage: 28,
    recoilX: 0.008,
    recoilY: 0.025,
    spread: 0.02,
    range: 120,
    reloadTime: 2.4,
    rackTime: 0.4,
    modes: ['semi', 'auto'],
    jamChanceBase: 0.0005,
  },
  SHOTGUN: {
    name: 'Remington 870',
    magCapacity: 6,
    fireRate: 0.9,
    damage: 15,   // per pellet, 8 pellets
    pellets: 8,
    recoilX: 0.02,
    recoilY: 0.1,
    spread: 0.08,
    range: 20,
    reloadTime: 0.7, // per shell
    rackTime: 0.45,
    modes: ['semi'],
    jamChanceBase: 0.0003,
    shellByShell: true,
  },
};
