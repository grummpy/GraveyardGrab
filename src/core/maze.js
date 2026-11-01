import { cryptsFor } from "./constants.js";

/** Odd-sized tile maze. 1 = tombstone wall, 0 = floor. Fully connected. */
export function generateMaze(w, h, rng) {
  if (w % 2 === 0 || h % 2 === 0) {
    throw new Error("maze width and height must be odd");
  }
  const tiles = new Array(w * h).fill(1);
  const roomsX = (w - 1) >> 1;
  const roomsY = (h - 1) >> 1;
  const seen = new Uint8Array(roomsX * roomsY);
  const stack = [[0, 0]];
  seen[0] = 1;
  openRoom(tiles, w, 0, 0);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (stack.length) {
    const [rx, ry] = stack[stack.length - 1];
    const options = [];
    for (const [dx, dy] of dirs) {
      const nx = rx + dx;
      const ny = ry + dy;
      if (nx < 0 || ny < 0 || nx >= roomsX || ny >= roomsY) continue;
      if (seen[ny * roomsX + nx]) continue;
      options.push([nx, ny, dx, dy]);
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny, dx, dy] = options[rng.int(options.length)];
    seen[ny * roomsX + nx] = 1;
    openRoom(tiles, w, nx, ny);
    const tx = 1 + rx * 2 + dx;
    const ty = 1 + ry * 2 + dy;
    tiles[ty * w + tx] = 0;
    stack.push([nx, ny]);
  }

  // Knock a few extra doorways so the yard is not a single snake.
  // Connectivity is preserved because we only remove walls.
  for (let ry = 0; ry < roomsY; ry++) {
    for (let rx = 0; rx < roomsX; rx++) {
      if (rx + 1 < roomsX && rng.next() < 0.2) {
        const tx = 1 + rx * 2 + 1;
        const ty = 1 + ry * 2;
        tiles[ty * w + tx] = 0;
      }
      if (ry + 1 < roomsY && rng.next() < 0.2) {
        const tx = 1 + rx * 2;
        const ty = 1 + ry * 2 + 1;
        tiles[ty * w + tx] = 0;
      }
    }
  }

  // Crypt corners are rooms already; force them open anyway.
  for (const c of cryptsFor(w, h)) tiles[c.ty * w + c.tx] = 0;

  return { w, h, tiles };
}

function openRoom(tiles, w, rx, ry) {
  const tx = 1 + rx * 2;
  const ty = 1 + ry * 2;
  tiles[ty * w + tx] = 0;
}

export function isWall(maze, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= maze.w || ty >= maze.h) return true;
  return maze.tiles[ty * maze.w + tx] === 1;
}

/** Every floor tile is reachable from every other floor tile (4-connected). */
export function isFullyConnected(maze) {
  let start = -1;
  let floors = 0;
  for (let i = 0; i < maze.tiles.length; i++) {
    if (maze.tiles[i] === 0) {
      floors++;
      if (start < 0) start = i;
    }
  }
  if (floors === 0) return false;
  const seen = new Uint8Array(maze.tiles.length);
  const q = [start];
  seen[start] = 1;
  let head = 0;
  let reached = 0;
  while (head < q.length) {
    const i = q[head++];
    reached++;
    const x = i % maze.w;
    const y = (i / maze.w) | 0;
    const steps = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of steps) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= maze.w || ny >= maze.h) continue;
      const ni = ny * maze.w + nx;
      if (seen[ni] || maze.tiles[ni] !== 0) continue;
      seen[ni] = 1;
      q.push(ni);
    }
  }
  return reached === floors;
}

/** First grid step from (x, y) toward (goalX, goalY). Deterministic, no RNG. */
export function nextDir(maze, x, y, goalX, goalY) {
  const sx = clampTile(Math.floor(x), maze.w);
  const sy = clampTile(Math.floor(y), maze.h);
  const gx = clampTile(Math.floor(goalX), maze.w);
  const gy = clampTile(Math.floor(goalY), maze.h);
  if (isWall(maze, sx, sy)) return { x: 0, y: 0 };
  if (sx === gx && sy === gy) {
    const dx = goalX - x;
    const dy = goalY - y;
    const m = Math.hypot(dx, dy);
    if (m < 0.08) return { x: 0, y: 0 };
    if (Math.abs(dx) > Math.abs(dy)) return { x: Math.sign(dx), y: 0 };
    return { x: 0, y: Math.sign(dy) };
  }
  if (isWall(maze, gx, gy)) return { x: 0, y: 0 };

  const w = maze.w;
  const total = w * maze.h;
  const prev = new Int32Array(total);
  prev.fill(-1);
  const q = [sy * w + sx];
  prev[sy * w + sx] = -2;
  let head = 0;
  let found = false;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (head < q.length) {
    const cur = q[head++];
    const cx = cur % w;
    const cy = (cur / w) | 0;
    if (cx === gx && cy === gy) {
      found = true;
      break;
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= maze.h) continue;
      const ni = ny * w + nx;
      if (prev[ni] !== -1 || maze.tiles[ni] === 1) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (!found) return { x: 0, y: 0 };

  let cur = gy * w + gx;
  const start = sy * w + sx;
  while (prev[cur] !== start && prev[cur] !== -2) cur = prev[cur];
  const nx = cur % w;
  const ny = (cur / w) | 0;
  const dx = nx + 0.5 - x;
  const dy = ny + 0.5 - y;
  if (Math.abs(dx) > Math.abs(dy)) return { x: Math.sign(dx), y: 0 };
  return { x: 0, y: Math.sign(dy) };
}

export function nearestFloorCenter(maze, x, y) {
  const sx = clampTile(Math.floor(x), maze.w);
  const sy = clampTile(Math.floor(y), maze.h);
  if (!isWall(maze, sx, sy)) {
    return { x, y };
  }
  const w = maze.w;
  const seen = new Uint8Array(w * maze.h);
  const q = [sy * w + sx];
  seen[sy * w + sx] = 1;
  let head = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (head < q.length) {
    const cur = q[head++];
    const cx = cur % w;
    const cy = (cur / w) | 0;
    if (maze.tiles[cur] === 0) return { x: cx + 0.5, y: cy + 0.5 };
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= maze.h) continue;
      const ni = ny * w + nx;
      if (seen[ni]) continue;
      seen[ni] = 1;
      q.push(ni);
    }
  }
  return { x: 1.5, y: 1.5 };
}

function clampTile(v, size) {
  if (v < 0) return 0;
  if (v >= size) return size - 1;
  return v;
}

export function randomFloor(maze, rng, avoid) {
  const floors = [];
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (maze.tiles[y * maze.w + x] === 0) floors.push({ x, y });
    }
  }
  if (floors.length === 0) return { x: 1.5, y: 1.5 };
  for (let n = 0; n < 24; n++) {
    const f = floors[rng.int(floors.length)];
    const cx = f.x + 0.5;
    const cy = f.y + 0.5;
    let blocked = false;
    for (const a of avoid) {
      if (Math.hypot(a.x - cx, a.y - cy) < (a.r ?? 1.1)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return { x: cx, y: cy };
  }
  const f = floors[rng.int(floors.length)];
  return { x: f.x + 0.5, y: f.y + 0.5 };
}
