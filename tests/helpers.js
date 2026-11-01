import { createMatch } from "../src/core/sim.js";

export const HUMANS = [
  { kind: "human" },
  { kind: "human" },
  { kind: "human" },
  { kind: "human" },
];

export const BOTS = [
  { kind: "bot" },
  { kind: "bot" },
  { kind: "bot" },
  { kind: "bot" },
];

export function zeros() {
  return [0, 1, 2, 3].map(() => ({ x: 0, y: 0, action: false, secondary: false }));
}

export function stick(i, control) {
  const controls = zeros();
  controls[i] = { x: 0, y: 0, action: false, secondary: false, ...control };
  return controls;
}

export function freshMatch(extra = {}) {
  return createMatch({ seed: 1, slots: HUMANS, roundCount: 1, ...extra });
}

/** Open yard with one tombstone column and a single gap, for collision tests. */
export function openYard(match) {
  const maze = match.round.maze;
  const { w, h } = maze;
  const tiles = Array(w * h).fill(1);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) tiles[y * w + x] = 0;
  }
  for (let y = 1; y < h - 1; y++) {
    if (y !== 7) tiles[y * w + 10] = 1;
  }
  maze.tiles = tiles;
  const round = match.round;
  round.orbs = [];
  round.powerups = [];
  round.respawns = [];
  round.shiftTimer = 100;
  round.powerTimer = 100;
  round.time = 100;
  for (const p of round.players) {
    p.invuln = 0;
    p.banished = 0;
    p.carried = 0;
    p.banked = 0;
    p.haste = 0;
    p.phase = 0;
    p.dash = 0;
    p.shield = false;
    p.heldPower = null;
  }
  return match;
}
