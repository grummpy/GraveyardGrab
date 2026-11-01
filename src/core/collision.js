import { isWall } from "./maze.js";

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Circle vs solid tiles. Walls occupy the closed tile square. */
export function circleHitsWall(maze, x, y, r) {
  const minX = Math.floor(x - r);
  const maxX = Math.floor(x + r);
  const minY = Math.floor(y - r);
  const maxY = Math.floor(y + r);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (!isWall(maze, tx, ty)) continue;
      const nx = clamp(x, tx, tx + 1);
      const ny = clamp(y, ty, ty + 1);
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < r * r - 1e-8) return true;
    }
  }
  return false;
}

/**
 * Move a circle by (dx, dy). Axes are resolved separately so corners slide.
 * Phase walks through tombstones but stays inside the map.
 */
export function moveCircle(maze, x, y, dx, dy, r, phase) {
  if (phase) {
    return {
      x: clamp(x + dx, r, maze.w - r),
      y: clamp(y + dy, r, maze.h - r),
    };
  }
  if (dx !== 0) x = slide(maze, x, y, dx, 0, r);
  if (dy !== 0) y = slide(maze, x, y, 0, dy, r);
  return { x, y };
}

function slide(maze, x, y, dx, dy, r) {
  const horizontal = dx !== 0;
  const nx = x + dx;
  const ny = y + dy;
  if (!circleHitsWall(maze, nx, ny, r)) return horizontal ? nx : ny;
  const steps = 6;
  let best = horizontal ? x : y;
  for (let i = 1; i <= steps; i++) {
    const sx = x + (dx * i) / steps;
    const sy = y + (dy * i) / steps;
    if (circleHitsWall(maze, sx, sy, r)) break;
    best = horizontal ? sx : sy;
  }
  return best;
}
