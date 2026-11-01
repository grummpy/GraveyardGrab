import { cryptCenter, MAGNET_RADIUS, TAG_RANGE } from "./constants.js";
import { nextDir } from "./maze.js";

const ZERO = { x: 0, y: 0, action: false, secondary: false };

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Simple ghost: haul orbs home once it is holding a few (or the clock is low),
 * otherwise chase the nearest free soul, and lunge when a tag is in reach.
 */
export function botControls(round, index) {
  const p = round.players[index];
  if (!p || !p.active || p.banished > 0) return { ...ZERO };

  const maze = round.maze;
  const crypt = cryptCenter(maze.w, maze.h, index);
  if (!round._reserved) round._reserved = new Set();

  let threat = null;
  let threatDist = Infinity;
  for (let i = 0; i < round.players.length; i++) {
    if (i === index) continue;
    const o = round.players[i];
    if (!o.active || o.banished > 0 || o.invuln > 0) continue;
    const d = dist(p, o);
    if (d < threatDist) {
      threat = o;
      threatDist = d;
    }
  }

  const haul = p.carried >= 2 || (p.carried > 0 && round.time < 22);
  let goal = crypt;
  if (!haul) {
    if (threat && threatDist < 4.2 && (threat.carried > 0 || p.carried === 0)) {
      goal = threat;
    } else {
      let best = null;
      let bestD = Infinity;
      for (const orb of round.orbs) {
        if (round._reserved.has(orb.id)) continue;
        const d = dist(p, orb);
        if (d < bestD) {
          best = orb;
          bestD = d;
        }
      }
      if (best) {
        round._reserved.add(best.id);
        goal = best;
      }
    }
  }

  const step = nextDir(maze, p.x, p.y, goal.x, goal.y);

  const wantDash = !!(threat && threatDist < TAG_RANGE + 0.45 && p.dashCd <= 0);
  const action = wantDash && !p.aiDash;
  p.aiDash = wantDash;

  let wantPower = false;
  if (p.heldPower === "shield") wantPower = !!(threat && threatDist < 1.6);
  else if (p.heldPower === "haste") wantPower = p.carried > 0 || !!(threat && threatDist < 3);
  else if (p.heldPower === "phase") wantPower = p.carried >= 2;
  else if (p.heldPower === "magnet") {
    wantPower = round.orbs.some((orb) => dist(p, orb) < MAGNET_RADIUS && dist(p, orb) > 0.5);
  }
  const secondary = wantPower && !p.aiLatch;
  p.aiLatch = wantPower;

  return { x: step.x, y: step.y, action, secondary };
}
