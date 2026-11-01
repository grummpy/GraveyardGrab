import { botControls } from "./ai.js";
import { circleHitsWall, moveCircle } from "./collision.js";
import {
  BANISH_SECONDS,
  cryptCenter,
  cryptsFor,
  DASH_COOLDOWN,
  DASH_MULT,
  DASH_TIME,
  HASTE_MULT,
  HASTE_TIME,
  INVULN_SECONDS,
  MAGNET_PULL,
  MAGNET_RADIUS,
  MAGNET_TIME,
  MAX_CARRY,
  MAZE_H,
  MAZE_W,
  ORB_RESPAWN,
  ORB_TARGET,
  PHASE_TIME,
  PICKUP_RADIUS,
  PLAYER_COUNT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  POWER_SPAWN_EVERY,
  POWER_TYPES,
  ROUND_SECONDS,
  SHIFT_SECONDS,
  TAG_RANGE,
} from "./constants.js";
import { generateMaze, nearestFloorCenter, randomFloor } from "./maze.js";
import { makeRng } from "./rng.js";
import { championOf, leadingIds, rankMatch } from "./score.js";

const ZERO = { x: 0, y: 0, action: false, secondary: false };

export function createMatch(opts = {}) {
  const seed = opts.seed ?? 1;
  const slots = (opts.slots ?? defaultSlots()).slice(0, PLAYER_COUNT);
  while (slots.length < PLAYER_COUNT) slots.push({ kind: "bot" });
  const match = {
    seed,
    rng: makeRng(seed),
    roundCount: Math.max(1, opts.roundCount ?? 3),
    roundIndex: 0,
    slots: slots.map((s) => ({ kind: normalizeKind(s.kind) })),
    active: slots.map((s) => normalizeKind(s.kind) !== "off"),
    roundWins: [0, 0, 0, 0],
    bankedAll: [0, 0, 0, 0],
    banishedAll: [0, 0, 0, 0],
    phase: "playing",
    winners: [],
    bannerTimer: 0,
    ranking: null,
    champion: null,
    round: null,
  };
  match.round = createRound(match);
  return match;
}

function defaultSlots() {
  return [{ kind: "human" }, { kind: "bot" }, { kind: "bot" }, { kind: "bot" }];
}

function normalizeKind(kind) {
  if (kind === "human" || kind === "bot" || kind === "off") return kind;
  return "off";
}

export function createRound(match) {
  const maze = generateMaze(MAZE_W, MAZE_H, match.rng);
  const players = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const home = cryptCenter(maze.w, maze.h, i);
    const cx = maze.w / 2;
    const cy = maze.h / 2;
    const fx = cx - home.x;
    const fy = cy - home.y;
    const m = Math.hypot(fx, fy) || 1;
    players.push({
      active: !!match.active[i],
      x: home.x,
      y: home.y,
      facingX: fx / m,
      facingY: fy / m,
      carried: 0,
      banked: 0,
      invuln: 0.6,
      banished: 0,
      eliminations: 0,
      dash: 0,
      dashCd: 0,
      haste: 0,
      phase: 0,
      magnet: 0,
      shield: false,
      heldPower: null,
      prevAction: false,
      prevSecondary: false,
      aiDash: false,
      aiLatch: false,
    });
  }
  const round = {
    maze,
    players,
    orbs: [],
    powerups: [],
    respawns: [],
    time: ROUND_SECONDS,
    shiftTimer: SHIFT_SECONDS,
    powerTimer: POWER_SPAWN_EVERY,
    lastCeil: Math.ceil(ROUND_SECONDS),
    tick: 0,
    orbSerial: 1,
    accounted: false,
  };
  const avoid = players.filter((p) => p.active).map((p) => ({ x: p.x, y: p.y, r: 2 }));
  for (let i = 0; i < ORB_TARGET; i++) {
    const spot = randomFloor(maze, match.rng, avoid);
    round.orbs.push(makeOrb(round, spot.x, spot.y));
    avoid.push({ x: spot.x, y: spot.y, r: 1.4 });
  }
  return round;
}

function makeOrb(round, x, y, ignorePlayer = -1, ignoreTime = 0) {
  return { id: round.orbSerial++, x, y, ignorePlayer, ignoreTime };
}

/**
 * Advance the match by dt seconds.
 * `controls` is length 4: { x, y, action, secondary } in -1..1 / booleans.
 * Bot seats ignore the provided controls. Returns a list of gameplay events.
 */
export function step(match, controls = [], dt = 1 / 60) {
  const events = [];
  if (match.phase === "roundEnd") {
    match.bannerTimer -= dt;
    if (match.bannerTimer <= 0) advanceRound(match, events);
    return events;
  }
  if (match.phase === "matchEnd") return events;

  const round = match.round;
  round.tick += 1;
  round._reserved = new Set();

  const acts = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (!match.active[i]) {
      acts.push({ ...ZERO });
      continue;
    }
    if (match.slots[i].kind === "bot") acts.push(botControls(round, i));
    else acts.push(sanitize(controls[i]));
  }

  for (let i = 0; i < PLAYER_COUNT; i++) {
    updatePlayer(match, i, acts[i], dt, events);
  }
  magnets(round, dt);
  collectOrbs(round, dt, events);
  resolveTags(round, events);
  bankOrbs(round, events);
  collectPowerups(round, events);
  worldTimers(match, dt, events);
  return events;
}

function sanitize(c) {
  if (!c) return { ...ZERO };
  const x = Number(c.x);
  const y = Number(c.y);
  return {
    x: Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0,
    y: Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0,
    action: !!c.action,
    secondary: !!c.secondary,
  };
}

function updatePlayer(match, index, act, dt, events) {
  const p = match.round.players[index];
  if (!p.active) return;

  const wasBanished = p.banished > 0;
  p.banished = Math.max(0, p.banished - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.dash = Math.max(0, p.dash - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.haste = Math.max(0, p.haste - dt);
  p.phase = Math.max(0, p.phase - dt);
  p.magnet = Math.max(0, p.magnet - dt);
  if (wasBanished && p.banished === 0) {
    const home = cryptCenter(match.round.maze.w, match.round.maze.h, index);
    p.x = home.x;
    p.y = home.y;
    p.invuln = INVULN_SECONDS;
  }

  const edgeA = act.action && !p.prevAction;
  const edgeB = act.secondary && !p.prevSecondary;
  p.prevAction = act.action;
  p.prevSecondary = act.secondary;

  if (p.banished > 0) return;

  if (edgeB) useSecondary(match, p, events);
  if (edgeA && p.dashCd <= 0) {
    p.dash = DASH_TIME;
    p.dashCd = DASH_COOLDOWN;
    events.push({ type: "dash", player: index });
  }

  let mx = act.x;
  let my = act.y;
  const mag = Math.hypot(mx, my);
  let dirX = 0;
  let dirY = 0;
  let scale = 0;
  if (mag > 1e-6) {
    dirX = mx / mag;
    dirY = my / mag;
    scale = Math.min(1, mag);
  }
  const speed =
    PLAYER_SPEED * (p.haste > 0 ? HASTE_MULT : 1) * (p.dash > 0 ? DASH_MULT : 1) * scale;
  if (scale > 0.05) {
    p.facingX = dirX;
    p.facingY = dirY;
  }
  const moved = moveCircle(
    match.round.maze,
    p.x,
    p.y,
    dirX * speed * dt,
    dirY * speed * dt,
    PLAYER_RADIUS,
    p.phase > 0,
  );
  p.x = moved.x;
  p.y = moved.y;
}

function useSecondary(match, p, events) {
  if (p.heldPower) {
    const type = p.heldPower;
    p.heldPower = null;
    if (type === "haste") p.haste = HASTE_TIME;
    else if (type === "phase") p.phase = PHASE_TIME;
    else if (type === "shield") p.shield = true;
    else if (type === "magnet") p.magnet = MAGNET_TIME;
    events.push({ type: "power", power: type });
    return;
  }
  if (p.carried <= 0) return;
  p.carried -= 1;
  const round = match.round;
  const dropX = p.x + p.facingX * 0.75;
  const dropY = p.y + p.facingY * 0.75;
  let spot = { x: dropX, y: dropY };
  const tx = Math.floor(dropX);
  const ty = Math.floor(dropY);
  if (tx < 0 || ty < 0 || tx >= round.maze.w || ty >= round.maze.h || round.maze.tiles[ty * round.maze.w + tx] === 1) {
    spot = { x: p.x, y: p.y };
  }
  const idPlayer = round.players.indexOf(p);
  round.orbs.push(makeOrb(round, spot.x, spot.y, idPlayer, 0.55));
  events.push({ type: "drop", player: idPlayer });
}

function magnets(round, dt) {
  for (const p of round.players) {
    if (!p.active || p.banished > 0 || p.magnet <= 0) continue;
    for (const orb of round.orbs) {
      const dx = p.x - orb.x;
      const dy = p.y - orb.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.05 || d > MAGNET_RADIUS) continue;
      const pull = MAGNET_PULL * dt * (1 - d / MAGNET_RADIUS);
      orb.x += (dx / d) * pull;
      orb.y += (dy / d) * pull;
    }
  }
}

function collectOrbs(round, dt, events) {
  const keep = [];
  for (const orb of round.orbs) {
    if (orb.ignoreTime > 0) orb.ignoreTime = Math.max(0, orb.ignoreTime - dt);
    let taken = false;
    for (let i = 0; i < round.players.length; i++) {
      const p = round.players[i];
      if (!p.active || p.banished > 0 || p.carried >= MAX_CARRY) continue;
      if (orb.ignorePlayer === i && orb.ignoreTime > 0) continue;
      if (Math.hypot(p.x - orb.x, p.y - orb.y) > PICKUP_RADIUS) continue;
      p.carried += 1;
      round.respawns.push(ORB_RESPAWN);
      events.push({ type: "pickup", player: i });
      taken = true;
      break;
    }
    if (!taken) keep.push(orb);
  }
  round.orbs = keep;
}

function resolveTags(round, events) {
  const players = round.players;
  const snap = players.map((p) => ({
    carried: p.carried,
    shield: p.shield,
    active: p.active,
    banished: p.banished,
    invuln: p.invuln,
    x: p.x,
    y: p.y,
    facingX: p.facingX,
    facingY: p.facingY,
  }));
  const victims = new Map();
  for (let i = 0; i < snap.length; i++) {
    const a = snap[i];
    if (!a.active || a.banished > 0) continue;
    for (let j = 0; j < snap.length; j++) {
      if (i === j) continue;
      const v = snap[j];
      if (!v.active || v.banished > 0 || v.invuln > 0) continue;
      const dx = v.x - a.x;
      const dy = v.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > TAG_RANGE) continue;
      if (d > 0.001) {
        const dot = a.facingX * dx + a.facingY * dy;
        if (dot <= 0.05) continue;
      }
      if (!victims.has(j)) victims.set(j, []);
      victims.get(j).push(i);
    }
  }

  const delta = [0, 0, 0, 0];
  const dropped = [];
  for (const [j, atts] of victims) {
    atts.sort((a, b) => a - b);
    const attIndex = atts[0];
    const v = players[j];
    if (snap[j].shield) {
      v.shield = false;
      v.invuln = INVULN_SECONDS;
      events.push({ type: "block", att: attIndex, vic: j });
      continue;
    }
    if (snap[j].carried > 0) {
      delta[j] -= 1;
      delta[attIndex] += 1;
      v.invuln = INVULN_SECONDS;
      events.push({ type: "tag", att: attIndex, vic: j });
    } else {
      banish(round, j);
      events.push({ type: "banish", att: attIndex, vic: j });
    }
  }
  for (let i = 0; i < players.length; i++) {
    if (!delta[i]) continue;
    let next = snap[i].carried + delta[i];
    while (next > MAX_CARRY) {
      dropped.push(i);
      next -= 1;
    }
    players[i].carried = Math.max(0, next);
  }
  for (const i of dropped) {
    const p = players[i];
    round.orbs.push(makeOrb(round, p.x, p.y));
  }
}

function banish(round, index) {
  const p = round.players[index];
  const home = cryptCenter(round.maze.w, round.maze.h, index);
  p.x = home.x;
  p.y = home.y;
  p.banished = BANISH_SECONDS;
  p.eliminations += 1;
  p.dash = 0;
  p.shield = false;
}

function bankOrbs(round, events) {
  const crypts = cryptsFor(round.maze.w, round.maze.h);
  for (let i = 0; i < round.players.length; i++) {
    const p = round.players[i];
    if (!p.active || p.banished > 0 || p.carried <= 0) continue;
    const c = crypts[i];
    if (Math.floor(p.x) !== c.tx || Math.floor(p.y) !== c.ty) continue;
    const amount = p.carried;
    p.banked += amount;
    p.carried = 0;
    events.push({ type: "bank", player: i, amount });
  }
}

function collectPowerups(round, events) {
  const keep = [];
  for (const item of round.powerups) {
    let taken = false;
    for (let i = 0; i < round.players.length; i++) {
      const p = round.players[i];
      if (!p.active || p.banished > 0 || p.heldPower) continue;
      if (Math.hypot(p.x - item.x, p.y - item.y) > PICKUP_RADIUS) continue;
      p.heldPower = item.type;
      events.push({ type: "relic", player: i, power: item.type });
      taken = true;
      break;
    }
    if (!taken) keep.push(item);
  }
  round.powerups = keep;
}

function worldTimers(match, dt, events) {
  const round = match.round;
  const prevWhole = round.lastCeil;
  round.time -= dt;
  if (round.time <= 0) {
    round.time = 0;
    round.lastCeil = 0;
    endRound(match, events);
    return;
  }
  const whole = Math.ceil(round.time);
  if (whole !== prevWhole && whole >= 1 && whole <= 3) {
    events.push({ type: "countdown", value: whole });
  }
  round.lastCeil = whole;

  round.shiftTimer -= dt;
  if (round.shiftTimer <= 0) {
    shiftMaze(match, events);
    round.shiftTimer += SHIFT_SECONDS;
    if (round.shiftTimer < 0) round.shiftTimer = SHIFT_SECONDS;
  }

  round.powerTimer -= dt;
  if (round.powerTimer <= 0) {
    round.powerTimer += POWER_SPAWN_EVERY;
    if (round.powerups.length === 0) spawnPower(match);
  }

  for (let i = 0; i < round.respawns.length; i++) round.respawns[i] -= dt;
  const still = [];
  for (const t of round.respawns) {
    if (t <= 0) spawnOrb(match);
    else still.push(t);
  }
  round.respawns = still;
  while (round.orbs.length + round.respawns.length < ORB_TARGET) {
    round.respawns.push(0.35);
  }
}

function spawnOrb(match) {
  const round = match.round;
  const avoid = round.players.filter((p) => p.active).map((p) => ({ x: p.x, y: p.y, r: 1.6 }));
  for (const orb of round.orbs) avoid.push({ x: orb.x, y: orb.y, r: 1.2 });
  const spot = randomFloor(round.maze, match.rng, avoid);
  round.orbs.push(makeOrb(round, spot.x, spot.y));
}

function spawnPower(match) {
  const round = match.round;
  const type = POWER_TYPES[match.rng.int(POWER_TYPES.length)];
  const avoid = round.players.filter((p) => p.active).map((p) => ({ x: p.x, y: p.y, r: 2 }));
  const spot = randomFloor(round.maze, match.rng, avoid);
  round.powerups.push({ type, x: spot.x, y: spot.y });
}

function shiftMaze(match, events) {
  const round = match.round;
  const maze = generateMaze(MAZE_W, MAZE_H, match.rng);
  round.maze = maze;
  for (const p of round.players) {
    if (isBlocked(maze, p.x, p.y)) {
      const n = nearestFloorCenter(maze, p.x, p.y);
      p.x = n.x;
      p.y = n.y;
    } else if (circleHitsWall(maze, p.x, p.y, PLAYER_RADIUS)) {
      p.x = Math.floor(p.x) + 0.5;
      p.y = Math.floor(p.y) + 0.5;
    }
  }
  for (const orb of round.orbs) {
    if (isBlocked(maze, orb.x, orb.y)) {
      const n = nearestFloorCenter(maze, orb.x, orb.y);
      orb.x = n.x;
      orb.y = n.y;
    }
  }
  for (const item of round.powerups) {
    if (isBlocked(maze, item.x, item.y)) {
      const n = nearestFloorCenter(maze, item.x, item.y);
      item.x = n.x;
      item.y = n.y;
    }
  }
  events.push({ type: "shift" });
}

function isBlocked(maze, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= maze.w || ty >= maze.h) return true;
  return maze.tiles[ty * maze.w + tx] === 1;
}

function endRound(match, events) {
  const round = match.round;
  if (!round.accounted) {
    for (let i = 0; i < PLAYER_COUNT; i++) {
      match.bankedAll[i] += round.players[i].banked;
      match.banishedAll[i] += round.players[i].eliminations;
    }
    round.accounted = true;
  }
  const banked = round.players.map((p) => p.banked);
  match.winners = leadingIds(banked, match.active);
  for (const w of match.winners) match.roundWins[w] += 1;
  match.phase = "roundEnd";
  match.bannerTimer = 3.2;
  events.push({ type: "round", winners: match.winners.slice() });
}

function advanceRound(match, events) {
  match.roundIndex += 1;
  if (match.roundIndex >= match.roundCount) {
    match.phase = "matchEnd";
    match.ranking = rankMatch(match);
    match.champion = championOf(match);
    events.push({ type: "match", champion: match.champion, ranking: match.ranking.slice() });
    return;
  }
  match.phase = "playing";
  match.winners = [];
  match.round = createRound(match);
  events.push({ type: "roundStart", index: match.roundIndex });
}

export function fingerprint(match) {
  const r = match.round;
  const q = (n) => Math.round(n * 1000) / 1000;
  return JSON.stringify({
    phase: match.phase,
    roundIndex: match.roundIndex,
    roundWins: match.roundWins,
    bankedAll: match.bankedAll,
    banishedAll: match.banishedAll,
    winners: match.winners,
    champion: match.champion,
    time: r ? q(r.time) : null,
    shift: r ? q(r.shiftTimer) : null,
    tiles: r ? r.maze.tiles.join("") : "",
    players: r
      ? r.players.map((p) => ({
          x: q(p.x),
          y: q(p.y),
          c: p.carried,
          b: p.banked,
          inv: q(p.invuln),
          ban: q(p.banished),
          el: p.eliminations,
          sh: p.shield,
          h: p.heldPower,
          fx: q(p.facingX),
          fy: q(p.facingY),
        }))
      : [],
    orbs: r ? r.orbs.map((o) => [q(o.x), q(o.y)]) : [],
    powers: r ? r.powerups.map((p) => [p.type, q(p.x), q(p.y)]) : [],
  });
}
