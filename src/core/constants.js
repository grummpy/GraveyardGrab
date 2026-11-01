/** Shared rules. Pure data — no DOM, no canvas. */

export const MAZE_W = 21;
export const MAZE_H = 15;
export const PLAYER_COUNT = 4;
export const ROUND_SECONDS = 120;
export const SHIFT_SECONDS = 15;
export const PLAYER_SPEED = 3.25;
export const PLAYER_RADIUS = 0.28;
export const TAG_RANGE = 0.78;
export const INVULN_SECONDS = 1.6;
export const BANISH_SECONDS = 2.8;
export const MAX_CARRY = 5;
export const ORB_TARGET = 6;
export const ORB_RESPAWN = 1.2;
export const PICKUP_RADIUS = 0.42;
export const DASH_TIME = 0.16;
export const DASH_COOLDOWN = 0.9;
export const DASH_MULT = 2.4;
export const POWER_SPAWN_EVERY = 11;
export const HASTE_MULT = 1.65;
export const HASTE_TIME = 4;
export const PHASE_TIME = 3.2;
export const MAGNET_TIME = 4.2;
export const MAGNET_RADIUS = 3.4;
export const MAGNET_PULL = 5.5;
export const STEP_DT = 1 / 60;
export const PORT = 8808;

export const POWER_TYPES = ["haste", "phase", "shield", "magnet"];

export const PLAYERS = [
  { id: 0, label: "P1", name: "Moss", color: "#3DDC6A", deep: "#146b32" },
  { id: 1, label: "P2", name: "Brick", color: "#FF4B4B", deep: "#8f1828" },
  { id: 2, label: "P3", name: "Banjo", color: "#FFE14A", deep: "#a07a08" },
  { id: 3, label: "P4", name: "Cobalt", color: "#4DA3FF", deep: "#1848a0" },
];

export function cryptsFor(w = MAZE_W, h = MAZE_H) {
  return [
    { tx: 1, ty: 1 },
    { tx: w - 2, ty: 1 },
    { tx: 1, ty: h - 2 },
    { tx: w - 2, ty: h - 2 },
  ];
}

export function cryptCenter(w, h, index) {
  const c = cryptsFor(w, h)[index];
  return { x: c.tx + 0.5, y: c.ty + 0.5 };
}
